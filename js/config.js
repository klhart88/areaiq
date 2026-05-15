// ============================================
// AreaIQ by Hart — Configuration
//
// This file holds API keys and constants used
// across the application. Update values here
// when keys change or when expanding service
// area, etc.
// ============================================

// ---------- API Keys ----------
// IMPORTANT: All keys here MUST be domain-restricted
// in their respective vendor dashboards. See spec
// section 8 for security guidance.

// Census API key (free; sign up at api.census.gov/data/key_signup.html)
// Required for Demographics API; not required for Geocoder.
export const CENSUS_API_KEY = 'f0b219afaa069e9f4a46f74010988cc11755d459';

// Mapbox key (placeholder — we'll add this in a later step)
export const MAPBOX_KEY = 'pk.eyJ1Ijoia2xoYXJ0ODgiLCJhIjoiY21veW05Mml5MG12cDR1b2c0bGphOXIxbSJ9.RvPvcZUHZ88142do6lEKAQ';

// ---------- Service Area ----------
// State codes where we offer real estate services.
// Used to flag in-area leads. Add to this array
// when expanding (e.g., add 'KY' for v1.1).
export const SERVICE_STATES = ['IN'];


// ---------- API Endpoints ----------
// Base URLs for the APIs we call. Centralized here
// so we can change versions or domains in one place.

export const API_ENDPOINTS = {
  geocoder: 'https://nominatim.openstreetmap.org/search',
  censusACS: 'https://api.census.gov/data/2023/acs/acs5',
  fccCensusBlock: 'https://geo.fcc.gov/api/census/block/find'
};


// ---------- Cache TTLs (in milliseconds) ----------
// How long we cache different types of data in
// the browser before re-fetching. Address geocodes
// rarely change; venues change more often.

const ONE_DAY = 24 * 60 * 60 * 1000;

export const CACHE_TTL = {
  geocode: 30 * ONE_DAY,
  demographics: 90 * ONE_DAY,
  schools: 90 * ONE_DAY,
  tax: 90 * ONE_DAY,
  utilities: 90 * ONE_DAY,
  venuesGoogle: 7 * ONE_DAY,
  venuesOSM: 30 * ONE_DAY,
  permits: 30 * ONE_DAY
};
// EmailJS credentials
// (Public Key is safe to expose due to origin restrictions configured in EmailJS dashboard)
export const EMAILJS_PUBLIC_KEY = 'jGoc2JKDFReuuJlwN';
export const EMAILJS_SERVICE_ID = 'service_1qdsjpq';
export const EMAILJS_TEMPLATE_ID = 'template_3fq6xgm';

// Zapier webhook URL for Airtable lead capture
export const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/27596963/4y076h6/';

// Where lead notifications should be emailed
export const LEAD_NOTIFICATION_EMAIL = 'khart@fathomrealty.com';