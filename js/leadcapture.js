// ============================================
// AreaIQ by Hart — Lead Capture module
//
// Handles the lead capture form on both the main
// results page and the comparison page.
//
// On submission, two parallel actions fire:
// 1. EmailJS sends a notification email to you
// 2. Zapier webhook writes the lead to Airtable
//
// Both must succeed for a "fully successful" lead.
// If just one fails, we still consider it captured
// (your CRM has it OR your email has it) and show
// success to the user.
// ============================================

import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  ZAPIER_WEBHOOK_URL,
  LEAD_NOTIFICATION_EMAIL
} from './config.js';


// Initialize EmailJS once when this module loads
// (emailjs is a global from the CDN script tag)
if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}


// Public function: build the lead capture form and
// inject it into a given container element.
// Context is { location, sourcePage } describing
// what the user was researching.
export function appendLeadCaptureForm(container, context) {
  const block = document.createElement('section');
  block.className = 'feature-block lead-capture-block';

  // Tailor messaging based on whether they're in the service area
  const inIndiana = context.location?.state === 'IN';
  const cityName = context.location?.city || 'the area you researched';

  const headline = inIndiana
    ? `Want updates about ${escapeHtml(cityName)}?`
    : 'Save your research';

  const subline = inIndiana
    ? `I'm Kelvin Hart, a Fathom Realty agent based in Indiana. I can save this research and send you new listings, market updates, or answer specific questions about ${escapeHtml(cityName)}.`
    : `Save this research and I'll send it to you. If you're considering moving to Indiana, I can also send you updates about the areas you're considering.`;

  block.innerHTML = `
    <h2>${headline}</h2>
    <p class="feature-description">${subline}</p>

    <form class="lead-form" id="lead-capture-form" novalidate>
      <div class="lead-field">
        <label for="lead-email" class="lead-label">Email <span class="lead-required">*</span></label>
        <input
          type="email"
          id="lead-email"
          class="lead-input"
          placeholder="you@example.com"
          required
          autocomplete="email">
      </div>

      <div class="lead-field-row">
        <div class="lead-field">
          <label for="lead-name" class="lead-label">Name <span class="lead-optional">(optional)</span></label>
          <input
            type="text"
            id="lead-name"
            class="lead-input"
            placeholder="Your name"
            autocomplete="name">
        </div>

        <div class="lead-field">
          <label for="lead-phone" class="lead-label">Phone <span class="lead-optional">(optional)</span></label>
          <input
            type="tel"
            id="lead-phone"
            class="lead-input"
            placeholder="(317) 555-0123"
            autocomplete="tel">
        </div>
      </div>

      <div class="lead-field">
        <label for="lead-notes" class="lead-label">Anything specific you'd like to know? <span class="lead-optional">(optional)</span></label>
        <textarea
          id="lead-notes"
          class="lead-input lead-textarea"
          placeholder="e.g., 'Looking for 3BR homes under $400k' or 'Tell me about school ratings'"
          rows="3"></textarea>
      </div>

      <button type="submit" class="lead-submit-button">Send my request</button>

      <p class="lead-privacy-note">
        Your information is used only to follow up about your research.
        I'll never share or sell your contact info.
      </p>
    </form>

    <div id="lead-result"></div>
  `;

  container.appendChild(block);

  // Wire up form submission
  const form = block.querySelector('#lead-capture-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLeadSubmit(form, context);
  });
}


// ---------- Form submission ----------

