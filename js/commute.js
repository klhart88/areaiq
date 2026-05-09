// ============================================
// AreaIQ by Hart — Commute module
//
// Calculates drive time between two locations
// at peak and off-peak times using Mapbox's
// Directions API.
//
// Peak = next weekday 8:00 AM (rush hour)
// Off-peak = next weekday 1:00 PM (light traffic)
// ============================================

import { MAPBOX_KEY, CACHE_TTL } from './config.js';
import { cacheGet, cacheSet } from './cache.js';
import { geocodeAddress } from './geocode.js';


// Public function: takes an origin LocationContext
// (the searched property) and a destination address
// string. Returns commute info or throws an error.
export async function fetchCommuteEstimate(origin, destinationAddress) {
  if (!destinationAddress || !destinationAddress.trim()) {
    throw new Error('Please enter a destination.');
  }

  // Step 1: Geocode the destination address
  // This benefits from cache automatically since
  // geocodeAddress already caches its results.
  const destination = await geocodeAddress(destinationAddress);

  // Step 2: Build a cache key for the commute pair
  // Round coordinates to ~111m to share cache between
  // nearby points (e.g., houses on the same block)
  const cacheKey = `commute:${roundCoord(origin.lat)},${roundCoord(origin.lng)}:${roundCoord(destination.lat)},${roundCoord(destination.lng)}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Step 3: Calculate next weekday timestamps
  const peakTime = nextWeekdayAt(8, 0);   // 8:00 AM
  const offPeakTime = nextWeekdayAt(13, 0); // 1:00 PM

  // Step 4: Make both Directions API requests in parallel
  const [peakResult, offPeakResult] = await Promise.all([
    callDirectionsApi(origin, destination, peakTime),
    callDirectionsApi(origin, destination, offPeakTime)
  ]);

  if (!peakResult || !offPeakResult) {
    throw new Error('Unable to calculate route. The destination may be too far or unreachable by car.');
  }

  // Step 5: Build the result object
  const result = {
    destination: {
      address: destination.address,
      lat: destination.lat,
      lng: destination.lng
    },
    peak: {
      durationMinutes: Math.round(peakResult.duration / 60),
      distanceMiles: Math.round((peakResult.distance / 1609.34) * 10) / 10  // 1 decimal
    },
    offPeak: {
      durationMinutes: Math.round(offPeakResult.duration / 60),
      distanceMiles: Math.round((offPeakResult.distance / 1609.34) * 10) / 10
    }
  };

  // Distance is the same; we just take it from peak

  // Cache and return
  // Note: we use a short TTL because traffic data is time-sensitive
  cacheSet(cacheKey, result, CACHE_TTL.demographics);  // 90 days is fine — these are typical times
  return result;
}


// ---------- Helper functions ----------

// Call Mapbox's Directions API for a single leg
async function callDirectionsApi(origin, destination, departureTime) {
  // Build the coordinate pair: origin lng,lat;destination lng,lat
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;

  const params = new URLSearchParams({
  access_token: MAPBOX_KEY,
  geometries: 'geojson',
  overview: 'simplified',
  depart_at: departureTime.toISOString().replace(/\.\d{3}Z$/, 'Z')
});

  // Use the 'driving-traffic' profile for traffic-aware routing
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error('Network error calculating route.');
  }

  if (!response.ok) {
    throw new Error(`Mapbox Directions returned status ${response.status}.`);
  }

  const data = await response.json();
  if (!data.routes || data.routes.length === 0) {
    return null;
  }

  // Return the first (best) route's duration and distance
  return {
    duration: data.routes[0].duration,  // seconds
    distance: data.routes[0].distance   // meters
  };
}


// Returns a Date object representing the next weekday at the given hour
function nextWeekdayAt(hour, minute) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  // If we've already passed that time today, advance to tomorrow
  if (date <= new Date()) {
    date.setDate(date.getDate() + 1);
  }

  // If the resulting day is Saturday (6) or Sunday (0), advance to Monday
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}


// Round a coordinate to 3 decimals (~111m precision) for cache keying
function roundCoord(c) {
  return Math.round(c * 1000) / 1000;
}