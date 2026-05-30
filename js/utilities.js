// ============================================
// AreaIQ by Hart — Utilities module
//
// Builds links to authoritative utility lookup
// resources for a given address. We link out
// rather than displaying utility data directly
// for two reasons:
//
// 1. Utility service boundaries are messy and
//    inconsistent across data sources. Linking
//    to authoritative resources is more honest
//    than displaying potentially-wrong data.
//
// 2. The most-asked utility (internet) has live
//    address-level data at broadbandmap.fcc.gov
//    that we couldn't replicate ourselves.
//
// Resources used:
//  - FCC National Broadband Map (internet)
//  - Indiana Utility Regulatory Commission (electric, gas)
//  - EPA SDWIS (water)
//  - Google search (municipality services for trash)
// ============================================


// Public function: takes a LocationContext, returns
// an object with link URLs and city info for display.
// Indiana-focused for v1 but degrades gracefully for
// out-of-state addresses.
export function buildUtilityLinks(location) {
  const inServiceArea = location.state === 'IN';

  return {
    inServiceArea: inServiceArea,
    city: location.city || '',
    state: location.state || '',

    // Internet — FCC Broadband Map supports address pre-fill
    fccBroadbandUrl: buildFccUrl(location),

    // Electric & Gas — IURC for Indiana, otherwise state utility commission
    iurcUrl: 'https://www.in.gov/iurc/regulated-utilities/electric/',
    iurcGasUrl: 'https://www.in.gov/iurc/regulated-utilities/natural-gas/',

    // Water — EPA Safe Drinking Water Information System
    epaWaterUrl: buildEpaWaterUrl(location),

    // City services — Google search for the user's specific city
    citySearchUrl: buildCitySearchUrl(location, 'water sewer trash services'),
    cityTrashSearchUrl: buildCitySearchUrl(location, 'trash recycling pickup schedule')
  };
}


// ---------- Helper functions ----------

// FCC Broadband Map supports an address query parameter.
// Their URL structure: https://broadbandmap.fcc.gov/location-summary/fixed?addr=...
function buildFccUrl(location) {
  // Build a clean address string. Strip "United States" suffix
  // since Nominatim adds it but the FCC map doesn't want it.
  const addressParts = [
    location.address ? location.address.replace(/, United States$/, '') : ''
  ].filter(Boolean);

  const cleanAddress = addressParts.join(', ');

  if (!cleanAddress) {
    // Fallback to base URL if we somehow don't have an address
    return 'https://broadbandmap.fcc.gov/home';
  }

  const params = new URLSearchParams({
    addr: cleanAddress,
    type: 'address'
  });

  return `https://broadbandmap.fcc.gov/location-summary/fixed?${params.toString()}`;
}


// EPA SDWIS search by ZIP code (or city if no ZIP).
// EPA's Envirofacts SDWIS search supports query parameters.
function buildEpaWaterUrl(location) {
  // EPA's search URL allows us to pre-fill the ZIP code field
  if (location.zip) {
    return `https://www.epa.gov/enviro/sdwis-search?zip=${encodeURIComponent(location.zip)}`;
  }
  // Fallback to the search landing page
  return 'https://www.epa.gov/enviro/sdwis-search';
}


// Build a Google search URL for the user's city + a topic
function buildCitySearchUrl(location, topic) {
  const city = location.city || '';
  const state = location.stateName || location.state || 'Indiana';

  // If we don't have a city, search by ZIP instead
  const where = city ? `${city}, ${state}` : (location.zip || `Indiana ${location.address || ''}`);

  const query = encodeURIComponent(`${where} ${topic}`);
  return `https://www.google.com/search?q=${query}`;
}