async function handleLeadSubmit(form, context) {
  const emailInput = form.querySelector('#lead-email');
  const nameInput = form.querySelector('#lead-name');
  const phoneInput = form.querySelector('#lead-phone');
  const notesInput = form.querySelector('#lead-notes');
  const submitButton = form.querySelector('.lead-submit-button');
  const resultDiv = document.getElementById('lead-result');

  const email = emailInput.value.trim();
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const notes = notesInput.value.trim();

  // Basic email validation
  if (!email || !isValidEmail(email)) {
    showLeadError(resultDiv, 'Please enter a valid email address.');
    emailInput.focus();
    return;
  }

  // Disable form during submission
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <span class="lead-spinner"></span>
    <span>Sending...</span>
  `;

  // Build the lead data payload
  const leadData = {
    lead_email: email,
    lead_name: name || '(not provided)',
    lead_phone: phone || '(not provided)',
    lead_notes: notes || '(no notes)',
    searched_area: buildSearchedAreaSummary(context),
    source_page: context.sourcePage,
    in_service_area: context.location?.state === 'IN' ? 'Yes' : 'No',
    capture_time: new Date().toLocaleString('en-US', { timeZone: 'America/Indiana/Indianapolis' }),
    to_email: LEAD_NOTIFICATION_EMAIL
  };

  // Fire both submissions in parallel
  const [emailResult, zapierResult] = await Promise.allSettled([
    sendViaEmailJS(leadData),
    sendViaZapier(leadData, context)
  ]);

  // Determine success/failure
  const emailOk = emailResult.status === 'fulfilled';
  const zapierOk = zapierResult.status === 'fulfilled';

  if (emailOk || zapierOk) {
    // At least one succeeded — show success
    showLeadSuccess(form, resultDiv, email, context);

    // Log partial failures to console for debugging
    if (!emailOk) console.warn('EmailJS submission failed:', emailResult.reason);
    if (!zapierOk) console.warn('Zapier submission failed:', zapierResult.reason);
  } else {
    // Both failed — show error and re-enable the form
    showLeadError(resultDiv, 'Sorry, something went wrong sending your request. Please try again or email Kelvin directly.');
    submitButton.disabled = false;
    submitButton.textContent = 'Send my request';
  }
}


// ---------- EmailJS submission ----------

async function sendViaEmailJS(leadData) {
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS SDK not loaded');
  }

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, leadData);
}


// ---------- Zapier webhook submission ----------

async function sendViaZapier(leadData, context) {
  // Build the payload Zapier will receive
  // Using URLSearchParams (form-encoded) instead of JSON because
  // Zapier webhooks don't send CORS preflight headers, so JSON POST
  // gets blocked. Form-encoded POSTs bypass CORS preflight entirely.
  const payload = new URLSearchParams({
    email: leadData.lead_email,
    name: leadData.lead_name === '(not provided)' ? '' : leadData.lead_name,
    phone: leadData.lead_phone === '(not provided)' ? '' : leadData.lead_phone,
    notes: leadData.lead_notes === '(no notes)' ? '' : leadData.lead_notes,
    searched_address: leadData.searched_area,
    source_page: context.sourcePage,
    in_indiana: context.location?.state === 'IN' ? 'true' : 'false',
    captured_at: new Date().toISOString()
  });

  const response = await fetch(ZAPIER_WEBHOOK_URL, {
    method: 'POST',
    body: payload
    // Note: we deliberately omit Content-Type header here.
    // URLSearchParams sets it to 'application/x-www-form-urlencoded'
    // automatically, which is a "simple request" type that doesn't
    // trigger CORS preflight.
  });

  if (!response.ok) {
    throw new Error(`Zapier returned ${response.status}`);
  }

  return response.json();
}


// ---------- Success and error display ----------

function showLeadSuccess(form, resultDiv, email, context) {
  // Hide the form
  form.style.display = 'none';

  // Build success message
  const inIndiana = context.location?.state === 'IN';
  const successMsg = inIndiana
    ? `Got it! I'll be in touch soon at <strong>${escapeHtml(email)}</strong> with information about the area you researched. In the meantime, feel free to keep exploring AreaIQ.`
    : `Got it! I'll be in touch soon at <strong>${escapeHtml(email)}</strong>. If you're considering Indiana, I'd love to help you research areas further.`;

  resultDiv.innerHTML = `
    <div class="lead-success">
      <div class="lead-success-icon">✓</div>
      <p class="lead-success-message">${successMsg}</p>
    </div>
  `;
}


function showLeadError(resultDiv, message) {
  resultDiv.innerHTML = `
    <div class="message message-error">${escapeHtml(message)}</div>
  `;
}


// ---------- Helpers ----------

function buildSearchedAreaSummary(context) {
  if (context.areas && context.areas.length > 1) {
    // Comparison page — multiple areas
    return context.areas
      .map(a => `${a.city || 'unknown'}, ${a.state || ''}`.trim())
      .join(' vs. ');
  }

  // Main page — single area
  const loc = context.location;
  if (!loc) return 'Unknown';
  return `${loc.address || ''}`.replace(/, United States$/, '');
}


function isValidEmail(email) {
  // Simple email regex — good enough for client-side validation
  // (real validation happens when the email actually delivers)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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