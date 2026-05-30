// ============================================
// AreaIQ by Hart — Schools module
//
// Determines which Indiana school district
// contains a given lat/lng using point-in-polygon
// against the locally-bundled NCES boundaries.
//
// In Stage C, this module will be enhanced to
// also return the zoned schools and test score data.
// ============================================

import { CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// We load the GeoJSON file once and keep it in memory.
// First call triggers the load; subsequent calls reuse it.
let districtsGeojson = null;
let loadingPromise = null;


// Public function: takes a LocationContext and returns
// the school district info, or null if not in Indiana.
export async function fetchSchoolInfo(location) {
  // Indiana-only feature for v1
  if (location.state !== 'IN') {
    return {
      inServiceArea: false,
      message: 'School data is currently available for Indiana addresses only. Kentucky coverage is planned for a future update.'
    };
  }

  // Check cache (keyed by tract since districts are tract-stable)
  const cacheKey = `schools:${location.censusTract || `${location.lat},${location.lng}`}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Load the GeoJSON if not already loaded
  await ensureDistrictsLoaded();

  if (!districtsGeojson) {
    return {
      inServiceArea: true,
      error: 'Could not load school district data. Please try again.'
    };
  }

  // Find the district that contains this location
  const district = findDistrict(location.lat, location.lng);

  if (!district) {
    return {
      inServiceArea: true,
      error: 'Could not determine the school district for this address. The address may be outside Indiana or in a non-standard area.'
    };
  }

  const result = {
  inServiceArea: true,
  districtId: district.GEOID,
  districtName: district.NAME,
  districtSearchUrl: buildGoogleSearchUrl(district.NAME),
  greatSchoolsUrl: buildGreatSchoolsUrl(district.NAME, location.city)
};

  // Cache and return
  cacheSet(cacheKey, result, CACHE_TTL.schools);
  return result;
}


// ---------- Helper functions ----------

// Load the GeoJSON file. Reuses an in-flight promise if one
// is already loading (avoids duplicate fetches if multiple
// searches happen quickly).
async function ensureDistrictsLoaded() {
  if (districtsGeojson) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch('data/indiana-school-districts.geojson')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load district boundaries: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      districtsGeojson = data;
    })
    .catch(err => {
      console.error('Could not load school districts:', err);
      districtsGeojson = null;
    });

  return loadingPromise;
}


// Use Turf.js to find which district polygon contains
// the given point. Returns the district's properties or null.
function findDistrict(lat, lng) {
  if (!districtsGeojson || !districtsGeojson.features) {
    return null;
  }

  const point = turf.point([lng, lat]);

  for (const feature of districtsGeojson.features) {
    if (turf.booleanPointInPolygon(point, feature)) {
      return feature.properties;
    }
  }

  return null;
}


// Build a Google search URL for the district's website.
function buildGoogleSearchUrl(districtName) {
  const query = encodeURIComponent(`${districtName} Indiana official website`);
  return `https://www.google.com/search?q=${query}`;
}


// Build a GreatSchools URL for the district.
function buildGreatSchoolsUrl(districtName, city) {
  const query = encodeURIComponent(`${districtName} ${city}`);
  return `https://www.greatschools.org/search/search.page?q=${query}&state=IN`;
}