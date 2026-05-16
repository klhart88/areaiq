// ============================================
// AreaIQ by Hart — Main application entry
//
// Orchestrates the page: handles user input,
// calls feature modules, and renders results.
// ============================================

import { geocodeAddress }         from './geocode.js';
import { fetchDemographics }      from './demographics.js';
import { renderMap }              from './map.js';
import { fetchCommuteEstimate }   from './commute.js';
import { fetchSchoolInfo }        from './schools.js';
import { fetchTaxInfo }           from './tax.js';
import { getCategoryList,
         fetchVenues }            from './venues.js';
import { fetchDevelopmentTrends } from './development.js';
import { appendLeadCaptureForm }  from './leadcapture.js';

// ---------- DOM elements ----------

const addressInput  = document.getElementById('address-input');
const searchButton  = document.getElementById('search-button');
const resultsSection = document.getElementById('results-section');

// Remember the most recent searched location so the commute
// form has an origin to calculate from.
let currentLocation = null;

// ---------- Event listeners ----------

searchButton.addEventListener('click', handleSearch);

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

    currentLocation = location;
    showLocationResults(location);

    // Variables populated as data fetches complete
    // (available to the lead capture form)
    let demographics = null;
    let schoolInfo   = null;
    let taxInfo      = null;
    let devTrends    = null;

    // Step 2: Demographics
    if (location.censusTract) {
      try {
        demographics = await fetchDemographics(location);
        appendDemographicsResults(demographics);
      } catch (demoErr) {
        appendErrorBlock('Demographics unavailable: ' + demoErr.message);
      }
    } else {
      appendErrorBlock('Demographics unavailable: address could not be matched to a Census tract.');
    }

    // Step 3: School district info
    try {
      schoolInfo = await fetchSchoolInfo(location);
      appendSchoolResults(schoolInfo);
    } catch (schoolErr) {
      appendErrorBlock('School information unavailable: ' + schoolErr.message);
    }

    // Step 4: Property tax info
    try {
      taxInfo = await fetchTaxInfo(location, demographics);
      appendTaxResults(taxInfo);
    } catch (taxErr) {
      appendErrorBlock('Property tax info unavailable: ' + taxErr.message);
    }

    // Step 5: Nearby venues (lazy-load on category click)
    appendVenuesSection();

    // Step 6: Development trends
    if (location.countyFips) {
      try {
        devTrends = await fetchDevelopmentTrends(location);
        appendDevelopmentResults(devTrends);   // fixed: was "development" (undefined)
      } catch (devErr) {
        appendErrorBlock('Development trends unavailable: ' + devErr.message);
      }
    }

    // Step 7: Lead capture form (always render)
    appendLeadCaptureForm(resultsSection, {
      location:    location,
      demographics: demographics,
      schoolInfo:  schoolInfo,
      taxInfo:     taxInfo,
      devTrends:   devTrends,
      sourcePage:  'Main results page'
    });

  } catch (err) {
    showError(err.message);
  }
}

// ---------- Display helpers ----------

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

  renderMap('address-map', location);
  appendCommuteForm();
}

function appendErrorBlock(message) {
  const block = document.createElement('div');
  block.className = 'message message-error';
  block.style.marginTop = 'var(--space-md)';
  block.textContent = message;
  resultsSection.appendChild(block);
}

// ---------- Demographics ----------

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

// ---------- Commute ----------

function appendCommuteForm() {
  const block = document.createElement('section');
  block.className = 'feature-block';
  block.innerHTML = `
    <h2>Commute Estimate</h2>
    <p class="feature-description">
      See how long the drive would take during rush hour vs. off-peak.
      Enter a work address, school, or other regular destination.
    </p>
    <div class="commute-form">
      <input
        type="text"
        id="commute-destination"
        class="commute-input"
        placeholder="123 Office Park Blvd, Indianapolis, IN"
        autocomplete="off"
      >
      <button id="commute-button" type="button" class="commute-button">Calculate</button>
    </div>
    <div id="commute-result"></div>
  `;
  resultsSection.appendChild(block);

  const commuteButton = document.getElementById('commute-button');
  const commuteInput  = document.getElementById('commute-destination');

  commuteButton.addEventListener('click', handleCommuteSearch);
  commuteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleCommuteSearch();
  });
}

