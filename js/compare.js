// ============================================
// AreaIQ by Hart — Comparison page
//
// Allows users to compare 2-3 Indiana neighborhoods
// side-by-side using a focused subset of decision-
// driving stats: demographics, schools, taxes,
// development trends.
//
// Supports URL parameter passing so comparisons
// can be shared: compare.html?a=...&b=...&c=...
// ============================================

import { geocodeAddress } from './geocode.js';
import { fetchDemographics } from './demographics.js';
import { fetchSchoolInfo } from './schools.js';
import { fetchTaxInfo } from './tax.js';
import { fetchDevelopmentTrends } from './development.js';


// DOM references
const addressInputs = [
  document.getElementById('compare-address-1'),
  document.getElementById('compare-address-2'),
  document.getElementById('compare-address-3')
];
const compareButton = document.getElementById('compare-search-button');
const addButton = document.getElementById('compare-add-button');
const removeButton = document.getElementById('compare-remove-3');
const row3 = document.getElementById('compare-row-3');
const resultsSection = document.getElementById('compare-results-section');
const shareSection = document.getElementById('compare-share-section');
const shareInput = document.getElementById('compare-share-url');
const shareButton = document.getElementById('compare-share-button');


// ---------- Page initialization ----------

// On load: check URL parameters and prefill if present
function init() {
  const params = new URLSearchParams(window.location.search);
  const a = params.get('a');
  const b = params.get('b');
  const c = params.get('c');

  if (a) addressInputs[0].value = decodeURIComponent(a);
  if (b) addressInputs[1].value = decodeURIComponent(b);
  if (c) {
    addressInputs[2].value = decodeURIComponent(c);
    showThirdRow();
  }

  // If we have at least 2 prefilled addresses, auto-run the comparison
  if (a && b) {
    handleCompare();
  }

  // Wire up event handlers
  compareButton.addEventListener('click', handleCompare);
  addButton.addEventListener('click', showThirdRow);
  removeButton.addEventListener('click', hideThirdRow);
  shareButton.addEventListener('click', copyShareUrl);

  // Enter key in any input triggers comparison
  addressInputs.forEach(input => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        handleCompare();
      }
    });
  });
}


// ---------- Third-row toggle ----------

function showThirdRow() {
  row3.style.display = 'flex';
  addButton.style.display = 'none';
}

function hideThirdRow() {
  row3.style.display = 'none';
  addButton.style.display = 'inline-block';
  addressInputs[2].value = '';
}


// ---------- Main comparison handler ----------

async function handleCompare() {
  // Collect addresses from visible inputs
  const addresses = [];
  for (let i = 0; i < addressInputs.length; i++) {
    const input = addressInputs[i];
    // Only include if row is visible AND has a value
    const rowVisible = i < 2 || row3.style.display !== 'none';
    const value = input.value.trim();
    if (rowVisible && value) {
      addresses.push(value);
    }
  }

  if (addresses.length < 2) {
    showError('Please enter at least 2 addresses to compare.');
    return;
  }

  showLoading('Fetching data for ' + addresses.length + ' areas...');

  try {
    // Fetch profiles for all addresses in parallel
    const profiles = await Promise.all(
      addresses.map(addr => buildAreaProfile(addr))
    );

    // Render the comparison table
    renderComparison(profiles);

    // Update URL with the search params so the comparison is shareable
    updateShareableUrl(addresses);
  } catch (err) {
    showError(err.message);
  }
}


// ---------- Build an area profile (geocode + demographics + schools + tax + dev) ----------

async function buildAreaProfile(addressString) {
  // Geocode first — everything else depends on the location data
  const location = await geocodeAddress(addressString);

  // Fetch the data sources in parallel
  const [demographics, schoolInfo, devTrends] = await Promise.all([
    location.censusTract ? fetchDemographics(location).catch(() => null) : Promise.resolve(null),
    fetchSchoolInfo(location).catch(() => null),
    location.countyFips ? fetchDevelopmentTrends(location).catch(() => null) : Promise.resolve(null)
  ]);

  // Tax needs demographics, so it has to come after
  const taxInfo = await fetchTaxInfo(location, demographics).catch(() => null);

  return {
    location: location,
    demographics: demographics,
    schoolInfo: schoolInfo,
    taxInfo: taxInfo,
    devTrends: devTrends
  };
}


// ---------- Render the comparison table ----------

