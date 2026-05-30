// AreaIQ global phone helpers
// Kept as a classic script on purpose so older cached module code that calls
// phoneToTel() or formatPhoneNumber() can still resolve those names.
(function () {
  function normalizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  window.phoneToTel = function phoneToTel(value) {
    var digits = normalizeDigits(value);
    if (!digits) return '';
    if (digits.length === 10) return '+1' + digits;
    if (digits.length === 11 && digits.charAt(0) === '1') return '+' + digits;
    return digits;
  };

  window.toTelHref = window.phoneToTel;

  window.formatPhoneNumber = function formatPhoneNumber(value) {
    var digits = normalizeDigits(value).slice(-10);
    if (!digits) return '';
    if (digits.length < 4) return '(' + digits;
    if (digits.length < 7) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
    return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
  };

  window.formatPhoneDisplay = window.formatPhoneNumber;
})();