async function handleCommuteSearch() {
  const destinationInput = document.getElementById('commute-destination');
  const commuteResult    = document.getElementById('commute-result');
  const destination      = destinationInput.value.trim();

  if (!destination) {
    commuteResult.innerHTML = `<div class="message message-error">Please enter a destination.</div>`;
    return;
  }

  if (!currentLocation) {
    commuteResult.innerHTML = `<div class="message message-error">Please search a property address first.</div>`;
    return;
  }

  commuteResult.innerHTML = `<div class="message message-loading">Calculating drive times…</div>`;

  try {
    const commute = await fetchCommuteEstimate(currentLocation, destination);
    showCommuteResults(commute);
  } catch (err) {
    commuteResult.innerHTML = `<div class="message message-error">${escapeHtml(err.message)}</div>`;
  }
}

function showCommuteResults(commute) {
  const commuteResult = document.getElementById('commute-result');
  const peakMin    = commute.peak.durationMinutes;
  const offPeakMin = commute.offPeak.durationMinutes;
  const delta      = peakMin - offPeakMin;
  const distance   = commute.peak.distanceMiles;

  let deltaText = '';
  if (delta > 0) {
    deltaText = `<span class="commute-delta">+${delta} min during rush hour</span>`;
  } else if (delta < 0) {
    deltaText = `<span class="commute-delta">${delta} min during rush hour</span>`;
  }

  commuteResult.innerHTML = `
    <div class="commute-summary">
      <div class="commute-row">
        <span class="commute-label">Off-peak (1 PM weekday)</span>
        <span class="commute-time">${offPeakMin} min</span>
      </div>
      <div class="commute-row">
        <span class="commute-label">Peak (8 AM weekday)</span>
        <span class="commute-time">${peakMin} min</span>
      </div>
      <div class="commute-row commute-delta-row">
        ${deltaText}
      </div>
      <div class="commute-distance">${distance} miles</div>
    </div>
    <p class="data-source">Source: Mapbox Directions API · Drive times approximate</p>
  `;
}

// ---------- Schools ----------

function appendSchoolResults(schoolInfo) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  if (!schoolInfo.inServiceArea) {
    block.innerHTML = `
      <h2>School District</h2>
      <p class="placeholder">${escapeHtml(schoolInfo.message)}</p>
    `;
    resultsSection.appendChild(block);
    return;
  }

  if (schoolInfo.error) {
    block.innerHTML = `
      <h2>School District</h2>
      <div class="message message-error">${escapeHtml(schoolInfo.error)}</div>
    `;
    resultsSection.appendChild(block);
    return;
  }

  block.innerHTML = `
    <h2>School District</h2>
    <dl class="result-grid">
      <dt>Assigned district</dt>
      <dd>${escapeHtml(schoolInfo.districtName)}</dd>

      <dt>District ID</dt>
      <dd>${escapeHtml(schoolInfo.districtId)}</dd>
    </dl>

    <div class="school-links">
      <p class="school-links-label">Continue your research:</p>
      <a class="school-link-button" href="${schoolInfo.greatSchoolsUrl}" target="_blank" rel="noopener noreferrer">
        📊 Test scores on GreatSchools ↗
      </a>
      <a class="school-link-button" href="${schoolInfo.districtSearchUrl}" target="_blank" rel="noopener noreferrer">
        🏫 District website (calendars, enrollment, contact) ↗
      </a>
    </div>

    <p class="school-disclaimer">
      School test score reporting formats vary by district and state; linking to the
      district's site for best viewing experience. Return to this window to complete
      other elements of your research.
    </p>

    <p class="data-source">Source: NCES EDGE School District Boundaries (2025)</p>
  `;
  resultsSection.appendChild(block);
}

// ---------- Property Tax ----------