function renderComparison(profiles) {
  if (profiles.length < 2) {
    showError('Could not load enough area data to compare.');
    return;
  }

  // Build header row with column labels (city names)
  const headerCols = profiles.map(p => `
    <th class="compare-col-header">
      <div class="compare-col-city">${escapeHtml(p.location.city || 'Unknown city')}</div>
      <div class="compare-col-address">${escapeHtml(shortAddress(p.location))}</div>
    </th>
  `).join('');

  // Build the rows — each row is one stat across all areas
  const rows = [
    statRow('Population', profiles, p => p.demographics?.population, formatNumber),
    statRow('Median household income', profiles, p => p.demographics?.medianIncome, formatCurrency, 'higher'),
    statRow('Median home value', profiles, p => p.demographics?.medianHomeValue, formatCurrency, 'higher'),
    statRow('Median age', profiles, p => p.demographics?.medianAge, v => `${v} years`),
    statRow('Bachelor\'s degree or higher', profiles, p => p.demographics?.bachelorsOrHigherPercent, v => `${v}%`, 'higher'),
    statRow('Owner-occupied homes', profiles, p => p.demographics?.ownerOccupiedPercent, v => `${v}%`, 'higher'),
    statRow('Area median property tax', profiles, p => p.demographics?.medianPropertyTax, v => `${formatCurrency(v)}/yr`, 'lower'),
    statRow('School district', profiles, p => p.schoolInfo?.districtName, escapeHtml),
    statRow('County', profiles, p => p.location.countyName, escapeHtml),
    statRow('Development trend', profiles, p => p.devTrends?.interpretationLabel, escapeHtml),
    statRow('Housing growth (5yr)', profiles, p => p.devTrends?.totalChangePercent, v => `${v >= 0 ? '+' : ''}${v}%`, 'higher')
  ].join('');

  resultsSection.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th class="compare-row-label-header">Comparison</th>
          ${headerCols}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p class="school-disclaimer">
      Data shown is at the Census tract (demographics), county (development), or state (tax rate) level.
      Individual property characteristics may vary significantly from area averages.
      Sources: U.S. Census Bureau ACS, NCES, Tax Foundation.
    </p>
  `;

  // Show the share section now that we have valid results
  shareSection.style.display = 'block';
}


// Build a single row in the comparison table.
// betterDirection: 'higher' or 'lower' to highlight the best value, or omit
function statRow(label, profiles, accessor, formatter, betterDirection) {
  // Get the raw values for each profile
  const values = profiles.map(accessor);

  // Determine which profile (if any) has the "best" value for highlighting
  let bestIndex = -1;
  if (betterDirection) {
    const numericValues = values.map(v => typeof v === 'number' ? v : null);
    const hasNumeric = numericValues.some(v => v !== null);

    if (hasNumeric) {
      if (betterDirection === 'higher') {
        bestIndex = numericValues.indexOf(Math.max(...numericValues.filter(v => v !== null)));
      } else if (betterDirection === 'lower') {
        bestIndex = numericValues.indexOf(Math.min(...numericValues.filter(v => v !== null)));
      }
    }
  }

  // Build the cells
  const cells = values.map((v, i) => {
    const formatted = v == null ? 'n/a' : (formatter ? formatter(v) : v);
    const isBest = i === bestIndex && bestIndex >= 0;
    const cellClass = isBest ? 'compare-cell compare-cell-best' : 'compare-cell';
    const checkmark = isBest ? '<span class="compare-checkmark" aria-label="Better value">✓</span> ' : '';
    return `<td class="${cellClass}">${checkmark}${formatted}</td>`;
  }).join('');

  return `
    <tr>
      <th class="compare-row-label">${escapeHtml(label)}</th>
      ${cells}
    </tr>
  `;
}


// ---------- URL parameter handling ----------

function updateShareableUrl(addresses) {
  const params = new URLSearchParams();
  if (addresses[0]) params.set('a', addresses[0]);
  if (addresses[1]) params.set('b', addresses[1]);
  if (addresses[2]) params.set('c', addresses[2]);

  const url = window.location.pathname + '?' + params.toString();
  const fullUrl = window.location.origin + url;

  // Update the browser URL without reloading
  window.history.replaceState({}, '', url);

  // Populate the share input
  shareInput.value = fullUrl;
}


async function copyShareUrl() {
  try {
    await navigator.clipboard.writeText(shareInput.value);
    shareButton.textContent = '✓ Copied!';
    setTimeout(() => {
      shareButton.textContent = 'Copy';
    }, 2000);
  } catch (err) {
    // Fallback for older browsers
    shareInput.select();
    document.execCommand('copy');
    shareButton.textContent = '✓ Copied!';
    setTimeout(() => {
      shareButton.textContent = 'Copy';
    }, 2000);
  }
}


// ---------- Display helpers ----------

function showLoading(message) {
  resultsSection.innerHTML = `
    <div class="message message-loading venue-loading">
      <div class="venue-spinner"></div>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
  shareSection.style.display = 'none';
}

function showError(message) {
  resultsSection.innerHTML = `<div class="message message-error">${escapeHtml(message)}</div>`;
  shareSection.style.display = 'none';
}

function shortAddress(location) {
  // Strip "United States" and return a short readable version
  const addr = (location.address || '').replace(/, United States$/, '');
  const parts = addr.split(',');
  // Take first 3 parts max: e.g., "100, North Capitol Avenue, Indianapolis"
  return parts.slice(0, 3).join(',').trim();
}


// ---------- Number formatters ----------

function formatNumber(value) {
  if (value == null) return 'n/a';
  return value.toLocaleString('en-US');
}

function formatCurrency(value) {
  if (value == null) return 'n/a';
  return '$' + value.toLocaleString('en-US');
}


// ---------- HTML escaping ----------

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


// Initialize the page
init();