// ============================================
// AreaIQ by Hart — Main application entry
//
// Orchestrates the page: handles user input,
// calls feature modules, and renders results.
// More feature modules will be wired in here
// as we build them.
// ============================================

import { geocodeAddress } from './geocode.js';


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
    const location = await geocodeAddress(address);
    showLocationResults(location);
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
  // Build a definition list of all the location data
  // dt = "term" (label), dd = "description" (value)
  resultsSection.innerHTML = `
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

    <p class="placeholder" style="margin-top: var(--space-md);">
      ✅ Foundation working. Demographics, schools, and other features will appear here as they're built.
    </p>
  `;
}


// ---------- Security helper ----------
// Always escape user-supplied or API-supplied
// strings before injecting into innerHTML.
// Prevents accidental HTML/JS injection.

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}