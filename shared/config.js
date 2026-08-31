// ── Roshan Technologies — Flask API Configuration ─────────
// Backend now runs on your own VPS (Flask + Postgres) instead of n8n.
const BASE_URL = 'https://api.roshantech.cloud/api';

const API = {
  login:          BASE_URL + '/login',
  getLeads:       BASE_URL + '/leads',
  getCompanies:   BASE_URL + '/companies',
  getCompanyDetail: (id) => BASE_URL + '/companies/' + id,
  searchCompanies: (q) => BASE_URL + '/companies/search?q=' + encodeURIComponent(q),
  addCompany:     BASE_URL + '/companies',
  getQuotes:      BASE_URL + '/quotes',
  saveQuote:      BASE_URL + '/quotes',
  updateQuote:    (id) => BASE_URL + '/quotes/' + id,
  deleteQuote:    (id) => BASE_URL + '/quotes/' + id,
  downloadQuoteAttachment: (id) => BASE_URL + '/quotes/' + id + '/attachment',
  getVendorCategories: BASE_URL + '/vendor-categories',
  getSalespersons: BASE_URL + '/salespersons',
  getVendors:     BASE_URL + '/vendors',
  saveVendor:     BASE_URL + '/vendors',
  updateVendor:   (id) => BASE_URL + '/vendors/' + id,
  deleteVendor:   (id) => BASE_URL + '/vendors/' + id,
  saveLead:       BASE_URL + '/leads',
  updateLead:     (id) => BASE_URL + '/leads/' + id,
  updateStage:    (id) => BASE_URL + '/leads/' + id + '/stage',
  getStats:       BASE_URL + '/stats',
  getReminders:   BASE_URL + '/reminders',
  saveReminder:   BASE_URL + '/reminders',
  updateReminder: (id) => BASE_URL + '/reminders/' + id,
  deleteReminder: (id) => BASE_URL + '/reminders/' + id,
  getUsers:       BASE_URL + '/users',
  addUser:        BASE_URL + '/users',
  updateRole:     (id) => BASE_URL + '/users/' + id,
  updatePassword: (id) => BASE_URL + '/users/' + id + '/password',
  logActivity:    BASE_URL + '/activities',
  getActivities:  (from, to) => BASE_URL + '/activities' + ((from || to) ? '?' + [from ? 'from=' + encodeURIComponent(from) : '', to ? 'to=' + encodeURIComponent(to) : ''].filter(Boolean).join('&') : ''),
  getSettings:    BASE_URL + '/settings',
  regenerateKey:  BASE_URL + '/settings/regenerate-key',
};

function apiHeaders(isFormData) {
  const s = getSession();
  const headers = { 'Authorization': s ? 'Bearer ' + s.token : '' };
  // FormData bodies (file uploads) need the browser to set its own
  // multipart boundary — forcing Content-Type here would break that.
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
}

async function apiFetch(url, options = {}) {
  try {
    const isFormData = options.body instanceof FormData;
    const res = await fetch(url, { headers: apiHeaders(isFormData), ...options });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || 'Request failed');
    }
    return await res.json();
  } catch (e) {
    showToast(e.message || 'Network error — check the server is running');
    throw e;
  }
}


// ── Activity logger — fire and forget ─────────────────────
async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || '';
  } catch(e) { return ''; }
}

function logActivity(action, details, ipOverride, leadId) {
  try {
    const s = getSession();
    const send = (ip) => {
      fetch(API.logActivity, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          action,
          details: details || '',
          user_name: s ? s.name : 'Unknown',
          user_role: s ? s.role : '',
          ip_address: ip || '',
          lead_id: leadId || ''
        })
      }).catch(() => {});
    };
    if (ipOverride) { send(ipOverride); }
    else if (s && s.ip_address) { send(s.ip_address); }
    else { getPublicIP().then(send); }
  } catch(e) {}
}
