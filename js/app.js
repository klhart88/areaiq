// ============================================
// AreaIQ by Hart — Main application entry
//
// Orchestrates the page: handles user input,
// calls feature modules, and renders results.
// More feature modules will be wired in here
// as we build them.
// ============================================

import { geocodeAddress } from './geocode.js';
import { fetchDemographics } from './demographics.js';
import { renderMap } from './map.js';
// ---------- DOM elements ----------
// We grab references to the elements we'll
// interact with so we don't repeatedly query.

const addressInput = document.getElementById('address-input');
const searchButton = document.getElementById('search-button');
const resultsSection = document.getElementById('results-section');


// ---------- Event listeners ----------

// Run when user clicks Search
searchButton.addEventListener('click', handleSearch);

// Also run when user presses Enter in the input field
// (most users expect this; it's a small UX detail that matters)
addressInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    handleSearch();
  }
});


// ---------- Main search handler ----------

async function handleSearch() {
  const address = addressInput.value.trim();
  if (!address) {
    showError('Please enter an address.');
    return;
  }

  showLoading('Looking up address…');

  try {
    // Step 1: Geocode the address
    const location = await geocodeAddress(address);

    // Render the address results immediately so the user sees progress
    showLocationResults(location);

    // Step 2: Fetch demographics in the background
    // (the address card is already showing while this loads)
    if (location.censusTract) {
      try {
        const demographics = await fetchDemographics(location);
        appendDemographicsResults(demographics);
      } catch (demoErr) {
        appendErrorBlock('Demographics unavailable: ' + demoErr.message);
      }
    } else {
      appendErrorBlock('Demographics unavailable: address could not be matched to a Census tract.');
    }
  } catch (err) {
    showError(err.message);
  }
}


// ---------- Display helpers ----------
// These functions build HTML and inject it
// into the results section.

function showLoading(message) {
  resultsSection.innerHTML = `
    <div class="message message-loading">${escapeHtml(message)}</div>
  `;
}

function showError(message) {
  resultsSection.innerHTML = `
    <div class="message message-error">${escapeHtml(message)}</div>
  `;
}

function showLocationResults(location) {
  resultsSection.innerHTML = `
    <div id="address-map" class="map-container"></div>

    <h2>Address Found</h2>
    <dl class="result-grid">
      <dt>Matched address</dt>
      <dd>${escapeHtml(location.address)}</dd>

      <dt>City, State</dt>
      <dd>${escapeHtml(location.city)}, ${escapeHtml(location.state)} ${escapeHtml(location.zip)}</dd>

      <dt>County</dt>
      <dd>${escapeHtml(location.countyName || 'Unknown')} (FIPS ${escapeHtml(location.countyFips || 'n/a')})</dd>

      <dt>Census tract</dt>
      <dd>${escapeHtml(location.censusTract || 'n/a')}</dd>

      <dt>Coordinates</dt>
      <dd>${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</dd>
    </dl>
  `;

  // Render the map into the empty div we just created
  renderMap('address-map', location);
}


// ---------- Security helper ----------
// Always escape user-supplied or API-supplied
// strings before injecting into innerHTML.
// Prevents accidental HTML/JS injection.
function appendDemographicsResults(demographics) {
  const block = document.createElement('section');
  block.className = 'feature-block';
  block.innerHTML = `
    <h2>Neighborhood Demographics</h2>
    <dl class="result-grid">
      <dt>Population</dt>
      <dd>${formatNumber(demographics.population)}</dd>

      <dt>Median age</dt>
      <dd>${formatNumber(demographics.medianAge, ' years')}</dd>

      <dt>Median household income</dt>
      <dd>${formatCurrency(demographics.medianIncome)}</dd>

      <dt>Median home value</dt>
      <dd>${formatCurrency(demographics.medianHomeValue)}</dd>

      <dt>Median gross rent</dt>
      <dd>${formatCurrency(demographics.medianRent, '/mo')}</dd>

      <dt>Bachelor's degree or higher</dt>
      <dd>${formatPercent(demographics.bachelorsOrHigherPercent)} of adults 25+</dd>

      <dt>Owner-occupied homes</dt>
      <dd>${formatPercent(demographics.ownerOccupiedPercent)}</dd>
    </dl>
    <p class="data-source">Source: U.S. Census Bureau, ACS 5-Year Estimates</p>
  `;
  resultsSection.appendChild(block);
}

function appendErrorBlock(message) {
  const block = document.createElement('div');
  block.className = 'message message-error';
  block.style.marginTop = 'var(--space-md)';
  block.textContent = message;
  resultsSection.appendChild(block);
}

// ---------- Number formatters ----------

function formatNumber(value, suffix = '') {
  if (value == null) return 'n/a';
  return value.toLocaleString('en-US') + suffix;
}

function formatCurrency(value, suffix = '') {
  if (value == null) return 'n/a';
  return '$' + value.toLocaleString('en-US') + suffix;
}

function formatPercent(value) {
  if (value == null) return 'n/a';
  return value + '%';
}
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}