// ============================================
// AreaIQ by Hart — Geocoding module
//
// Converts a user-entered address into a
// structured LocationContext object using
// OpenStreetMap's Nominatim geocoder.
// Free, CORS-friendly, no key required.
//
// In a future session, we'll add the FCC Census
// Block API to enrich results with Census tract
// and county FIPS codes (needed for demographics
// and tax estimates).
//
// Attribution: data © OpenStreetMap contributors
// ============================================

import { API_ENDPOINTS, CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// Map of full state name → 2-letter abbreviation.
// Nominatim returns state names, but we use codes
// internally (and need them for the service-area check).
const STATE_NAME_TO_CODE = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
};


// Public function: takes a raw address string,
// returns a normalized LocationContext or
// throws an error if geocoding fails.
export async function geocodeAddress(rawAddress) {
  const address = rawAddress.trim();
  if (!address) {
    throw new Error('Please enter an address to search.');
  }

  // Check cache first
  const cacheKey = `geo:${address.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Build the Nominatim request URL
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',     // include parsed address components
    countrycodes: 'us',       // restrict to United States
    limit: '1'                // we only want the best match
  });

  const url = `${API_ENDPOINTS.geocoder}?${params.toString()}`;

  // Make the API call
  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error('Network error — please check your connection and try again.');
  }

  if (!response.ok) {
    throw new Error(`Geocoder returned status ${response.status}. Please try again later.`);
  }

  const results = await response.json();

  if (!results || results.length === 0) {
    throw new Error('No match found. Please check the address and try again.');
  }

  const match = results[0];
  const addr = match.address || {};

  // Convert state name to 2-letter code
  const stateName = addr.state || '';
  const stateCode = STATE_NAME_TO_CODE[stateName] || stateName;

  // Pull city — Nominatim sometimes returns it as 'city',
  // sometimes 'town', sometimes 'village', sometimes 'hamlet'
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || '';

  // Build the LocationContext object
  // (censusTract and countyFips will be filled in by a later
  // FCC Census Block API call when we add demographics)
  const location = {
    address: match.display_name,
    lat: parseFloat(match.lat),
    lng: parseFloat(match.lon),
    state: stateCode,
    stateName: stateName,
    city: city,
    zip: addr.postcode || '',
    countyName: (addr.county || '').replace(/ County$/, ''),
    countyFips: null,        // to be added in next session
    censusTract: null         // to be added in next session
  };

  // Cache and return
  cacheSet(cacheKey, location, CACHE_TTL.geocode);
  return location;
}