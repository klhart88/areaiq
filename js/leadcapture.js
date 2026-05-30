// ============================================
// AreaIQ by Hart — Lead Capture module
//
// Handles two distinct lead capture flows:
//
// 1. "Email me my results" — captures contact and
//    sends the user a polished HTML email with
//    their research data. Notifies you (the agent)
//    that a lead saved research.
//
// 2. "Ask Kelvin a question" — captures contact +
//    a specific question. Sends you a notification
//    with the question. Sends them a brief confirmation.
//
// Both flows write to Airtable via Zapier with a
// "Request Type" field distinguishing the two.
// ============================================

import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_RESULTS_TEMPLATE_ID,
  ZAPIER_WEBHOOK_URL,
  LEAD_NOTIFICATION_EMAIL
} from './config.js';

import {
  buildSingleAreaResearchHtml,
  buildComparisonResearchHtml
} from './research-summary.js';


// Initialize EmailJS once when this module loads
if (typeof emailjs !== 'undefined') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}


// ============================================
// Public function — entry point
// ============================================

// Build and inject the two-CTA lead capture section.
// Context describes what the user was researching.
// Shape: { location, demographics, schoolInfo, taxInfo,
//          devTrends, sourcePage, profiles? }
//   - For single-page: provide individual data objects
//   - For comparison: provide profiles array
export function appendLeadCaptureForm(container, context) {
  const block = document.createElement('section');
  block.className = 'feature-block lead-capture-block';

  const inIndiana = context.location?.state === 'IN';
  const cityName = context.location?.city || 'this area';

  const sublineEmail = `Get a polished copy of your research delivered to your inbox.`;
  const sublineAsk = inIndiana
    ? `I'm Kelvin Hart, a Fathom Realty agent in Indiana. Have a specific question about ${escapeHtml(cityName)}? I'll respond personally.`
    : `Have a specific question about your research? Send it directly to me.`;

  block.innerHTML = `
    <h2>Save or share your research</h2>

    <div class="lead-cta-grid">
      <div class="lead-cta-card">
        <svg class="lead-cta-icon lead-cta-icon-results" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v11H4z"></path><path d="M4 8l8 6 8-6"></path></svg>
        <h3 class="lead-cta-title">Email me these results</h3>
        <p class="lead-cta-description">${sublineEmail}</p>
        <button type="button" class="lead-cta-button" data-flow="results">
          Send me my research →
        </button>
      </div>

      <div class="lead-cta-card">
        <svg class="lead-cta-icon lead-cta-icon-question" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5A5.5 5.5 0 0 1 10.5 1h3A5.5 5.5 0 0 1 19 6.5v3A5.5 5.5 0 0 1 13.5 15H10l-5 4v-5.5A5.5 5.5 0 0 1 5 9.5z"></path><path d="M10 7h4"></path><path d="M10 10h3"></path></svg>
        <h3 class="lead-cta-title">Ask Kelvin a question</h3>
        <p class="lead-cta-description">${sublineAsk}</p>
        <button type="button" class="lead-cta-button lead-cta-button-secondary" data-flow="question">
          Ask a question →
        </button>
      </div>
    </div>

    <div id="lead-form-container"></div>
  `;

  container.appendChild(block);

  // Wire up the CTA buttons
  const ctaButtons = block.querySelectorAll('.lead-cta-button');
  ctaButtons.forEach(button => {
    button.addEventListener('click', () => {
      const flow = button.dataset.flow;
      showForm(flow, context);
    });
  });
}


// ============================================
// Form rendering
// ============================================

function showForm(flow, context) {
  const formContainer = document.getElementById('lead-form-container');

  if (flow === 'results') {
    formContainer.innerHTML = renderResultsForm(context);
  } else if (flow === 'question') {
    formContainer.innerHTML = renderQuestionForm(context);
  }

  // Scroll the form into view for better UX
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Wire up the form's submit handler
  const form = formContainer.querySelector('.lead-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleLeadSubmit(form, flow, context);
    });
  }

  // Wire up the cancel button
  const cancelButton = formContainer.querySelector('.lead-cancel-button');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      formContainer.innerHTML = '';
    });
  }

  // Force phone fields into (xxx) xxx-xxxx format as users type
  const phoneInput = formContainer.querySelector('#lead-phone');
  if (phoneInput) attachPhoneFormatter(phoneInput);

  // Focus the email field
  const emailInput = formContainer.querySelector('#lead-email');
  if (emailInput) emailInput.focus();
}