function appendTaxResults(taxInfo) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  if (!taxInfo.inServiceArea) {
    block.innerHTML = `
      <h2>Property Tax Estimate</h2>
      <p class="placeholder">${escapeHtml(taxInfo.message)}</p>
    `;
    resultsSection.appendChild(block);
    return;
  }

  if (taxInfo.error) {
    block.innerHTML = `
      <h2>Property Tax Estimate</h2>
      <div class="message message-error">${escapeHtml(taxInfo.error)}</div>
    `;
    resultsSection.appendChild(block);
    return;
  }

  const areaMedianRow = taxInfo.areaMedianTax
    ? `<dt>Area median tax</dt><dd>${formatCurrency(taxInfo.areaMedianTax)}/year</dd>`
    : '';

  const userInputSection = `
    <div class="tax-calculator">
      <p class="tax-calculator-label">
        Get a more specific estimate by entering a target home value:
      </p>
      <div class="tax-calculator-form">
        <div class="tax-input-wrapper">
          <span class="tax-input-prefix">$</span>
          <input
            type="number"
            id="tax-home-value"
            class="tax-input"
            placeholder="350,000"
            min="0"
            step="1000"
          >
        </div>
        <button id="tax-calculate-button" type="button" class="tax-button">Calculate</button>
      </div>
      <div id="tax-calculation-result"></div>
    </div>
  `;

  block.innerHTML = `
    <h2>Property Tax Estimate</h2>
    <dl class="result-grid">
      <dt>State</dt>
      <dd>${escapeHtml(taxInfo.state)}</dd>

      <dt>Effective tax rate</dt>
      <dd>${escapeHtml(taxInfo.effectiveRatePercent)} <span class="tax-source-inline">(as of ${escapeHtml(taxInfo.rateAsOf)})</span></dd>

      ${areaMedianRow}

      <dt>Billing schedule</dt>
      <dd>${escapeHtml(taxInfo.billingDescription)}</dd>
    </dl>

    ${userInputSection}

    <p class="school-disclaimer">
      ${escapeHtml(taxInfo.homesteadDeduction)}
    </p>

    <p class="data-source">
      Source: ${escapeHtml(taxInfo.rateSource)} · ${escapeHtml(taxInfo.verificationSource)}
    </p>
  `;
  resultsSection.appendChild(block);

  // Wire up the calculator
  const calcButton = document.getElementById('tax-calculate-button');
  const valueInput = document.getElementById('tax-home-value');
  const resultDiv  = document.getElementById('tax-calculation-result');

  function calculate() {
    const valueText = valueInput.value.trim();
    const value     = parseInt(valueText, 10);

    if (!valueText || isNaN(value) || value <= 0) {
      resultDiv.innerHTML = `
        <div class="message message-error">
          Please enter a valid home value greater than zero.
        </div>
      `;
      return;
    }

    const annual     = Math.round(value * taxInfo.effectiveRate);
    const monthly    = Math.round(annual / 12);
    const semiAnnual = Math.round(annual / 2);

    resultDiv.innerHTML = `
      <div class="tax-calculation">
        <div class="tax-calc-headline">
          Estimated annual tax: <strong>${formatCurrency(annual)}</strong>
        </div>
        <div class="tax-calc-detail">
          ≈ ${formatCurrency(semiAnnual)} per installment (May and November)
          · ${formatCurrency(monthly)}/month if escrowed
        </div>
        <div class="tax-calc-formula">
          ${formatCurrency(value)} × ${taxInfo.effectiveRatePercent} = ${formatCurrency(annual)}
        </div>
      </div>
    `;
  }

  calcButton.addEventListener('click', calculate);
  valueInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') calculate();
  });
}

// ---------- Nearby Venues ----------

function appendVenuesSection() {
  const block = document.createElement('section');
  block.className = 'feature-block';

  const categories = getCategoryList();

  const tabButtons = categories.map((cat, idx) => `
    <button
      class="venue-tab ${idx === 0 ? 'venue-tab-active' : ''}"
      data-category="${cat.key}">
      ${cat.emoji} ${cat.label}
    </button>
  `).join('');

  block.innerHTML = `
    <h2>Nearby Places</h2>
    <p class="feature-description">
      The closest 5 venues in each category. Tap any category to load.
    </p>

    <div class="venue-tabs">
      ${tabButtons}
    </div>

    <div id="venue-results" class="venue-results">
      <p class="placeholder">Choose a category above to see nearby places.</p>
    </div>

    <p class="data-source">
      Data © OpenStreetMap contributors. Coverage varies; results may not include every venue.
    </p>
  `;
  resultsSection.appendChild(block);

  const tabs = block.querySelectorAll('.venue-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('venue-tab-active'));
      tab.classList.add('venue-tab-active');
      loadVenuesForCategory(tab.dataset.category);
    });
  });

  // Auto-load first category
  loadVenuesForCategory(categories[0].key);
}

