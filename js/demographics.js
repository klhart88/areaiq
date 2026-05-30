// ============================================
// AreaIQ by Hart — Demographics module
//
// Fetches neighborhood demographics from the
// U.S. Census Bureau's American Community
// Survey (ACS) 5-Year Estimates API.
//
// Data is reported at the Census tract level
// (~4,000 people per tract) for granular
// neighborhood-level statistics.
// ============================================

import { API_ENDPOINTS, CENSUS_API_KEY, CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// Census ACS variables we want to fetch.
// Each code maps to a specific statistic.
// Documentation: https://api.census.gov/data/2023/acs/acs5/variables.html
const ACS_VARIABLES = {
  'B01003_001E': 'totalPopulation',
  'B19013_001E': 'medianHouseholdIncome',
  'B01002_001E': 'medianAge',
  'B25077_001E': 'medianHomeValue',
  'B25064_001E': 'medianGrossRent',
  'B15003_022E': 'bachelorsCount',
  'B15003_023E': 'mastersCount',
  'B15003_024E': 'professionalCount',
  'B15003_025E': 'doctorateCount',
  'B15003_001E': 'educationTotalPop',
  'B25003_001E': 'totalHouseholds',
  'B25003_002E': 'ownerOccupied',
  'B25003_003E': 'renterOccupied',
  'B25103_001E': 'medianPropertyTax'
};


// Public function: fetches demographics for a given
// LocationContext. Returns a structured demographics
// object, or throws an error.
export async function fetchDemographics(location) {
  if (!location.censusTract || !location.stateFips || !location.countyFips) {
    throw new Error('Demographics require Census tract data — please try a different address.');
  }

  // Check cache
  const cacheKey = `demo:${location.censusTract}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // The Census ACS API expects the tract ID broken into parts:
  // state FIPS (2 digits) + county FIPS (3 digits) + tract code (6 digits)
  const stateFips = location.stateFips;
  const countyOnlyFips = location.countyFips.substring(2);  // last 3 digits
  const tractOnly = location.censusTract.substring(5);      // last 6 digits

  // Build the variable list
  const varCodes = Object.keys(ACS_VARIABLES).join(',');

  // Build the request URL
  const params = new URLSearchParams({
    get: varCodes,
    for: `tract:${tractOnly}`,
    in: `state:${stateFips} county:${countyOnlyFips}`,
    key: CENSUS_API_KEY
  });

  const url = `${API_ENDPOINTS.censusACS}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error('Network error fetching demographics. Please try again.');
  }

  if (!response.ok) {
    throw new Error(`Census ACS returned status ${response.status}.`);
  }

  // ACS returns data as a 2D array:
  // [
  //   ["B01003_001E", "B19013_001E", ..., "state", "county", "tract"],  ← header row
  //   ["3247", "78500", ..., "18", "057", "110900"]                        ← data row
  // ]
  const data = await response.json();
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Demographics data unavailable for this area.');
  }

  const headers = data[0];
  const values = data[1];

  // Build a flat object mapping variable name → raw value
  const raw = {};
  headers.forEach((header, i) => {
    if (ACS_VARIABLES[header]) {
      raw[ACS_VARIABLES[header]] = parseNumeric(values[i]);
    }
  });

  // Compute derived stats and structure the result
  const result = {
  population: raw.totalPopulation,
  medianAge: raw.medianAge,
  medianIncome: raw.medianHouseholdIncome,
  medianHomeValue: raw.medianHomeValue,
  medianRent: raw.medianGrossRent,
  bachelorsOrHigherPercent: computeEducationPercent(raw),
  ownerOccupiedPercent: computeOwnershipPercent(raw),
  medianPropertyTax: raw.medianPropertyTax
};

  // Cache and return
  cacheSet(cacheKey, result, CACHE_TTL.demographics);
  return result;
}


// ---------- Helper functions ----------

// Census uses negative numbers as null sentinels (e.g., -666666666
// means "data unavailable"). Convert these to null so we don't
// accidentally display nonsense.
function parseNumeric(val) {
  if (val == null || val === '') return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  if (num < 0) return null;
  return num;
}


// Calculate % of population 25+ with a bachelor's degree or higher
function computeEducationPercent(raw) {
  if (!raw.educationTotalPop || raw.educationTotalPop === 0) return null;

  const educated = (raw.bachelorsCount || 0)
                 + (raw.mastersCount || 0)
                 + (raw.professionalCount || 0)
                 + (raw.doctorateCount || 0);

  return Math.round((educated / raw.educationTotalPop) * 100);
}


// Calculate % of occupied housing units that are owner-occupied
function computeOwnershipPercent(raw) {
  if (!raw.totalHouseholds || raw.totalHouseholds === 0) return null;
  return Math.round((raw.ownerOccupied / raw.totalHouseholds) * 100);
}