function renderResultsForm(context) {
  return `
    <form class="lead-form" novalidate>
      <h3 class="lead-form-heading">Where should I send your research?</h3>

      <div class="lead-field">
        <label for="lead-email" class="lead-label">Email <span class="lead-required">*</span></label>
        <input type="email" id="lead-email" class="lead-input" placeholder="you@example.com" required autocomplete="email">
      </div>

      <div class="lead-field-row">
        <div class="lead-field">
          <label for="lead-name" class="lead-label">Name <span class="lead-optional">(optional)</span></label>
          <input type="text" id="lead-name" class="lead-input" placeholder="Your name" autocomplete="name">
        </div>
        <div class="lead-field">
          <label for="lead-phone" class="lead-label">Phone <span class="lead-optional">(optional)</span></label>
          <input type="tel" id="lead-phone" class="lead-input" placeholder="(317) 555-0123" autocomplete="tel">
        </div>
      </div>

      <div class="lead-button-row">
        <button type="submit" class="lead-submit-button">Send my research</button>
        <button type="button" class="lead-cancel-button">Cancel</button>
      </div>

      <p class="lead-privacy-note">
        Your info is used only to send your research and follow up if you want. Never shared or sold.
      </p>

      <div id="lead-result"></div>
    </form>
  `;
}


function renderQuestionForm(context) {
  return `
    <form class="lead-form" novalidate>
      <h3 class="lead-form-heading">Ask your question</h3>

      <div class="lead-field">
        <label for="lead-email" class="lead-label">Email <span class="lead-required">*</span></label>
        <input type="email" id="lead-email" class="lead-input" placeholder="you@example.com" required autocomplete="email">
      </div>

      <div class="lead-field-row">
        <div class="lead-field">
          <label for="lead-name" class="lead-label">Name <span class="lead-optional">(optional)</span></label>
          <input type="text" id="lead-name" class="lead-input" placeholder="Your name" autocomplete="name">
        </div>
        <div class="lead-field">
          <label for="lead-phone" class="lead-label">Phone <span class="lead-optional">(optional)</span></label>
          <input type="tel" id="lead-phone" class="lead-input" placeholder="(317) 555-0123" autocomplete="tel">
        </div>
      </div>

      <div class="lead-field">
        <label for="lead-notes" class="lead-label">Your question <span class="lead-required">*</span></label>
        <textarea id="lead-notes" class="lead-input lead-textarea" placeholder="e.g., 'What's the typical commute time to downtown?' or 'Are these homes typically 3BR or 4BR?'" rows="4" required></textarea>
      </div>

      <div class="lead-button-row">
        <button type="submit" class="lead-submit-button">Send your question</button>
        <button type="button" class="lead-cancel-button">Cancel</button>
      </div>

      <p class="lead-privacy-note">
        I'll respond personally within 24 hours, usually much sooner.
      </p>

      <div id="lead-result"></div>
    </form>
  `;
}


// ============================================
// Form submission
// ============================================

async function handleLeadSubmit(form, flow, context) {
  const emailInput = form.querySelector('#lead-email');
  const nameInput = form.querySelector('#lead-name');
  const phoneInput = form.querySelector('#lead-phone');
  const notesInput = form.querySelector('#lead-notes');  // only exists on question form
  const submitButton = form.querySelector('.lead-submit-button');
  const resultDiv = form.querySelector('#lead-result');

  const email = emailInput.value.trim();
  const name = nameInput.value.trim();
  const phone = formatPhoneNumber(phoneInput.value.trim());
  if (phoneInput) phoneInput.value = phone;
  const notes = notesInput ? notesInput.value.trim() : '';

  // Validation
  if (!email || !isValidEmail(email)) {
    showLeadError(resultDiv, 'Please enter a valid email address.');
    emailInput.focus();
    return;
  }

  if (phone && !isValidPhone(phone)) {
    showLeadError(resultDiv, 'Please enter a 10-digit phone number or leave the phone field blank.');
    phoneInput.focus();
    return;
  }

  if (flow === 'question' && !notes) {
    showLeadError(resultDiv, 'Please enter your question before submitting.');
    notesInput.focus();
    return;
  }

  // Disable form during submission
  submitButton.disabled = true;
  submitButton.innerHTML = `<span class="lead-spinner"></span><span>Sending...</span>`;

  // Build the lead data (used for notification email + Airtable)
  const leadData = {
    lead_email: email,
    lead_name: name || '(not provided)',
    lead_phone: phone || '(not provided)',
    lead_notes: notes || '(no notes)',
    searched_area: buildSearchedAreaSummary(context),
    source_page: context.sourcePage,
    request_type: flow === 'results' ? 'Send results' : 'Ask question',
    in_service_area: context.location?.state === 'IN' ? 'Yes' : 'No',
    capture_time: new Date().toLocaleString('en-US', { timeZone: 'America/Indiana/Indianapolis' }),
    to_email: LEAD_NOTIFICATION_EMAIL
  };

  // Always send notification to agent (existing template)
  const promises = [sendNotificationEmail(leadData)];

  // If flow is "results", also send the results email to the user
  if (flow === 'results') {
    promises.push(sendResultsEmail(leadData, context));
  }

  // Send to Zapier (writes to Airtable)
  promises.push(sendToZapier(leadData, context));

  const results = await Promise.allSettled(promises);

  // Check results — succeed if any submission worked
  const anySucceeded = results.some(r => r.status === 'fulfilled');

  if (anySucceeded) {
    showLeadSuccess(form, resultDiv, email, flow, context);

    // Log any failures for debugging
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const labels = ['notification email', 'results email', 'CRM/Airtable'];
        console.warn(`${labels[i] || 'submission'} failed:`, r.reason);
      }
    });
  } else {
    showLeadError(resultDiv, 'Sorry, something went wrong. Please try again or email Kelvin directly at ' + LEAD_NOTIFICATION_EMAIL + '.');
    submitButton.disabled = false;
    submitButton.textContent = flow === 'results' ? 'Send my research' : 'Send your question';
  }
}


