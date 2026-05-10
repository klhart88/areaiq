console.log('TAX.JS LOADED');
// ============================================
// AreaIQ by Hart — Property tax module
//
// Computes area-level property tax estimates
// using two methods:
//
// 1. Area median (from Census ACS B25103) — what
//    typical homeowners in this Census tract pay
//
// 2. Home value × effective rate — when user
//    provides a target home value, multiply by
//    the state's effective property tax rate
//
// Both are estimates, not assessments. Real
// tax bills depend on assessed value, exemptions,
// and local levy adjustments.
// ============================================

import { CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// We load the state tax info file once and cache
// it in module memory across all calls.
let taxInfoCache = {};


// Public function: returns tax info for a location
// and (optionally) a user-provided home value.
export async function fetchTaxInfo(location, demographics, homeValue) {
  if (location.state !== 'IN') {
    return {
      inServiceArea: false,
      message: 'Property tax estimates are currently available for Indiana only. Other states will be added in future updates.'
    };
  }

  // Load Indiana's static tax info (cached after first load)
  const stateTax = await getStateTaxInfo(location.state);
  if (!stateTax) {
    return {
      inServiceArea: true,
      error: 'Could not load tax rate information.'
    };
  }

  const result = {
    inServiceArea: true,
    state: stateTax.stateName,
    effectiveRate: stateTax.effectiveRate,
    effectiveRatePercent: stateTax.effectiveRatePercent,
    rateAsOf: stateTax.rateAsOf,
    rateSource: stateTax.rateSource,
    billingSchedule: stateTax.billingSchedule,
    billingDescription: stateTax.billingDescription,
    homesteadDeduction: stateTax.homesteadDeduction,
    verificationSource: stateTax.verificationSource,

    // Area median from Census ACS (may be null if not available)
    areaMedianTax: demographics?.medianPropertyTax || null
  };

  // If user provided a home value, calculate estimated tax
  if (homeValue && homeValue > 0) {
    result.homeValueProvided = homeValue;
    result.estimatedTaxFromValue = Math.round(homeValue * stateTax.effectiveRate);
    result.estimatedTaxPerMonth = Math.round(result.estimatedTaxFromValue / 12);
  }

  return result;
}


// ---------- Helper functions ----------

async function getStateTaxInfo(stateCode) {
  // Return cached version if available
  if (taxInfoCache[stateCode]) {
    return taxInfoCache[stateCode];
  }

  // Map state codes to file names
  // (For v1, only Indiana is supported)
  const fileMap = {
    'IN': 'data/indiana-tax-info.json'
    // 'KY': 'data/kentucky-tax-info.json'  // future addition
  };

  const filePath = fileMap[stateCode];
  if (!filePath) {
    return null;
  }

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Failed to load tax info: ${response.status}`);
      return null;
    }
    const data = await response.json();
    taxInfoCache[stateCode] = data;
    return data;
  } catch (err) {
    console.error('Tax info fetch failed:', err);
    return null;
  }
}