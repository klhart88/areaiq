// ============================================
// AreaIQ by Hart — Venues module
//
// Fetches nearby venues by category from
// OpenStreetMap's Overpass API. Free, no auth,
// CORS-friendly, and globally consistent.
//
// Each venue includes name, address (when available),
// distance from origin, and either a website link
// or a Google search link as fallback.
//
// Attribution: data © OpenStreetMap contributors
// ============================================

import { CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';


// Category definitions. Each maps a UI label to:
//  - An Overpass query (filters on amenity/leisure/shop tags)
//  - A display emoji
//  - A search radius in meters
const CATEGORIES = {
  restaurants: {
    label: 'Restaurants',
    emoji: '🍽️',
    radiusMeters: 4828,  // 3 mile radius
    query: 'amenity~"^(restaurant|fast_food)$"'
  },
  coffee: {
    label: 'Coffee',
    emoji: '☕',
    radiusMeters: 4828,  // 3 mile radius
    query: 'amenity~"^(cafe|coffee_shop)$"'
  },
  groceries: {
    label: 'Groceries',
    emoji: '🛒',
    radiusMeters: 4828,  // 3 mile radius for groceries
    query: 'shop~"^(supermarket|grocery)$"'
  },
  parks: {
    label: 'Parks',
    emoji: '🌳',
    radiusMeters: 4828,  // 3 mile radius
    query: 'leisure~"^(park|nature_reserve|garden)$"'
  },
  fitness: {
    label: 'Fitness',
    emoji: '🏋️',
    radiusMeters: 4828,  // 3 mile radius
    query: 'leisure~"^(fitness_centre|sports_centre)$"'
  },
  pharmacies: {
    label: 'Pharmacies',
    emoji: '💊',
    radiusMeters: 4828,  // 3 mile radius
    query: 'amenity=pharmacy'
  },
  gas: {
    label: 'Gas Stations',
    emoji: '⛽',
    radiusMeters: 4828,  // 3 mile radius
    query: 'amenity=fuel',
    requireName: false  // Gas stations often store brand in 'brand'/'operator' tags, not 'name'
  }
};


// Public function: returns the list of categories
// (used to build the UI before any data is fetched)
export function getCategoryList() {
  return Object.entries(CATEGORIES).map(([key, val]) => ({
    key: key,
    label: val.label,
    emoji: val.emoji
  }));
}


// Public function: fetches venues for a single category
// near a given LocationContext. Returns up to 5 venues.
export async function fetchVenues(location, categoryKey) {
  const category = CATEGORIES[categoryKey];
  if (!category) {
    throw new Error(`Unknown category: ${categoryKey}`);
  }

  // Build a cache key with lat/lng rounded to 3 decimals
  // (~111m precision, gives high cache hit rate)
  const lat3 = Math.round(location.lat * 1000) / 1000;
  const lng3 = Math.round(location.lng * 1000) / 1000;
  const cacheKey = `venues:${categoryKey}:${lat3}:${lng3}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Build the Overpass QL query
  // - 'node' = point-of-interest (like a building entry)
  // - 'way' = area features (like a park polygon)
  // - We query both, around the given lat/lng with the category radius
  // - We filter to results that have a name (so we don't return unnamed POIs)
  //   Exception: categories with requireName:false (e.g. gas stations) skip the
  //   [name] filter because their brand is often stored in 'brand'/'operator' tags
  const nameFilter = category.requireName === false ? '' : '[name]';
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node[${category.query}]${nameFilter}(around:${category.radiusMeters},${location.lat},${location.lng});
      way[${category.query}]${nameFilter}(around:${category.radiusMeters},${location.lat},${location.lng});
    );
    out body center 30;
  `;

  // Send the query to Overpass — try each server until one succeeds
  const data = await queryOverpassWithFallback(overpassQuery);

  if (!data) {
    throw new Error('Venues service is busy. Please wait a moment and try again.');
  }

  // Process the raw OSM data into clean venue objects
  const venues = (data.elements || [])
    .map(el => buildVenue(el, location, category.label))
    .filter(v => v !== null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, 5);  // Top 5 nearest

  // Cache the result (cache empty results too, briefly)
  cacheSet(cacheKey, venues, CACHE_TTL.venuesOSM);

  return venues;
}


// ---------- Helper functions ----------

// Convert an OSM element into a clean venue object
function buildVenue(el, origin, categoryLabel) {
  // Coordinates come from different places depending on element type
  // - nodes have lat/lon directly
  // - ways have center.lat/center.lon
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const tags = el.tags || {};
  // Use name if available; fall back to brand or operator (common for gas stations)
  const name = tags.name || tags.brand || tags.operator || null;
  if (!name) return null;

  // Build a readable address from available tags
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const city = tags['addr:city'] || '';
  const address = [street, city].filter(Boolean).join(', ');

  // Determine the link — prefer a direct website, fallback to search
  const website = tags.website || tags['contact:website'] || tags.url || null;
  const linkUrl = website || buildGoogleSearchUrl(name, address || city);
  const linkLabel = website ? 'Visit website ↗' : 'Search ↗';

  return {
    name: name,
    address: address || null,
    distanceMiles: calculateDistance(origin.lat, origin.lng, lat, lng),
    phone: tags.phone || tags['contact:phone'] || null,
    linkUrl: linkUrl,
    linkLabel: linkLabel,
    category: categoryLabel
  };
}


// Simple haversine distance calculation (lat/lng → miles)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959;  // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;  // 1 decimal place
}

function toRad(deg) {
  return deg * Math.PI / 180;
}


// Google search URL builder, used when OSM has no website
function buildGoogleSearchUrl(name, location) {
  const query = encodeURIComponent(`${name} ${location}`.trim());
  return `https://www.google.com/search?q=${query}`;
}
// Overpass has multiple public mirror servers. If the main one
// fails (rate-limited, timed out), we try the next one.
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];


// Try each Overpass server in turn. Returns the JSON response
// from the first successful one, or null if all fail.
async function queryOverpassWithFallback(query) {
  for (const serverUrl of OVERPASS_SERVERS) {
    try {
      const response = await fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query
      });

      if (response.ok) {
        return await response.json();
      }

      // Non-200 response — log and try the next server
      console.warn(`Overpass ${serverUrl} returned ${response.status}`);
    } catch (err) {
      // Network error — log and try the next server
      console.warn(`Overpass ${serverUrl} failed:`, err.message);
    }
  }

  // All servers failed
  return null;
}