// ============================================
// Send the agent notification email
// ============================================

async function sendNotificationEmail(leadData) {
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS SDK not loaded');
  }
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, leadData);
}


// ============================================
// Send the user's research email (HTML)
// ============================================

async function sendResultsEmail(leadData, context) {
  if (typeof emailjs === 'undefined') {
    throw new Error('EmailJS SDK not loaded');
  }

  // Build the research HTML content
  let researchHtml;
  if (context.profiles && context.profiles.length > 1) {
    researchHtml = buildComparisonResearchHtml(context.profiles);
  } else {
    researchHtml = buildSingleAreaResearchHtml(context);
  }

  // Build the CTA URL — deep link back to AreaIQ
  const ctaUrl = buildCtaUrl(context);

  // Pass to the EmailJS results template
  const params = {
    lead_email: leadData.lead_email,
    lead_name: leadData.lead_name === '(not provided)' ? 'there' : leadData.lead_name,
    searched_area: leadData.searched_area,
    research_html: researchHtml,
    cta_url: ctaUrl
  };

  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_RESULTS_TEMPLATE_ID, params);
}


// ============================================
// Send to Zapier (Airtable CRM)
// ============================================

async function sendToZapier(leadData, context) {
  const payload = new URLSearchParams({
    email: leadData.lead_email,
    name: leadData.lead_name === '(not provided)' ? '' : leadData.lead_name,
    phone: leadData.lead_phone === '(not provided)' ? '' : leadData.lead_phone,
    notes: leadData.lead_notes === '(no notes)' ? '' : leadData.lead_notes,
    searched_address: leadData.searched_area,
    source_page: context.sourcePage,
    request_type: leadData.request_type,
    in_indiana: context.location?.state === 'IN' ? 'true' : 'false',
    captured_at: new Date().toISOString()
  });

  const response = await fetch(ZAPIER_WEBHOOK_URL, {
    method: 'POST',
    body: payload
  });

  if (!response.ok) {
    throw new Error(`Zapier returned ${response.status}`);
  }
  return response.json();
}


// ============================================
// Success/error display
// ============================================

function showLeadSuccess(form, resultDiv, email, flow, context) {
  form.style.display = 'none';

  let successMsg;
  if (flow === 'results') {
    successMsg = `Your research is on the way to <strong>${escapeHtml(email)}</strong>. Check your inbox in the next few minutes (and your spam folder if it doesn't arrive). Feel free to keep exploring or compare other areas.`;
  } else {
    successMsg = `Got it! Your question is on its way to me. I'll respond to <strong>${escapeHtml(email)}</strong> personally within 24 hours, usually much sooner.`;
  }

  resultDiv.innerHTML = `
    <div class="lead-success">
      <div class="lead-success-icon">✓</div>
      <p class="lead-success-message">${successMsg}</p>
    </div>
  `;
}

function showLeadError(resultDiv, message) {
  resultDiv.innerHTML = `<div class="message message-error">${escapeHtml(message)}</div>`;
}


// ============================================
// Helpers
// ============================================

function buildSearchedAreaSummary(context) {
  if (context.profiles && context.profiles.length > 1) {
    return context.profiles
      .map(p => `${p.location.city || 'unknown'}, ${p.location.state || ''}`.trim())
      .join(' vs. ');
  }
  const loc = context.location;
  if (!loc) return 'Unknown';
  return `${loc.address || ''}`.replace(/, United States$/, '');
}

function buildCtaUrl(context) {
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');

  if (context.profiles && context.profiles.length > 1) {
    // Comparison — link back to compare.html with all addresses
    const params = new URLSearchParams();
    context.profiles.forEach((p, i) => {
      const key = ['a', 'b', 'c'][i];
      if (key) params.set(key, p.location.address.replace(/, United States$/, ''));
    });
    return `${baseUrl}compare.html?${params.toString()}`;
  }

  // Single area — link back to index.html with the address pre-filled via query param
  const address = context.location?.address?.replace(/, United States$/, '') || '';
  return `${baseUrl}index.html?address=${encodeURIComponent(address)}`;
}

function attachPhoneFormatter(input) {
  input.setAttribute('inputmode', 'numeric');
  input.setAttribute('maxlength', '14');
  input.addEventListener('input', () => {
    input.value = formatPhoneNumber(input.value);
  });
  input.addEventListener('blur', () => {
    input.value = formatPhoneNumber(input.value);
  });
}

function formatPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidPhone(value) {
  return String(value || '').replace(/\D/g, '').length === 10;
}

function isValidEmail(email) {
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