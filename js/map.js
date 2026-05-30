// ============================================
// AreaIQ by Hart — Map module
//
// Renders an interactive Mapbox map for a
// LocationContext. Used to give users visual
// context for the area they're researching.
// ============================================

import { MAPBOX_KEY } from './config.js';


// Track the current map instance so we can
// clean it up when displaying a new search
let currentMap = null;


// Public function: renders a map into the
// DOM element with the given containerId,
// centered on the location's coordinates.
export function renderMap(containerId, location) {
  // Configure Mapbox with the access token
  mapboxgl.accessToken = MAPBOX_KEY;

  // Clean up any previous map (prevents memory leaks
  // when running multiple searches)
  if (currentMap) {
    currentMap.remove();
    currentMap = null;
  }

  // Create the new map
  currentMap = new mapboxgl.Map({
    container: containerId,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [location.lng, location.lat],
    zoom: 14
  });

  // Add navigation controls (zoom buttons + compass)
  currentMap.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Add a marker at the searched address
  new mapboxgl.Marker({ color: '#c8102e' })  // Hart red
    .setLngLat([location.lng, location.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<strong>Searched location</strong><br>${escapeHtml(location.address)}`
      )
    )
    .addTo(currentMap);
}


// Helper to safely insert text into HTML strings
function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}