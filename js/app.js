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
import { fetchCommuteEstimate } from './commute.js';
import { fetchSchoolInfo } from './schools.js';
import { fetchTaxInfo } from './tax.js';
import { buildUtilityLinks } from './utilities.js';
// ---------- DOM elements ----------
// We grab references to the elements we'll
// interact with so we don't repeatedly query.

const addressInput = document.getElementById('address-input');
const searchButton = document.getElementById('search-button');
const resultsSection = document.getElementById('results-section');

// Remember the most recent searched location so the commute
// form has an origin to calculate from
let currentLocation = null;
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
    currentLocation = location;
    showLocationResults(location);

    // Step 2: Fetch demographics (and remember for tax estimate)
    let demographics = null;
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

    // Step 3: Fetch school district info
    try {
      const schoolInfo = await fetchSchoolInfo(location);
      appendSchoolResults(schoolInfo);
    } catch (schoolErr) {
      appendErrorBlock('School information unavailable: ' + schoolErr.message);
    }

    // Step 4: Fetch property tax info
    try {
      const taxInfo = await fetchTaxInfo(location, demographics);
      appendTaxResults(taxInfo);
    } catch (taxErr) {
      appendErrorBlock('Property tax info unavailable: ' + taxErr.message);
    }

    // Step 5: Build utility resource links
    try {
      const utilityLinks = buildUtilityLinks(location);
      appendUtilityResults(utilityLinks);
    } catch (utilErr) {
      appendErrorBlock('Utility links unavailable: ' + utilErr.message);
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

  // Append the commute form
  appendCommuteForm();
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

  // Wire up the button and Enter key
  const commuteButton = document.getElementById('commute-button');
  const commuteInput = document.getElementById('commute-destination');

  commuteButton.addEventListener('click', handleCommuteSearch);
  commuteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleCommuteSearch();
    }
  });
}

