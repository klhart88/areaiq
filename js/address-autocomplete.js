// ============================================
// AreaIQ by Hart — Address autocomplete
//
// Lightweight address suggestions using the same
// Nominatim geocoder already used by AreaIQ.
// ============================================

import { API_ENDPOINTS } from './config.js';

const DEBOUNCE_MS = 320;
const MIN_CHARS = 3;
const MAX_RESULTS = 5;

export function initAddressAutocomplete(input, options = {}) {
  if (!input) return;

  const menu = options.menu || createMenu(input);
  let debounceTimer;
  let activeIndex = -1;
  let lastController = null;
  let suggestions = [];

  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  input.addEventListener('input', () => {
    const query = input.value.trim();
    activeIndex = -1;
    window.clearTimeout(debounceTimer);

    if (query.length < MIN_CHARS) {
      hideMenu();
      return;
    }

    debounceTimer = window.setTimeout(() => fetchAndRender(query), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', (event) => {
    if (!suggestions.length || menu.hidden) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
      updateActiveOption();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveOption();
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    }

    if (event.key === 'Escape') {
      hideMenu();
    }
  });

  input.addEventListener('blur', () => {
    window.setTimeout(hideMenu, 140);
  });

  async function fetchAndRender(query) {
    if (lastController) lastController.abort();
    lastController = new AbortController();

    try {
      const results = await searchIndianaAddresses(query, lastController.signal);
      suggestions = results;
      activeIndex = -1;
      renderMenu(results);
    } catch (err) {
      if (err.name !== 'AbortError') hideMenu();
    }
  }

  function renderMenu(results) {
    menu.innerHTML = '';

    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'address-suggestion-empty';
      empty.textContent = 'No suggestions yet. Try adding the city or ZIP code.';
      menu.appendChild(empty);
      showMenu();
      return;
    }

    results.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'address-suggestion-item';
      button.setAttribute('role', 'option');
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="address-suggestion-main">${escapeHtml(item.label)}</span>
        <span class="address-suggestion-sub">${escapeHtml(item.subLabel)}</span>
      `;
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        chooseSuggestion(item);
      });
      menu.appendChild(button);
    });

    showMenu();
  }

  function chooseSuggestion(item) {
    input.value = item.value;
    input.dataset.selectedAddress = item.value;
    input.dataset.selectedLat = item.lat;
    input.dataset.selectedLng = item.lng;
    hideMenu();
    if (typeof options.onSelect === 'function') options.onSelect(item);
  }

  function updateActiveOption() {
    [...menu.querySelectorAll('.address-suggestion-item')].forEach((button, index) => {
      button.classList.toggle('is-active', index === activeIndex);
      if (index === activeIndex) button.scrollIntoView({ block: 'nearest' });
    });
  }

  function showMenu() {
    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function hideMenu() {
    menu.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }
}

async function searchIndianaAddresses(query, signal) {
  const cleaned = query.replace(/\s+/g, ' ').trim();
  const hasIndianaContext = /\b(IN|Indiana)\b/i.test(cleaned);
  const searchText = hasIndianaContext ? cleaned : `${cleaned}, Indiana`;

  const params = new URLSearchParams({
    q: searchText,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'us',
    limit: String(MAX_RESULTS),
    dedupe: '1'
  });

  const response = await fetch(`${API_ENDPOINTS.geocoder}?${params.toString()}`, { signal });
  if (!response.ok) return [];

  const data = await response.json();
  const seen = new Set();

  return data
    .filter(item => {
      const state = item.address?.state || '';
      return state === 'Indiana' || /, Indiana,/.test(item.display_name || '') || /, IN\b/.test(item.display_name || '');
    })
    .map(normalizeSuggestion)
    .filter(item => {
      const key = item.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

function normalizeSuggestion(item) {
  const addr = item.address || {};
  const house = addr.house_number || '';
  const road = addr.road || addr.pedestrian || addr.footway || addr.cycleway || addr.neighbourhood || '';
  const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.county || '';
  const postcode = addr.postcode || '';

  const street = [house, road].filter(Boolean).join(' ').trim();
  const label = street || item.name || firstParts(item.display_name, 2);
  const subLabel = [city, 'IN', postcode].filter(Boolean).join(', ').replace(', IN,', ', IN ');
  const value = [street || label, city, 'IN', postcode].filter(Boolean).join(', ').replace(', IN,', ', IN ');

  return {
    label,
    subLabel: subLabel || 'Indiana',
    value,
    lat: item.lat,
    lng: item.lon,
    raw: item
  };
}

function firstParts(value, count) {
  return String(value || '').split(',').slice(0, count).join(',').trim();
}

function createMenu(input) {
  const menu = document.createElement('div');
  menu.className = 'address-suggestions';
  menu.hidden = true;
  input.insertAdjacentElement('afterend', menu);
  return menu;
}

function escapeHtml(unsafe) {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
