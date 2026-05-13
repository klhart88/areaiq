// ============================================
// AreaIQ by Hart — Development trends module
//
// Tracks county-level housing growth over time
// using ACS 5-year estimates. Shows the change
// in total housing units as a proxy for
// development activity.
//
// Note: We use actual housing units (B25001)
// rather than building permits, because permit
// data isn't reliably available at county-level
// via API. Housing unit counts represent the
// most rigorous "this area actually grew" signal.
// ============================================

import { CENSUS_API_KEY, CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// Years of ACS data to fetch. Most recent ACS 5-year
// is typically published in December for data ending
// the previous year. As of May 2026, ACS data through
// 2023 (5-year ending 2023) is reliably available.
//
// We start with these 5 years and the code degrades
// gracefully if any single year fails.
const ACS_YEARS = [2019, 2020, 2021, 2022, 2023];


// Public function: returns development trend data
// for the county containing the given location.
export async function fetchDevelopmentTrends(location) {
  if (!location.countyFips || !location.stateFips) {
    throw new Error('Development data requires county FIPS code.');
  }

  // Check cache
  const cacheKey = `dev:${location.countyFips}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const countyOnlyFips = location.countyFips.substring(2);
  const stateFips = location.stateFips;

  // Fetch all years in parallel — much faster than serial
  const yearlyResults = await Promise.all(
    ACS_YEARS.map(year => fetchYearData(year, stateFips, countyOnlyFips))
  );

  // Drop any failed years and sort ascending
  const validData = yearlyResults
    .filter(d => d !== null)
    .sort((a, b) => a.year - b.year);

  if (validData.length < 2) {
    throw new Error('Not enough historical data to show development trends.');
  }

  // Compute key metrics
  const earliest = validData[0];
  const latest = validData[validData.length - 1];
  const totalChange = latest.housingUnits - earliest.housingUnits;
  const totalChangePercent = round1((totalChange / earliest.housingUnits) * 100);
  const yearsSpanned = latest.year - earliest.year;

  // Annual growth rate (simple average over the span)
  const annualGrowthRate = round1(totalChangePercent / yearsSpanned);

  // Interpretation tier — kept honest, not promotional
  let interpretation;
  let interpretationLabel;
  if (totalChangePercent >= 5) {
    interpretation = 'high_growth';
    interpretationLabel = 'High growth area';
  } else if (totalChangePercent >= 2) {
    interpretation = 'moderate_growth';
    interpretationLabel = 'Moderate growth';
  } else if (totalChangePercent >= 0) {
    interpretation = 'stable';
    interpretationLabel = 'Stable housing stock';
  } else {
    interpretation = 'declining';
    interpretationLabel = 'Declining housing stock';
  }

  const result = {
    countyName: location.countyName || 'this county',
    yearlyData: validData,
    earliest: earliest,
    latest: latest,
    totalChange: totalChange,
    totalChangePercent: totalChangePercent,
    annualGrowthRate: annualGrowthRate,
    yearsSpanned: yearsSpanned,
    interpretation: interpretation,
    interpretationLabel: interpretationLabel
  };

  cacheSet(cacheKey, result, CACHE_TTL.demographics);
  return result;
}


// ---------- Helper functions ----------

// Fetch ACS data for a single year. Returns null on failure
// so the caller can drop just that year without crashing.
async function fetchYearData(year, stateFips, countyFips) {
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=B25001_001E&for=county:${countyFips}&in=state:${stateFips}&key=${CENSUS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Census ACS ${year} returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) return null;

    const housingUnits = parseInt(data[1][0], 10);
    if (isNaN(housingUnits) || housingUnits < 0) return null;

    return { year: year, housingUnits: housingUnits };
  } catch (err) {
    console.warn(`Failed to fetch ${year} ACS data:`, err.message);
    return null;
  }
}


// Round to one decimal place
function round1(num) {
  return Math.round(num * 10) / 10;
}