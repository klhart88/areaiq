// ============================================
// AreaIQ by Hart — Research Summary HTML builders
//
// Generates HTML content for the "Email me my
// results" emails. Two builders:
//
// 1. buildSingleAreaResearchHtml() — for the main
//    results page; includes demographics, schools,
//    tax, development trends, and utility links
//
// 2. buildComparisonResearchHtml() — for the
//    comparison page; renders the side-by-side
//    table data
//
// All inline styles. Tables for layout. No images.
// Designed to render consistently across Gmail,
// Outlook, Apple Mail, and other major clients.
// ============================================


// ---------- Color and style constants ----------
// Keeping these in one place so we can adjust the
// branded palette in one spot if needed.

const COLORS = {
  primary: '#c8102e',
  text: '#1a0808',
  muted: '#6b5454',
  border: '#e8e0e0',
  bgLight: '#f7f6f3',
  bgCard: '#ffffff',
  bgHighlight: 'rgba(200, 16, 46, 0.06)'
};


// ---------- Public functions ----------

// Build HTML summary for single-area research email.
// Each section is conditional — if data is missing,
// the section is omitted rather than showing "n/a"
// throughout the email.
export function buildSingleAreaResearchHtml(context) {
  const { location, demographics, schoolInfo, taxInfo, devTrends } = context;

  const sections = [];

  // Address section (always present)
  sections.push(addressSection(location));

  // Demographics section
  if (demographics) {
    sections.push(demographicsSection(demographics));
  }

  // Schools section
  if (schoolInfo && schoolInfo.inServiceArea && schoolInfo.districtName) {
    sections.push(schoolsSection(schoolInfo));
  }

  // Property tax section
  if (taxInfo && taxInfo.inServiceArea && !taxInfo.error) {
    sections.push(taxSection(taxInfo, demographics));
  }

  // Development trends section
  if (devTrends && devTrends.interpretationLabel) {
    sections.push(developmentSection(devTrends));
  }

  return sections.join('');
}


// Build HTML summary for the comparison email.
// Renders a simplified version of the side-by-side
// table with the key decision-driving stats.
export function buildComparisonResearchHtml(profiles) {
  if (!profiles || profiles.length < 2) {
    return '<p style="color: ' + COLORS.text + ';">No comparison data available.</p>';
  }

  // Header row with city names
  const headerCells = profiles.map(p => `
    <td style="padding: 12px 8px; text-align: center; border-bottom: 2px solid ${COLORS.primary}; font-weight: 700; color: ${COLORS.primary}; font-size: 15px;">
      ${escapeHtml(p.location.city || 'Unknown')}
    </td>
  `).join('');

  // Build rows for each metric
  const rows = [
    compareRow('Population', profiles, p => p.demographics?.population, formatNumber),
    compareRow('Median income', profiles, p => p.demographics?.medianIncome, formatCurrency),
    compareRow('Median home value', profiles, p => p.demographics?.medianHomeValue, formatCurrency),
    compareRow('Bachelor\'s or higher', profiles, p => p.demographics?.bachelorsOrHigherPercent, v => v + '%'),
    compareRow('Owner-occupied', profiles, p => p.demographics?.ownerOccupiedPercent, v => v + '%'),
    compareRow('Median property tax', profiles, p => p.demographics?.medianPropertyTax, v => formatCurrency(v) + '/yr'),
    compareRow('School district', profiles, p => p.schoolInfo?.districtName, escapeHtml),
    compareRow('Development trend', profiles, p => p.devTrends?.interpretationLabel, escapeHtml)
  ].filter(Boolean).join('');

  return `
    <h2 style="font-size: 18px; color: ${COLORS.text}; margin: 16px 0 12px 0;">Comparison Summary</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; margin-bottom: 16px;">
      <thead>
        <tr>
          <td style="padding: 12px 8px; text-align: left; border-bottom: 2px solid ${COLORS.primary}; font-weight: 700; color: ${COLORS.text}; font-size: 13px;">Metric</td>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}


// ---------- Section builders for single-area ----------

function addressSection(location) {
  const cleanAddress = (location.address || '').replace(/, United States$/, '');
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; color: ${COLORS.text}; margin: 0 0 8px 0; font-weight: 700;">📍 ${escapeHtml(location.city || 'Searched Area')}</h2>
      <p style="font-size: 14px; color: ${COLORS.muted}; margin: 0; line-height: 1.5;">${escapeHtml(cleanAddress)}</p>
    </div>
  `;
}