async function loadVenuesForCategory(categoryKey) {
  const resultsDiv = document.getElementById('venue-results');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = `
    <div class="message message-loading venue-loading">
      <div class="venue-spinner"></div>
      <div>Searching nearby venues…</div>
    </div>
  `;

  try {
    const venues = await fetchVenues(currentLocation, categoryKey);

    if (venues.length === 0) {
      resultsDiv.innerHTML = `
        <p class="placeholder">
          No venues in this category found nearby. OpenStreetMap coverage varies —
          some businesses may not yet be in the database.
        </p>
      `;
      return;
    }

    resultsDiv.innerHTML = venues.map(v => `
      <div class="venue-card">
        <div class="venue-name">${escapeHtml(v.name)}</div>
        <div class="venue-meta">
          ${v.distanceMiles} mi
          ${v.address ? ` · ${escapeHtml(v.address)}` : ''}
          ${v.phone ? ` · <a href="tel:${escapeHtml(v.phone)}">${escapeHtml(v.phone)}</a>` : ''}
        </div>
        <a class="venue-link"
           href="${escapeHtml(v.linkUrl)}"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHtml(v.linkLabel)}
        </a>
      </div>
    `).join('');

  } catch (err) {
    resultsDiv.innerHTML = `
      <div class="message message-error">
        Could not load venues: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

// ---------- Development Trends ----------

function appendDevelopmentResults(dev) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  const maxUnits = Math.max(...dev.yearlyData.map(d => d.housingUnits));

  const barRows = dev.yearlyData.map(d => {
    const widthPercent = (d.housingUnits / maxUnits) * 100;
    return `
      <div class="dev-bar-row">
        <div class="dev-bar-year">${d.year}</div>
        <div class="dev-bar-track">
          <div class="dev-bar-fill" style="width: ${widthPercent}%"></div>
        </div>
        <div class="dev-bar-value">${formatNumber(d.housingUnits)}</div>
      </div>
    `;
  }).join('');

  const interpretationClass = `dev-interp-${dev.interpretation}`;
  const changeSign        = dev.totalChange >= 0 ? '+' : '';
  const changePercentSign = dev.totalChangePercent >= 0 ? '+' : '';

  block.innerHTML = `
    <h2>Future Development Trends</h2>
    <p class="feature-description">
      Housing growth in <strong>${escapeHtml(dev.countyName)} County</strong>
      over the last ${dev.yearsSpanned} years.
    </p>

    <div class="dev-summary ${interpretationClass}">
      <div class="dev-summary-label">${escapeHtml(dev.interpretationLabel)}</div>
      <div class="dev-summary-stats">
        <span class="dev-stat-big">${changePercentSign}${dev.totalChangePercent}%</span>
        <span class="dev-stat-context">
          ${changeSign}${formatNumber(dev.totalChange)} housing units
          (${dev.earliest.year}–${dev.latest.year})
        </span>
      </div>
    </div>

    <div class="dev-chart">
      ${barRows}
    </div>

    <dl class="result-grid">
      <dt>Average annual growth</dt>
      <dd>${changePercentSign}${dev.annualGrowthRate}% per year</dd>

      <dt>Most recent year</dt>
      <dd>${dev.latest.year} — ${formatNumber(dev.latest.housingUnits)} housing units</dd>
    </dl>

    <p class="school-disclaimer">
      Housing unit counts come from Census ACS 5-year estimates, which smooth across
      a rolling 5-year window. Year-over-year changes reflect actual growth at the
      county level. Individual neighborhoods within a county may differ significantly
      from the county-wide trend.
    </p>

    <p class="data-source">
      Source: U.S. Census Bureau, American Community Survey 5-Year Estimates (table B25001)
    </p>
  `;
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

// ---------- Security helper ----------
// Always escape user-supplied or API-supplied strings
// before injecting into innerHTML.

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}