async function handleCommuteSearch() {
  const destinationInput = document.getElementById('commute-destination');
  const commuteResult = document.getElementById('commute-result');
  const destination = destinationInput.value.trim();

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
  const peakMin = commute.peak.durationMinutes;
  const offPeakMin = commute.offPeak.durationMinutes;
  const delta = peakMin - offPeakMin;
  const distance = commute.peak.distanceMiles;

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
function appendSchoolResults(schoolInfo) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  // Out-of-state user
  if (!schoolInfo.inServiceArea) {
    block.innerHTML = `
      <h2>School District</h2>
      <p class="placeholder">${escapeHtml(schoolInfo.message)}</p>
    `;
    resultsSection.appendChild(block);
    return;
  }

  // In-state but lookup failed
  if (schoolInfo.error) {
    block.innerHTML = `
      <h2>School District</h2>
      <div class="message message-error">${escapeHtml(schoolInfo.error)}</div>
    `;
    resultsSection.appendChild(block);
    return;
  }

  // Successful district lookup
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
    School test score reporting formats vary by district and state; linking to the district's site for best viewing experience. Return to this window to complete other elements of your research.
  </p>

  <p class="data-source">Source: NCES EDGE School District Boundaries (2025)</p>
`;
  resultsSection.appendChild(block);
}
function appendTaxResults(taxInfo) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  // Out-of-state user
  if (!taxInfo.inServiceArea) {
    block.innerHTML = `
      <h2>Property Tax Estimate</h2>
      <p class="placeholder">${escapeHtml(taxInfo.message)}</p>
    `;
    resultsSection.appendChild(block);
    return;
  }

  // In-state but lookup failed
  if (taxInfo.error) {
    block.innerHTML = `
      <h2>Property Tax Estimate</h2>
      <div class="message message-error">${escapeHtml(taxInfo.error)}</div>
    `;
    resultsSection.appendChild(block);
    return;
  }

  // Build the area median row (if we have it)
  const areaMedianRow = taxInfo.areaMedianTax
    ? `
      <dt>Area median tax</dt>
      <dd>${formatCurrency(taxInfo.areaMedianTax)}/year</dd>
    `
    : '';

  // Build the user-input section
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

  // Wire up the calculator button after the HTML is in the DOM
  const calcButton = document.getElementById('tax-calculate-button');
  const valueInput = document.getElementById('tax-home-value');
  const resultDiv = document.getElementById('tax-calculation-result');

  function calculate() {
    const valueText = valueInput.value.trim();
    const value = parseInt(valueText, 10);

    if (!valueText || isNaN(value) || value <= 0) {
      resultDiv.innerHTML = `
        <div class="message message-error">
          Please enter a valid home value greater than zero.
        </div>
      `;
      return;
    }

    const annual = Math.round(value * taxInfo.effectiveRate);
    const monthly = Math.round(annual / 12);
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
    if (event.key === 'Enter') {
      calculate();
    }
  });
}
function appendUtilityResults(util) {
  const block = document.createElement('section');
  block.className = 'feature-block';

  // Out-of-state user gets simpler messaging
  if (!util.inServiceArea) {
    block.innerHTML = `
      <h2>Utilities &amp; Services</h2>
      <p class="placeholder">
        For utilities outside Indiana, search "${escapeHtml(util.city || 'this area')}
        utilities and services" online, or check the property's MLS listing for
        seller-disclosed providers.
      </p>
    `;
    resultsSection.appendChild(block);
    return;
  }

  // For Indiana — full utility resource card
  const cityLabel = util.city ? escapeHtml(util.city) : 'your city';

  block.innerHTML = `
    <h2>Utilities &amp; Services</h2>
    <p class="feature-description">
      Utility providers can vary even within a single neighborhood. The links below
      take you to authoritative sources for the most current information.
    </p>

    <div class="utility-group">
      <h3 class="utility-heading">🌐 Internet</h3>
      <p class="utility-description">
        Find broadband providers, speeds, and technologies serving this specific address.
      </p>
      <a class="utility-link-button" href="${util.fccBroadbandUrl}" target="_blank" rel="noopener noreferrer">
        FCC Broadband Map ↗
      </a>
    </div>

    <div class="utility-group">
      <h3 class="utility-heading">⚡ Electric &amp; ⛽ Natural Gas</h3>
      <p class="utility-description">
        The Indiana Utility Regulatory Commission (IURC) regulates electric and natural gas
        utilities and lists service providers by area.
      </p>
      <a class="utility-link-button" href="${util.iurcUrl}" target="_blank" rel="noopener noreferrer">
        IURC Electric Utilities ↗
      </a>
      <a class="utility-link-button" href="${util.iurcGasUrl}" target="_blank" rel="noopener noreferrer">
        IURC Gas Utilities ↗
      </a>
    </div>

    <div class="utility-group">
      <h3 class="utility-heading">💧 Water</h3>
      <p class="utility-description">
        The EPA's Safe Drinking Water Information System lists registered public
        water systems by location.
      </p>
      <a class="utility-link-button" href="${util.epaWaterUrl}" target="_blank" rel="noopener noreferrer">
        EPA SDWIS Search ↗
      </a>
    </div>

    <div class="utility-group">
      <h3 class="utility-heading">🏛️ Sewer, Trash &amp; Recycling</h3>
      <p class="utility-description">
        These services are typically provided or contracted by your city. For
        ${cityLabel}, search local government services for the most current info.
      </p>
      <a class="utility-link-button" href="${util.citySearchUrl}" target="_blank" rel="noopener noreferrer">
        ${cityLabel} water/sewer/trash ↗
      </a>
      <a class="utility-link-button" href="${util.cityTrashSearchUrl}" target="_blank" rel="noopener noreferrer">
        Trash pickup schedule ↗
      </a>
    </div>

    <p class="school-disclaimer">
      Utility providers may differ even between neighboring properties due to annexation history,
      municipal boundaries, or grandfathered service agreements. Always confirm with seller
      disclosures and the property's MLS listing before closing.
    </p>

    <p class="data-source">
      Sources: FCC National Broadband Map · Indiana Utility Regulatory Commission · EPA SDWIS
    </p>
  `;
  resultsSection.appendChild(block);
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