function demographicsSection(demo) {
  const rows = [
    statRow('Population', formatNumber(demo.population)),
    statRow('Median age', demo.medianAge ? `${demo.medianAge} years` : null),
    statRow('Median household income', formatCurrency(demo.medianIncome)),
    statRow('Median home value', formatCurrency(demo.medianHomeValue)),
    statRow('Bachelor\'s degree or higher', demo.bachelorsOrHigherPercent ? `${demo.bachelorsOrHigherPercent}% of adults 25+` : null),
    statRow('Owner-occupied homes', demo.ownerOccupiedPercent ? `${demo.ownerOccupiedPercent}%` : null)
  ].filter(Boolean).join('');

  return `
    <div style="margin-bottom: 24px; padding: 16px; background-color: ${COLORS.bgLight}; border-radius: 8px;">
      <h2 style="font-size: 16px; color: ${COLORS.text}; margin: 0 0 12px 0; font-weight: 700;">📊 Neighborhood Demographics</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    </div>
  `;
}

function schoolsSection(schoolInfo) {
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; color: ${COLORS.text}; margin: 0 0 8px 0; font-weight: 700;">🏫 School District</h2>
      <p style="font-size: 15px; color: ${COLORS.text}; margin: 0 0 8px 0; line-height: 1.5;">
        <strong>${escapeHtml(schoolInfo.districtName)}</strong>
      </p>
      <p style="font-size: 13px; color: ${COLORS.muted}; margin: 0; line-height: 1.5;">
        Visit the <a href="${schoolInfo.greatSchoolsUrl}" style="color: ${COLORS.primary}; text-decoration: none;">GreatSchools profile</a> or the <a href="${schoolInfo.districtSearchUrl}" style="color: ${COLORS.primary}; text-decoration: none;">district website</a> for school-specific test scores and information.
      </p>
    </div>
  `;
}

function taxSection(taxInfo, demographics) {
  const areaMedianRow = demographics?.medianPropertyTax
    ? statRow('Area median tax', formatCurrency(demographics.medianPropertyTax) + '/year')
    : '';

  return `
    <div style="margin-bottom: 24px; padding: 16px; background-color: ${COLORS.bgLight}; border-radius: 8px;">
      <h2 style="font-size: 16px; color: ${COLORS.text}; margin: 0 0 12px 0; font-weight: 700;">💰 Property Tax</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${statRow('Effective tax rate', `${taxInfo.effectiveRatePercent} (Indiana)`)}
        ${areaMedianRow}
      </table>
      <p style="font-size: 13px; color: ${COLORS.muted}; margin: 12px 0 0 0; line-height: 1.5;">
        Indiana counties bill semi-annually (May and November). Primary residences may qualify for Homestead Deductions reducing the actual tax owed.
      </p>
    </div>
  `;
}

function developmentSection(dev) {
  const change = dev.totalChangePercent;
  const changeSign = change >= 0 ? '+' : '';
  const changeColor = change >= 2 ? COLORS.primary : COLORS.muted;

  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; color: ${COLORS.text}; margin: 0 0 8px 0; font-weight: 700;">📈 Development Trends</h2>
      <p style="font-size: 15px; color: ${COLORS.text}; margin: 0 0 4px 0; line-height: 1.5;">
        <strong>${escapeHtml(dev.interpretationLabel)}</strong>
      </p>
      <p style="font-size: 14px; color: ${changeColor}; margin: 0; line-height: 1.5;">
        Housing units changed <strong>${changeSign}${change}%</strong> over the past ${dev.yearsSpanned} years in ${escapeHtml(dev.countyName)} County.
      </p>
    </div>
  `;
}


// ---------- Comparison row builder ----------

function compareRow(label, profiles, accessor, formatter) {
  const cells = profiles.map(p => {
    const value = accessor(p);
    const formatted = value == null ? 'n/a' : (formatter ? formatter(value) : value);
    return `<td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.text}; font-size: 13px;">${formatted}</td>`;
  }).join('');

  return `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.muted}; font-size: 13px; font-weight: 600;">${escapeHtml(label)}</td>
      ${cells}
    </tr>
  `;
}


// ---------- Small helpers ----------

function statRow(label, value) {
  if (value == null || value === 'n/a' || value === '$NaN') return '';
  return `
    <tr>
      <td style="padding: 4px 0; color: ${COLORS.muted}; font-size: 14px; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 4px 0; color: ${COLORS.text}; font-size: 14px; font-weight: 600; text-align: right;">${value}</td>
    </tr>
  `;
}

function formatNumber(value) {
  if (value == null) return null;
  return value.toLocaleString('en-US');
}

function formatCurrency(value) {
  if (value == null) return null;
  return '$' + value.toLocaleString('en-US');
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