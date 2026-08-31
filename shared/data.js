// ── Shared dummy data & auth (all emptied — no fake data) ──

const ACCOUNTS = {};

const USERS_DATA = [];

const MY_LEADS_DATA = [];

const ALL_LEADS_DATA = [];

// ── Reminder data helpers ─────────────────────────────────
// esc(): escape user-supplied text before it goes into any innerHTML template
// literal. Fields like lead company/notes/contact, reminder notes, activity
// details, and user names are all attacker-controllable (any logged-in user,
// even the lowest-privilege salesperson, can set them) and were previously
// injected into innerHTML unescaped — a stored-XSS payload placed in, say, a
// lead's company name would execute in ANY other user's browser (including
// the admin's) the moment they viewed that lead, and could exfiltrate their
// session token straight out of sessionStorage. Always wrap untrusted text
// with esc() before interpolating it into a template string used for innerHTML.
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Dates relative to today (kept for date math elsewhere)
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}


// ── Reminder helpers ──────────────────────────────────────
function reminderStatus(dateStr, done) {
  if (done) return 'done';
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'upcoming';
}
function reminderStatusLabel(dateStr, done) {
  const s = reminderStatus(dateStr, done);
  if (s === 'done')     return { label:'Done',     cls:'status-done'     };
  if (s === 'overdue')  return { label:'Overdue',  cls:'status-overdue'  };
  if (s === 'today')    return { label:'Today',    cls:'status-today'    };
  if (s === 'tomorrow') return { label:'Tomorrow', cls:'status-tomorrow' };
  return { label: fmtDate(dateStr), cls:'status-upcoming' };
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function typeIcon(t) {
  if (t === 'Call')    return 'ti-phone';
  if (t === 'Email')   return 'ti-mail';
  if (t === 'Meeting') return 'ti-calendar-event';
  return 'ti-bell';
}
function typeColor(t) {
  if (t === 'Call')    return 'background:#EEF0F8;color:#0F1A45';
  if (t === 'Email')   return 'background:#DBEAFE;color:#1E40AF';
  if (t === 'Meeting') return 'background:#D1FAE5;color:#065F46';
  return 'background:#F3F4F6;color:#374151';
}

// ── Auth helpers ──────────────────────────────────────────
function saveSession(user) { sessionStorage.setItem('crm_user', JSON.stringify(user)); }
function getSession() { const s = sessionStorage.getItem('crm_user'); return s ? JSON.parse(s) : null; }
function clearSession() { sessionStorage.removeItem('crm_user'); }
function requireAuth(expectedRole) {
  const user = getSession();
  if (!user) { window.location.href = rootPath() + 'index.html'; return null; }
  if (expectedRole && user.role !== expectedRole) {
    window.location.href = rootPath() + roleHomePage(user.role);
    return null;
  }
  return user;
}
function roleHomePage(role) {
  if (role === 'admin') return 'admin/dashboard.html';
  if (role === 'manager') return 'manager/dashboard.html';
  if (role === 'quote_manager') return 'quotemanager/companies.html';
  return 'sales/dashboard.html';
}
function rootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  return depth <= 1 ? './' : '../';
}
function logout() { clearSession(); window.location.href = rootPath() + 'index.html'; }

// ── UI helpers ────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast show';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
function stageClass(s) {
  const m = {'New':'stage-new','Contact Made':'stage-contact','Demo':'stage-demo','Proposal Sent':'stage-proposal','Closed Won':'stage-closed','Closed Lost':'stage-lost'};
  return m[s] || 'stage-new';
}
function priorityClass(p) { return p==='High'?'priority-high':p==='Medium'?'priority-med':'priority-low'; }
function avatarColors(c) {
  const map = {
    indigo:'background:#EEF0F8;color:#0F1A45', teal:'background:#CCFBF1;color:#0F766E',
    pink:'background:#FCE7F3;color:#9D174D',   orange:'background:#FFEDD5;color:#C2410C',
    blue:'background:#DBEAFE;color:#1E40AF',   gray:'background:#F3F4F6;color:#4B5563',
    purple:'background:#EDE9FE;color:#6D28D9'
  };
  return map[c] || map.gray;
}
// Splits a leads array's total value into per-currency totals — used
// anywhere a "pipeline"/"total" figure is shown, since blindly summing
// USD and PKR values together into one number would be meaningless.
// Excludes Inactive leads from any pipeline/total calculation — status
// logic itself is unchanged, this only controls whether a lead's value
// counts toward pipeline totals. Reactivating a lead makes it count again
// automatically, since this is computed fresh every time, not stored.
function activeOnly(leads) {
  return (leads || []).filter(l => l.lead_status !== 'Inactive');
}

// Formats a list of rep names for compact display in a table cell —
// shows up to 2 names, then "+N more" if there are additional reps.
// ── Client-side pagination (Companies/Leads/Quotes/Vendors/Users tables) ──
// Slices an already-filtered array down to the current page's rows.
function paginateItems(items, page, perPage) {
  const start = (page - 1) * perPage;
  return (items || []).slice(start, start + perPage);
}

// Renders "Showing X–Y of Z" + Previous/page-number/Next controls.
// goToPageFn is the name of a page-level function taking one arg (the page
// number) that sets currentPage and re-renders. Returns '' (nothing) when
// everything fits on one page, so it never shows pointless controls.
// ── Custom single-select dropdown (matches the Vendor category filter's
// look) — a styled trigger + a positioned, styled options list, instead of
// a native <select> whose open-list styling is entirely OS/browser-default
// and can't be made to match the app. Purely a markup helper: each page
// keeps its own state (which one is open, current value) and defines its
// own toggle/select functions — this just renders consistent HTML/CSS.
function customSelectHTML(wrapId, placeholder, options, selectedValue, isOpen, toggleFn, selectFn) {
  const safeOptions = options || [];
  return `
    <div class="filter-dropdown-wrap" style="position:relative;min-width:160px" id="${wrapId}">
      <div onclick="event.stopPropagation(); ${toggleFn}()" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;font-size:13px;color:${selectedValue?'#374151':'#6B7280'};background:#fff;cursor:pointer;user-select:none">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(selectedValue || placeholder)}</span>
        <i class="ti ti-chevron-down" aria-hidden="true" style="font-size:14px;color:#9CA3AF;flex-shrink:0"></i>
      </div>
      ${isOpen ? `
      <div style="position:absolute;top:100%;left:0;right:0;margin-top:4px;background:#fff;border:1px solid #E5E7EB;border-radius:8px;max-height:240px;overflow-y:auto;z-index:20;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
        <div onclick="${selectFn}('')" style="padding:8px 12px;font-size:13px;cursor:pointer;color:${!selectedValue?'#1B2A6B':'#374151'};font-weight:${!selectedValue?'600':'400'}" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background=''">${esc(placeholder)}</div>
        ${safeOptions.map(o => `<div onclick="${selectFn}('${esc(o).replace(/'/g,"\\'")}')" style="padding:8px 12px;font-size:13px;cursor:pointer;color:${selectedValue===o?'#1B2A6B':'#374151'};font-weight:${selectedValue===o?'600':'400'}" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background=''">${esc(o)}</div>`).join('')}
      </div>` : ''}
    </div>`;
}

function paginationControlsHTML(totalItems, page, perPage, goToPageFn) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (totalPages <= 1) return '';
  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  // Windowed page numbers: first, last, current ±1, with … for gaps.
  const nums = new Set([1, totalPages, page, page - 1, page + 1].filter(n => n >= 1 && n <= totalPages));
  const sorted = [...nums].sort((a, b) => a - b);
  let btns = '';
  let prev = 0;
  sorted.forEach(n => {
    if (prev && n - prev > 1) btns += `<span style="padding:0 4px;color:#9CA3AF;font-size:12px">…</span>`;
    btns += `<button class="btn-sm" onclick="${goToPageFn}(${n})" style="${n===page ? 'background:#1B2A6B;color:#fff;border-color:#1B2A6B' : ''}">${n}</button>`;
    prev = n;
  });

  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid #F3F4F6;flex-wrap:wrap;gap:10px">
      <span style="font-size:12px;color:#9CA3AF">Showing ${start}–${end} of ${totalItems}</span>
      <div style="display:flex;gap:4px;align-items:center">
        <button class="btn-sm" onclick="${goToPageFn}(${page - 1})" ${page <= 1 ? 'disabled' : ''}><i class="ti ti-chevron-left" aria-hidden="true"></i></button>
        ${btns}
        <button class="btn-sm" onclick="${goToPageFn}(${page + 1})" ${page >= totalPages ? 'disabled' : ''}><i class="ti ti-chevron-right" aria-hidden="true"></i></button>
      </div>
    </div>`;
}

// ── Styled Excel pipeline report (ExcelJS — supports real cell styling,
// unlike the free SheetJS tier which can only write plain, unstyled data) ──
const NAVY = 'FF1B2A6B';
const LIGHT_NAVY_BG = 'FFEEF0F8';
const GREEN_BG = 'FFD1FAE5';
const BORDER_GRAY = { style: 'thin', color: { argb: 'FFE5E7EB' } };

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };
  });
  row.height = 22;
}

function styleDataRow(row, shaded) {
  row.eachCell(cell => {
    cell.border = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };
    if (shaded) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_NAVY_BG } };
    cell.alignment = { vertical: 'middle' };
  });
}

function styleTotalRow(row) {
  row.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_BG } };
    cell.border = { top: { style: 'medium', color: { argb: NAVY } }, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };
  });
}

// Simple single-sheet export — downloads exactly the columns/rows currently
// shown in a table (post-filter, not just the current page), styled with
// the same header/banding treatment as the pipeline report above, but
// without the pivot/summary complexity — just "what's on screen".
async function exportSimpleTableExcel(sheetTitle, headerRow, dataRows, filenamePrefix) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Roshan Technologies CRM';
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetTitle, { views: [{ state: 'frozen', ySplit: 1 }] });
  styleHeaderRow(ws.addRow(headerRow));
  dataRows.forEach((r, i) => styleDataRow(ws.addRow(r), i % 2 === 1));
  ws.columns.forEach(col => { col.width = 20; });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function buildStyledPipelineReport(opts) {
  // opts: { title, filterSummary, pivotHeader, pivotRows, totalsRow,
  //         detailHeader, detailRows, detailValueColIndex, filenamePrefix }
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Roshan Technologies CRM';
  wb.created = new Date();

  // ── Summary sheet ──
  const s = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 5 }] });
  s.mergeCells(1, 1, 1, opts.pivotHeader.length);
  const titleCell = s.getCell(1, 1);
  titleCell.value = opts.title;
  titleCell.font = { bold: true, size: 16, color: { argb: NAVY } };
  titleCell.alignment = { vertical: 'middle' };
  s.getRow(1).height = 28;

  s.mergeCells(2, 1, 2, opts.pivotHeader.length);
  s.getCell(2, 1).value = 'Generated: ' + new Date().toLocaleString();
  s.getCell(2, 1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  s.mergeCells(3, 1, 3, opts.pivotHeader.length);
  s.getCell(3, 1).value = 'Filters Applied: ' + opts.filterSummary;
  s.getCell(3, 1).font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };

  const headerRow = s.addRow(opts.pivotHeader);
  styleHeaderRow(headerRow);

  opts.pivotRows.forEach((r, i) => styleDataRow(s.addRow(r), i % 2 === 1));
  styleTotalRow(s.addRow(opts.totalsRow));

  s.columns.forEach((col, i) => {
    col.width = i === 0 ? 22 : 15;
  });

  // ── Lead Detail sheet ──
  const d = wb.addWorksheet('Lead Detail', { views: [{ state: 'frozen', ySplit: 1 }] });
  const dHeaderRow = d.addRow(opts.detailHeader);
  styleHeaderRow(dHeaderRow);
  opts.detailRows.forEach((r, i) => {
    const row = d.addRow(r);
    styleDataRow(row, i % 2 === 1);
    if (opts.detailValueColIndex != null) row.getCell(opts.detailValueColIndex + 1).numFmt = '#,##0';
  });
  d.columns.forEach(col => { col.width = 18; });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.filenamePrefix}-${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatRepNames(names) {
  if (!names || !names.length) return '<span style="color:#9CA3AF">—</span>';
  const shown = names.slice(0, 2).map(n => esc(n)).join(', ');
  const extra = names.length - 2;
  return extra > 0 ? `${shown} <span style="color:#9CA3AF">+${extra} more</span>` : shown;
}

function sumByCurrency(leads) {
  const totals = { USD: 0, PKR: 0 };
  (leads || []).forEach(l => {
    const c = (l.currency || 'USD').toUpperCase();
    const key = totals.hasOwnProperty(c) ? c : 'USD';
    totals[key] += Number(l.value) || 0;
  });
  return totals;
}

function fmtMoney(v, currency) {
  const symbol = (currency || '').toUpperCase() === 'PKR' ? '₨' : '$';
  return symbol + Number(v).toLocaleString();
}

// ── Mini Reminder Calendar — reusable on dashboards ───────
function renderReminderCalendar(reminders, monthOffset) {
  monthOffset = monthOffset || 0;
  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('en-US', { month:'long', year:'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today.toISOString().split('T')[0];

  // Group reminders by date string (YYYY-MM-DD)
  const byDate = {};
  reminders.forEach(r => {
    if (!r.date) return;
    const key = r.date.split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(r);
  });

  const weekLabels = ['S','M','T','W','T','F','S'];
  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell cal-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayReminders = byDate[dateStr] || [];
    const isToday = dateStr === todayStr;
    const hasOverdue = dayReminders.some(r => !r.done && reminderStatus(r.date, r.done) === 'overdue');
    const hasPending = dayReminders.some(r => !r.done);
    const allDone = dayReminders.length > 0 && dayReminders.every(r => r.done);

    let dotColor = '';
    if (hasOverdue) dotColor = '#EF4444';
    else if (hasPending) dotColor = '#F59E0B';
    else if (allDone) dotColor = '#10B981';

    cells += `
      <div class="cal-cell ${isToday?'cal-today':''}" title="${dayReminders.length ? dayReminders.length+' reminder(s)' : ''}">
        <span class="cal-daynum">${d}</span>
        ${dayReminders.length ? `<span class="cal-dot" style="background:${dotColor}"></span>` : ''}
      </div>`;
  }

  return `
    <div class="mini-calendar">
      <div class="cal-header">
        <span class="cal-month-label">${monthName}</span>
      </div>
      <div class="cal-grid cal-weekdays">
        ${weekLabels.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">
        <span><span class="cal-dot" style="background:#EF4444"></span> Overdue</span>
        <span><span class="cal-dot" style="background:#F59E0B"></span> Pending</span>
        <span><span class="cal-dot" style="background:#10B981"></span> Done</span>
      </div>
    </div>`;
}


// ── Lead History Modal — reusable across all roles ───────
function historyActIcon(action) {
  if (action === 'Lead Added')   return { icon:'ti-plus',         bg:'#D1FAE5', color:'#065F46' };
  if (action === 'Lead Updated') return { icon:'ti-pencil',       bg:'#FEF3C7', color:'#92400E' };
  if (action === 'Stage Changed')return { icon:'ti-arrow-right',  bg:'#DBEAFE', color:'#1D4ED8' };
  if (action === 'Reminder Set') return { icon:'ti-bell',         bg:'#FCE7F3', color:'#9D174D' };
  return { icon:'ti-activity', bg:'#F3F4F6', color:'#6B7280' };
}

function ensureHistoryModal() {
  if (document.getElementById('lead-history-modal')) return;
  const div = document.createElement('div');
  div.id = 'lead-history-modal';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <span class="modal-title" id="lh-title">Lead History</span>
        <button class="modal-close" onclick="closeLeadHistory()">×</button>
      </div>
      <div class="modal-body" id="lh-body" style="max-height:60vh;overflow-y:auto">
        <div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">Loading history...</div>
      </div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeLeadHistory()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target.id === 'lead-history-modal') closeLeadHistory(); });
}

function closeLeadHistory() {
  const m = document.getElementById('lead-history-modal');
  if (m) m.classList.remove('open');
}

// ── Lead Details (read-only view) modal ───────────────────
// Shows every field on a lead — including ones not shown in the compact
// table (secondary contact, address, location link, currency, full notes).
// Used by admin/manager "All Leads" pages via a View icon in Actions.
function ensureDetailsModal() {
  if (document.getElementById('lead-details-modal')) return;
  const div = document.createElement('div');
  div.id = 'lead-details-modal';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <span class="modal-title" id="ld-title">Lead Details</span>
        <button class="modal-close" onclick="closeLeadDetails()">×</button>
      </div>
      <div class="modal-body" id="ld-body" style="max-height:70vh;overflow-y:auto"></div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeLeadDetails()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target.id === 'lead-details-modal') closeLeadDetails(); });
}

function closeLeadDetails() {
  const m = document.getElementById('lead-details-modal');
  if (m) m.classList.remove('open');
}

function detailRow(label, value, isLink) {
  if (value === undefined || value === null || value === '') return '';
  const display = isLink
    ? `<a href="${esc(value)}" target="_blank" rel="noopener" style="color:#1B2A6B;text-decoration:underline;word-break:break-all">${esc(value)}</a>`
    : `<span style="color:#111827">${esc(value)}</span>`;
  return `
    <div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #F9FAFB">
      <span style="color:#9CA3AF;font-size:12px;flex-shrink:0">${label}</span>
      <span style="font-size:13px;text-align:right">${display}</span>
    </div>`;
}

function detailSectionTitle(text) {
  return `<div style="font-size:11px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin:18px 0 6px 0">${text}</div>`;
}

function openLeadDetails(lead) {
  ensureDetailsModal();
  document.getElementById('ld-title').textContent = lead.company || 'Lead Details';

  const created = lead.created_at ? new Date(lead.created_at).toLocaleString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,day:'numeric',month:'short',year:'numeric'}) : '';
  const updated = lead.updated_at ? new Date(lead.updated_at).toLocaleString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,day:'numeric',month:'short',year:'numeric'}) : '';

  const hasSecondary = lead.contact2_name || lead.contact2_email || lead.contact2_phone;

  document.getElementById('ld-body').innerHTML = `
    ${detailSectionTitle('Overview')}
    ${detailRow('Company', lead.company)}
    ${detailRow('Rep', lead.rep)}
    ${detailRow('Manager', lead.manager_name)}
    ${detailRow('Product / Service', lead.product)}
    ${detailRow('Deal Value', fmtMoney(lead.value||0, lead.currency))}
    ${detailRow('Stage', lead.stage)}
    ${detailRow('Priority', lead.priority)}
    ${detailRow('Status', lead.lead_status)}

    ${detailSectionTitle('Primary Contact')}
    ${detailRow('Contact Person', lead.contact)}
    ${detailRow('Email', lead.email)}
    ${detailRow('Phone', lead.phone)}

    ${hasSecondary ? detailSectionTitle('Secondary Contact') : ''}
    ${detailRow('Contact Person', lead.contact2_name)}
    ${detailRow('Email', lead.contact2_email)}
    ${detailRow('Phone', lead.contact2_phone)}

    ${(lead.address || lead.location_link) ? detailSectionTitle('Location') : ''}
    ${detailRow('Address', lead.address)}
    ${detailRow('Location Link', lead.location_link, true)}

    ${lead.notes ? detailSectionTitle('Notes') : ''}
    ${lead.notes ? `<div style="font-size:13px;color:#374151;line-height:1.6;padding:6px 0">${esc(lead.notes)}</div>` : ''}

    ${detailSectionTitle('Timeline')}
    ${detailRow('Created', created)}
    ${detailRow('Last Updated', updated)}
  `;
  document.getElementById('lead-details-modal').classList.add('open');
}

// Company detail view — full detail on the viewer's OWN leads against this
// company, everyone else's leads collapsed into a count only (no names,
// contact info, notes, or values leak across reps/teams).
async function openCompanyDetail(companyId) {
  ensureDetailsModal();
  document.getElementById('ld-title').textContent = 'Loading…';
  document.getElementById('ld-body').innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">Loading company…</div>';
  document.getElementById('lead-details-modal').classList.add('open');

  let data;
  try {
    data = await apiFetch(API.getCompanyDetail(companyId), { method:'GET' });
  } catch(e) {
    document.getElementById('ld-body').innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">Could not load company</div>';
    return;
  }

  document.getElementById('ld-title').textContent = data.company ? data.company.name : 'Company';

  // Quote Manager gets a different response shape entirely — quotes in
  // full, leads collapsed to a bare count (they're outside the sales
  // hierarchy, so no lead detail at all, not even their "own").
  if (data.quotes !== undefined) {
    const quotes = data.quotes || [];
    const quotesHtml = quotes.length ? quotes.map((q, i) => `
      ${i > 0 ? '<div style="border-top:1px dashed #E5E7EB;margin:14px 0"></div>' : ''}
      ${detailRow('Quote Number', q.quote_number)}
      ${detailRow('Value', fmtMoney(q.value||0, q.currency))}
      ${detailRow('Due Date', q.due_date)}
      ${detailRow('Status', q.status)}
    `).join('') : `<div style="font-size:13px;color:#9CA3AF;padding:8px 0">No quotes yet for this company.</div>`;

    document.getElementById('ld-body').innerHTML = `
      ${detailSectionTitle('Quotes')}
      ${quotesHtml}
      <div style="margin-top:16px;padding:10px 12px;background:#F9FAFB;border-radius:8px;font-size:12px;color:#6B7280">
        <i class="ti ti-list" aria-hidden="true" style="margin-right:5px;font-size:12px"></i>
        ${data.lead_count || 0} lead${(data.lead_count||0) === 1 ? '' : 's'} on file with this company
      </div>
    `;
    return;
  }

  const leads = data.own_leads || [];
  const leadsHtml = leads.length ? leads.map((l, i) => `
    ${i > 0 ? '<div style="border-top:1px dashed #E5E7EB;margin:14px 0"></div>' : ''}
    ${detailRow('Contact Person', l.contact)}
    ${detailRow('Email', l.email)}
    ${detailRow('Stage', l.stage)}
    ${detailRow('Deal Value', fmtMoney(l.value||0, l.currency))}
    ${l.notes ? `<div style="font-size:13px;color:#374151;line-height:1.6;padding:6px 0">${esc(l.notes)}</div>` : ''}
  `).join('') : `<div style="font-size:13px;color:#9CA3AF;padding:8px 0">You don't have any leads with this company yet.</div>`;

  const otherCount = data.other_leads_count || 0;
  const otherHtml = otherCount > 0
    ? `<div style="margin-top:16px;padding:10px 12px;background:#F9FAFB;border-radius:8px;font-size:12px;color:#6B7280">
        <i class="ti ti-lock" aria-hidden="true" style="margin-right:5px;font-size:12px"></i>
        +${otherCount} other lead${otherCount>1?'s':''} with this company from other reps (not visible to you)
      </div>`
    : '';

  document.getElementById('ld-body').innerHTML = `
    ${detailSectionTitle((typeof user !== 'undefined' && user && user.role === 'admin') ? 'All leads with this company' : 'Your leads with this company')}
    ${leadsHtml}
    ${otherHtml}
  `;
}

// ── Shared password show/hide toggle (Change Password modal) ──
function togglePwField(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('ti-eye');
    icon.classList.add('ti-eye-off');
  } else {
    input.type = 'password';
    icon.classList.remove('ti-eye-off');
    icon.classList.add('ti-eye');
  }
}

// ── Change Password (self-service) modal ──────────────────
function ensureChangePasswordModal() {
  if (document.getElementById('change-password-modal')) return;
  const div = document.createElement('div');
  div.id = 'change-password-modal';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">Change password</span>
        <button class="modal-close" onclick="closeChangePassword()">×</button>
      </div>
      <div class="modal-body">
        <div id="cp-error" style="display:none;background:#FEE2E2;color:#991B1B;font-size:12px;padding:8px 10px;border-radius:8px;margin-bottom:4px"></div>
        <div>
          <div class="field-label">Current password</div>
          <div style="position:relative">
            <input id="cp-current" class="field-input" type="password" placeholder="Enter your current password" style="padding-right:38px"/>
            <button type="button" onclick="togglePwField('cp-current','cp-current-eye')" tabindex="-1" style="position:absolute;right:0;top:0;height:100%;width:38px;border:none;background:none;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;justify-content:center">
              <i id="cp-current-eye" class="ti ti-eye" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div>
          <div class="field-label">New password</div>
          <div style="position:relative">
            <input id="cp-new" class="field-input" type="password" placeholder="Minimum 8 characters" style="padding-right:38px"/>
            <button type="button" onclick="togglePwField('cp-new','cp-new-eye')" tabindex="-1" style="position:absolute;right:0;top:0;height:100%;width:38px;border:none;background:none;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;justify-content:center">
              <i id="cp-new-eye" class="ti ti-eye" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div>
          <div class="field-label">Confirm new password</div>
          <div style="position:relative">
            <input id="cp-confirm" class="field-input" type="password" placeholder="Re-enter new password" style="padding-right:38px"/>
            <button type="button" onclick="togglePwField('cp-confirm','cp-confirm-eye')" tabindex="-1" style="position:absolute;right:0;top:0;height:100%;width:38px;border:none;background:none;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;justify-content:center">
              <i id="cp-confirm-eye" class="ti ti-eye" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeChangePassword()">Cancel</button>
        <button class="btn-primary" id="cp-submit-btn" onclick="submitChangePassword()">Update password</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target.id === 'change-password-modal') closeChangePassword(); });
}

function openChangePassword() {
  ensureChangePasswordModal();
  ['cp-current','cp-new','cp-confirm'].forEach(id => document.getElementById(id).value = '');
  [['cp-current','cp-current-eye'],['cp-new','cp-new-eye'],['cp-confirm','cp-confirm-eye']].forEach(([inputId, iconId]) => {
    document.getElementById(inputId).type = 'password';
    const icon = document.getElementById(iconId);
    icon.classList.remove('ti-eye-off');
    icon.classList.add('ti-eye');
  });
  document.getElementById('cp-error').style.display = 'none';
  document.getElementById('change-password-modal').classList.add('open');
}

function closeChangePassword() {
  const m = document.getElementById('change-password-modal');
  if (m) m.classList.remove('open');
}

async function submitChangePassword() {
  const current = document.getElementById('cp-current').value;
  const next    = document.getElementById('cp-new').value;
  const confirm = document.getElementById('cp-confirm').value;
  const errBox  = document.getElementById('cp-error');
  const showErr = msg => { errBox.textContent = msg; errBox.style.display = 'block'; };

  if (!current) return showErr('Enter your current password.');
  if (next.length < 8) return showErr('New password must be at least 8 characters.');
  if (next !== confirm) return showErr('New password and confirmation do not match.');

  const session = getSession();
  const btn = document.getElementById('cp-submit-btn');
  btn.textContent = 'Updating…'; btn.disabled = true;
  try {
    await apiFetch(API.updatePassword(session.id), {
      method: 'POST',
      body: JSON.stringify({ password: next, current_password: current })
    });
    closeChangePassword();
    showToast('Password updated');
  } catch(e) {
    showErr(e.message || 'Could not update password.');
  } finally {
    btn.textContent = 'Update password'; btn.disabled = false;
  }
}

// ── Company autocomplete (Add/Edit Lead company field) ────
// Attaches a debounced, typo-tolerant search dropdown to a company name
// input. Only ever SUGGESTS matches — selecting one sets the hidden
// company_id field; if the user ignores suggestions and types a brand new
// name, company_id stays empty and the backend auto-creates it on save.
function setupCompanyAutocomplete(inputId, hiddenIdField, boxId, strict) {
  const input = document.getElementById(inputId);
  const box   = document.getElementById(boxId);
  if (!input || !box) return;

  let debounceTimer = null;

  input.addEventListener('input', () => {
    document.getElementById(hiddenIdField).value = ''; // typing invalidates any prior selection
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (!q) { box.innerHTML = ''; box.style.display = 'none'; return; }
    debounceTimer = setTimeout(async () => {
      try {
        const data = await apiFetch(API.searchCompanies(q), { method: 'GET' });
        const matches = data.companies || [];
        if (!matches.length) {
          box.innerHTML = strict
            ? `<div style="padding:8px 10px;font-size:12px;color:#9CA3AF">No matching company — quotes can only be created against an existing company</div>`
            : `<div style="padding:8px 10px;font-size:12px;color:#9CA3AF">No match — "${esc(q)}" will be created as a new company</div>`;
        } else {
          box.innerHTML = matches.map(c => `
            <div class="company-suggest-item" data-id="${c.id}" data-name="${esc(c.name)}"
                 style="padding:8px 10px;font-size:13px;cursor:pointer;color:#374151"
                 onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='#fff'">
              <i class="ti ti-building" aria-hidden="true" style="margin-right:6px;font-size:13px;color:#9CA3AF"></i>${esc(c.name)}
            </div>`).join('');
        }
        box.style.display = 'block';
      } catch(e) {
        box.style.display = 'none';
      }
    }, 250);
  });

  box.addEventListener('click', (e) => {
    const item = e.target.closest('.company-suggest-item');
    if (!item) return;
    input.value = item.dataset.name;
    document.getElementById(hiddenIdField).value = item.dataset.id;
    box.innerHTML = '';
    box.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (e.target !== input && !box.contains(e.target)) {
      box.style.display = 'none';
    }
  });
}

// ── Add Company (manual, from the Companies page button) ──
function ensureAddCompanyModal() {
  if (document.getElementById('add-company-modal')) return;
  const div = document.createElement('div');
  div.id = 'add-company-modal';
  div.className = 'modal-overlay';
  div.innerHTML = `
    <div class="modal" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Add company</span>
        <button class="modal-close" onclick="closeAddCompany()">×</button>
      </div>
      <div class="modal-body">
        <div id="ac-error" style="display:none;background:#FEE2E2;color:#991B1B;font-size:12px;padding:8px 10px;border-radius:8px"></div>
        <div><div class="field-label">Company name</div><input id="ac-name" class="field-input" placeholder="e.g. TechNova Corp"/></div>
      </div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeAddCompany()">Cancel</button>
        <button class="btn-primary" id="ac-submit-btn" onclick="submitAddCompany()">Add company</button>
      </div>
    </div>`;
  document.body.appendChild(div);
  div.addEventListener('click', e => { if (e.target.id === 'add-company-modal') closeAddCompany(); });
}

function openAddCompany() {
  ensureAddCompanyModal();
  document.getElementById('ac-name').value = '';
  document.getElementById('ac-error').style.display = 'none';
  document.getElementById('add-company-modal').classList.add('open');
}

function closeAddCompany() {
  const m = document.getElementById('add-company-modal');
  if (m) m.classList.remove('open');
}

async function submitAddCompany() {
  const name = document.getElementById('ac-name').value.trim();
  const errBox = document.getElementById('ac-error');
  if (!name) {
    errBox.textContent = 'Enter a company name.';
    errBox.style.display = 'block';
    return;
  }
  const btn = document.getElementById('ac-submit-btn');
  btn.textContent = 'Adding…'; btn.disabled = true;
  try {
    await apiFetch(API.addCompany, { method: 'POST', body: JSON.stringify({ name }) });
    closeAddCompany();
    showToast(`${name} added`);
    if (typeof loadCompanies === 'function') loadCompanies();
  } catch(e) {
    errBox.textContent = e.message || 'Could not add company.';
    errBox.style.display = 'block';
  } finally {
    btn.textContent = 'Add company'; btn.disabled = false;
  }
}

function historyLabel(a) {
  if (a.action === 'Lead Added')    return 'Lead Created';
  if (a.action === 'Stage Changed') return 'Status Changed';
  if (a.action === 'Lead Updated')  return 'Lead Updated';
  if (a.action === 'Reminder Set')  return 'Reminder Set';
  return a.action || 'Activity';
}

async function openLeadHistory(leadId, leadCompany) {
  ensureHistoryModal();
  document.getElementById('lh-title').textContent = `History — ${leadCompany || 'Lead'}`;
  document.getElementById('lh-body').innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">Loading history...</div>';
  document.getElementById('lead-history-modal').classList.add('open');

  try {
    // Lead history needs the FULL retention window (120 days), not the
    // Activity Log's 30-day default — otherwise older stage changes would
    // silently vanish from a lead's timeline well before they're actually
    // deleted by the retention job.
    const since = new Date(); since.setDate(since.getDate() - 120);
    const data = await apiFetch(API.getActivities(since.toISOString(), new Date().toISOString()), { method:'GET' });
    let all = [];
    if (data && Array.isArray(data.activities)) all = data.activities;
    else if (Array.isArray(data)) all = data;

    const history = all
      .filter(a => String(a.lead_id) === String(leadId))
      .sort((a,b) => new Date(a.created_at) - new Date(b.created_at));

    const body = document.getElementById('lh-body');
    if (history.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">No history recorded for this lead yet</div>';
      return;
    }

    body.innerHTML = `<div style="position:relative;padding-left:8px">
      ${history.map((a,i) => {
        const ic = historyActIcon(a.action);
        const isLast = i === history.length - 1;
        const dateStr = new Date(a.created_at).toLocaleString('en-US',{hour:'numeric',minute:'2-digit',hour12:true,day:'numeric',month:'short',year:'numeric'});
        return `
        <div style="display:flex;gap:12px;position:relative;padding-bottom:${isLast?'0':'20px'}">
          ${!isLast ? '<div style="position:absolute;left:15px;top:32px;bottom:0;width:2px;background:#F3F4F6"></div>' : ''}
          <div style="width:32px;height:32px;border-radius:50%;background:${ic.bg};color:${ic.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;z-index:1;font-size:14px">
            <i class="ti ${ic.icon}" aria-hidden="true"></i>
          </div>
          <div style="flex:1;min-width:0;padding-top:2px">
            <div style="font-size:13px;font-weight:600;color:#111827">${historyLabel(a)} <span style="font-weight:400;color:#9CA3AF">— ${dateStr}</span></div>
            <div style="font-size:12px;color:#6B7280;margin-top:3px;line-height:1.5">${esc(a.details || '')}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">by ${esc(a.user_name || 'Unknown')}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } catch(e) {
    document.getElementById('lh-body').innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">Could not load history</div>';
  }
}


// Real monthly Closed vs Pipeline totals computed from an array of leads —
// shared by admin (company-wide) and manager (own-team) dashboards so both
// use identical logic instead of duplicating it per page.
// "Pipeline" = total value of leads CREATED in that month (any stage).
// "Closed"   = total value of leads that are Closed Won, attributed to the
// month they were last updated (closest proxy to "closed date" available
// without a dedicated closed_at column).
// Split by currency (USD/PKR) rather than blended, since summing two
// different currencies into one number is meaningless.
function buildMonthlyChartData(leads) {
  const year = new Date().getFullYear();
  const revenueUSD  = new Array(12).fill(0);
  const revenuePKR  = new Array(12).fill(0);
  const pipelineUSD = new Array(12).fill(0);
  const pipelinePKR = new Array(12).fill(0);

  (leads || []).forEach(l => {
    const val = Number(l.value) || 0;
    const cur = (l.currency || 'USD').toUpperCase() === 'PKR' ? 'PKR' : 'USD';

    if (l.created_at) {
      const created = new Date(l.created_at);
      if (created.getFullYear() === year) {
        (cur === 'PKR' ? pipelinePKR : pipelineUSD)[created.getMonth()] += val;
      }
    }

    if (l.stage === 'Closed Won' && l.updated_at) {
      const closed = new Date(l.updated_at);
      if (closed.getFullYear() === year) {
        (cur === 'PKR' ? revenuePKR : revenueUSD)[closed.getMonth()] += val;
      }
    }
  });

  const toK = arr => arr.map(v => Math.round(v / 1000));
  return {
    revenueUSD: toK(revenueUSD), revenuePKR: toK(revenuePKR),
    pipelineUSD: toK(pipelineUSD), pipelinePKR: toK(pipelinePKR)
  };
}

// ── Shared sidebar ────────────────────────────────────────
// ── Shared date-range filter (dashboards + leads pages) ───
// Filters by lead.created_at. Used so every "pipeline"/"total" figure and
// every leads table can be scoped to a time window instead of always
// showing all-time totals.
function createDateFilterState() {
  return { preset: 'all', from: '', to: '' };
}

function getDateRangeBounds(preset, fromStr, toStr) {
  const now = new Date();
  let start = null, end = null;
  if (preset === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start); end.setDate(end.getDate() + 1);
  } else if (preset === 'last30') {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate()); end.setDate(end.getDate() + 1);
    start = new Date(end); start.setDate(start.getDate() - 30);
  } else if (preset === 'week') {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    end = new Date(start); end.setDate(end.getDate() + 7);
  } else if (preset === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (preset === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 1);
  } else if (preset === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear() + 1, 0, 1);
  } else if (preset === 'custom') {
    start = fromStr ? new Date(fromStr + 'T00:00:00') : null;
    end = toStr ? new Date(new Date(toStr + 'T00:00:00').getTime() + 86400000) : null;
  }
  return { start, end }; // preset 'all' (or incomplete custom) => null,null => no filtering
}

function applyDateFilter(leads, state) {
  const { start, end } = getDateRangeBounds(state.preset, state.from, state.to);
  if (!start && !end) return leads || [];
  return (leads || []).filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    if (start && d < start) return false;
    if (end && d >= end) return false;
    return true;
  });
}

function dateFilterHTML(state, handlerName, allowedPresets) {
  const allPresets = [
    ['all','All Time'],['today','Today'],['last30','Last 30 Days'],['week','This Week'],
    ['month','This Month'],['quarter','This Quarter'],['year','This Year'],['custom','Custom Range']
  ];
  const presets = allowedPresets ? allPresets.filter(([v]) => allowedPresets.includes(v)) : allPresets;
  return `
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <select onchange="${handlerName}(this.value)" style="border:1px solid #E5E7EB;border-radius:8px;padding:7px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit;background:#fff;cursor:pointer">
        ${presets.map(([v,l])=>`<option value="${v}" ${state.preset===v?'selected':''}>${l}</option>`).join('')}
      </select>
      ${state.preset==='custom' ? `
        <input type="date" value="${state.from}" onchange="${handlerName}Custom('from',this.value)" style="border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:13px;font-family:inherit;color:#374151"/>
        <span style="color:#9CA3AF;font-size:12px">to</span>
        <input type="date" value="${state.to}" onchange="${handlerName}Custom('to',this.value)" style="border:1px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:13px;font-family:inherit;color:#374151"/>
      ` : ''}
    </div>`;
}

function reminderBadge(counts) {
  if (!counts) return '';
  const count = (counts.overdue || 0) + (counts.today || 0);
  if (count === 0) return '';
  const bg = counts.overdue > 0 ? '#FEE2E2' : '#FEF3C7';
  const cl = counts.overdue > 0 ? '#991B1B' : '#92400E';
  return `<span style="margin-left:auto;background:${bg};color:${cl};font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;">${count}</span>`;
}

// Compute {overdue, today} from any array of reminder objects — used to feed
// renderSidebar's live badge instead of the old hardcoded/dead data.
function reminderCountsFrom(list) {
  if (!Array.isArray(list)) return { overdue: 0, today: 0 };
  return {
    overdue: list.filter(r => !r.done && reminderStatus(r.date, r.done) === 'overdue').length,
    today:   list.filter(r => !r.done && reminderStatus(r.date, r.done) === 'today').length
  };
}

function renderSidebar(user, activePage, reminderCounts) {
  const root = rootPath();
  const rb = reminderBadge(reminderCounts);

  const adminLinks = `
    <p class="nav-section-label">Admin</p>
    <a href="${root}admin/dashboard.html" class="sidebar-link ${activePage==='a-dashboard'?'active':''}"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> Dashboard</a>
    <a href="${root}admin/leads.html" class="sidebar-link ${activePage==='a-leads'?'active':''}"><i class="ti ti-list" aria-hidden="true"></i> All Leads</a>
    <a href="${root}admin/companies.html" class="sidebar-link ${activePage==='a-companies'?'active':''}"><i class="ti ti-building" aria-hidden="true"></i> Companies</a>
    <a href="${root}admin/quotes.html" class="sidebar-link ${activePage==='a-quotes'?'active':''}"><i class="ti ti-file-text" aria-hidden="true"></i> Quotes</a>
    <a href="${root}admin/vendors.html" class="sidebar-link ${activePage==='a-vendors'?'active':''}"><i class="ti ti-truck" aria-hidden="true"></i> Vendors</a>
    <a href="${root}admin/reminders.html" class="sidebar-link ${activePage==='a-reminders'?'active':''}"><i class="ti ti-bell" aria-hidden="true"></i> Reminders ${rb}</a>
    <a href="${root}admin/users.html" class="sidebar-link ${activePage==='a-users'?'active':''}"><i class="ti ti-users" aria-hidden="true"></i> User Management</a>
    <a href="${root}admin/activity.html" class="sidebar-link ${activePage==='a-activity'?'active':''}"><i class="ti ti-history" aria-hidden="true"></i> Activity Log</a>
    <a href="${root}admin/settings.html" class="sidebar-link ${activePage==='a-settings'?'active':''}"><i class="ti ti-settings" aria-hidden="true"></i> Settings</a>`;

  const salesLinks = `
    <p class="nav-section-label">Sales</p>
    <a href="${root}sales/dashboard.html"  class="sidebar-link ${activePage==='s-dashboard'?'active':''}"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> My Dashboard</a>
    <a href="${root}sales/leads.html"      class="sidebar-link ${activePage==='s-leads'?'active':''}"><i class="ti ti-list" aria-hidden="true"></i> My Leads</a>
    <a href="${root}sales/companies.html"  class="sidebar-link ${activePage==='s-companies'?'active':''}"><i class="ti ti-building" aria-hidden="true"></i> Companies</a>
    <a href="${root}sales/reminders.html"  class="sidebar-link ${activePage==='s-reminders'?'active':''}"><i class="ti ti-bell" aria-hidden="true"></i> Reminders ${rb}</a>
    <a href="${root}sales/activity.html"   class="sidebar-link ${activePage==='s-activity'?'active':''}"><i class="ti ti-history" aria-hidden="true"></i> My Activity</a>`;

  const managerLinks = `
    <p class="nav-section-label">Management</p>
    <a href="${root}manager/dashboard.html"  class="sidebar-link ${activePage==='m-dashboard'?'active':''}"><i class="ti ti-chart-bar" aria-hidden="true"></i> Overview</a>
    <a href="${root}manager/all-leads.html"  class="sidebar-link ${activePage==='m-leads'?'active':''}"><i class="ti ti-users" aria-hidden="true"></i> All Leads</a>
    <a href="${root}manager/companies.html"  class="sidebar-link ${activePage==='m-companies'?'active':''}"><i class="ti ti-building" aria-hidden="true"></i> Companies</a>
    <a href="${root}manager/reminders.html"  class="sidebar-link ${activePage==='m-reminders'?'active':''}"><i class="ti ti-bell" aria-hidden="true"></i> Reminders ${rb}</a>
    <a href="${root}manager/roles.html"      class="sidebar-link ${activePage==='m-roles'?'active':''}"><i class="ti ti-lock" aria-hidden="true"></i> Users</a>
    <a href="${root}manager/activity.html"   class="sidebar-link ${activePage==='m-activity'?'active':''}"><i class="ti ti-history" aria-hidden="true"></i> Team Activity</a>`;

  const quoteManagerLinks = `
    <p class="nav-section-label">Quote Manager</p>
    <a href="${root}quotemanager/companies.html" class="sidebar-link ${activePage==='q-companies'?'active':''}"><i class="ti ti-building" aria-hidden="true"></i> Companies</a>
    <a href="${root}quotemanager/quotes.html"     class="sidebar-link ${activePage==='q-quotes'?'active':''}"><i class="ti ti-file-text" aria-hidden="true"></i> Quotes</a>
    <a href="${root}quotemanager/vendors.html"    class="sidebar-link ${activePage==='q-vendors'?'active':''}"><i class="ti ti-truck" aria-hidden="true"></i> Vendors</a>
    <a href="${root}quotemanager/activity.html"   class="sidebar-link ${activePage==='q-activity'?'active':''}"><i class="ti ti-history" aria-hidden="true"></i> Activity Log</a>`;

  const links = user.role === 'admin' ? adminLinks
    : user.role === 'sales' ? salesLinks
    : user.role === 'quote_manager' ? quoteManagerLinks
    : managerLinks;

  return `
  <button class="hamburger-btn mobile-topbar" onclick="toggleSidebar()" aria-label="Open menu">
    <i class="ti ti-menu-2" aria-hidden="true"></i>
    <img src="${root}assets/logo.png" alt="Roshan Technologies" style="max-height:30px;width:auto;object-fit:contain;margin-left:8px"/>
  </button>
  <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="app-sidebar">
    <div class="sidebar-logo" style="justify-content:center;padding:10px 6px;overflow:hidden">
      <img src="${root}assets/logo.png" alt="Roshan Technologies" style="max-width:210px;width:100%;height:auto;max-height:120px;object-fit:contain;display:block"/>
    </div>
    <nav class="sidebar-nav">${links}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar-sm" style="${avatarColors(user.color)}">${user.initials}</div>
        <div class="sidebar-user-info">
          <p class="sidebar-user-name">${esc(user.name)}</p>
          <p class="sidebar-user-role">${user.role === 'manager' ? 'Manager' : user.role === 'admin' ? 'Admin' : user.role === 'quote_manager' ? 'Quote Manager' : 'Salesperson'}</p>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="openChangePassword()" title="Change password" style="width:32px;height:32px;padding:0;flex-shrink:0;border:1px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center">
          <i class="ti ti-lock" aria-hidden="true" style="font-size:15px"></i>
        </button>
        <button onclick="logout()" class="logout-btn" style="flex:1">Sign out</button>
      </div>
    </div>
  </aside>`;
}

// Mobile sidebar drawer controls — no-ops on desktop widths since the CSS
// media query only makes .sidebar an off-canvas drawer below 900px anyway.
function toggleSidebar() {
  const sb = document.getElementById('app-sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if (!sb) return;
  sb.classList.toggle('open');
  if (bd) bd.classList.toggle('open');
}
function closeSidebar() {
  const sb = document.getElementById('app-sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  if (sb) sb.classList.remove('open');
  if (bd) bd.classList.remove('open');
}
// Auto-close the mobile drawer whenever a nav link is tapped, and on Escape.
// Attached once at script-load time via delegation, so it keeps working even
// though renderSidebar's markup gets replaced/re-injected on every render().
document.addEventListener('click', function(e) {
  if (e.target.closest && e.target.closest('.sidebar-link')) closeSidebar();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

// ── Shared CSS ────────────────────────────────────────────
const SHARED_CSS = `
  .mini-calendar { background:#fff; border-radius:12px; }
  .cal-header { display:flex; align-items:center; justify-content:center; margin-bottom:14px; }
  .cal-month-label { font-size:14px; font-weight:600; color:#111827; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:4px; }
  .cal-weekday { text-align:center; font-size:10px; font-weight:600; color:#9CA3AF; text-transform:uppercase; padding:4px 0; }
  .cal-cell { position:relative; aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:8px; font-size:12px; color:#374151; }
  .cal-cell.cal-empty { visibility:hidden; }
  .cal-cell.cal-today { background:#EEF0F8; font-weight:700; color:#1B2A6B; }
  .cal-daynum { line-height:1.2; }
  .cal-dot { display:inline-block; width:5px; height:5px; border-radius:50%; margin-top:2px; }
  .cal-legend { display:flex; gap:14px; justify-content:center; margin-top:12px; font-size:11px; color:#6B7280; }
  .cal-legend .cal-dot { margin-top:0; margin-right:4px; vertical-align:middle; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter',sans-serif; background:#F8F9FB; color:#111827; min-height:100vh; }
  .app { display:flex; min-height:100vh; }

  .sidebar { width:220px; background:#fff; border-right:1px solid #E5E7EB; display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:20; transition:transform 0.25s ease; }
  .sidebar-logo { display:flex; align-items:center; gap:8px; padding:20px 18px; border-bottom:1px solid #F3F4F6; }
  .logo-dot { width:8px; height:8px; background:#1B2A6B; border-radius:50%; }
  .logo-text { font-weight:600; font-size:15px; color:#111827; letter-spacing:-0.2px; }
  .sidebar-nav { flex:1; padding:12px 10px; display:flex; flex-direction:column; gap:2px; overflow-y:auto; }
  .nav-section-label { font-size:10px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.8px; padding:8px 10px 4px; }
  .sidebar-link { display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:8px; font-size:13px; color:#6B7280; text-decoration:none; transition:all 0.15s; }
  .sidebar-link:hover { background:#F5F3FF; color:#1B2A6B; }
  .sidebar-link.active { background:#EEF0F8; color:#1B2A6B; font-weight:500; }
  .sidebar-link i { font-size:16px; }
  .sidebar-footer { padding:12px 10px; border-top:1px solid #F3F4F6; }
  .sidebar-user { display:flex; align-items:center; gap:10px; padding:8px 10px; margin-bottom:2px; }
  .sidebar-user-info { flex:1; min-width:0; }
  .sidebar-user-name { font-size:13px; font-weight:500; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sidebar-user-role { font-size:11px; color:#9CA3AF; margin-top:1px; }
  .avatar-sm { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; flex-shrink:0; }
  .logout-btn { width:100%; text-align:left; padding:8px 10px; font-size:12px; color:#9CA3AF; background:none; border:none; cursor:pointer; border-radius:8px; transition:all 0.15s; }
  .logout-btn:hover { background:#FEF2F2; color:#EF4444; }

  .main { margin-left:220px; flex:1; padding:36px 40px; overflow-y:auto; min-height:100vh; }
  .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; }
  .page-title { font-size:20px; font-weight:700; color:#111827; }
  .page-subtitle { font-size:13px; color:#9CA3AF; margin-top:2px; }

  .btn-primary { display:inline-flex; align-items:center; gap:7px; background:#1B2A6B; color:#fff; font-size:13px; font-weight:500; padding:9px 16px; border-radius:8px; border:none; cursor:pointer; text-decoration:none; transition:background 0.15s; }
  .btn-primary:hover { background:#152158; }
  .btn-outline { display:inline-flex; align-items:center; gap:7px; background:#fff; color:#374151; font-size:13px; font-weight:500; padding:8px 14px; border-radius:8px; border:1px solid #E5E7EB; cursor:pointer; transition:all 0.15s; }
  .btn-outline:hover { background:#F9FAFB; }
  .btn-sm { font-size:12px; padding:5px 10px; border-radius:6px; border:1px solid #E5E7EB; background:#fff; color:#6B7280; cursor:pointer; transition:all 0.15s; }
  .btn-sm:hover { background:#F9FAFB; }
  .btn-danger-sm { font-size:12px; padding:5px 10px; border-radius:6px; border:1px solid #FECACA; background:#FEF2F2; color:#DC2626; cursor:pointer; transition:all 0.15s; }
  .btn-danger-sm:hover { background:#FEE2E2; }

  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:28px; }
  .stat-card { background:#fff; border:1px solid #E5E7EB; border-radius:12px; padding:20px 22px; transition:box-shadow 0.2s; }
  .stat-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.06); }
  .stat-label { font-size:11px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
  .stat-value { font-size:28px; font-weight:700; color:#111827; line-height:1; }
  .stat-sub { font-size:12px; color:#10B981; margin-top:6px; }
  .stat-sub.neutral { color:#9CA3AF; }

  .progress-bar { height:5px; background:#E5E7EB; border-radius:3px; overflow:hidden; margin-top:8px; }
  .progress-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#1B2A6B,#8B5CF6); }

  .table-card { background:#fff; border:1px solid #E5E7EB; border-radius:12px; overflow:hidden; }
  .table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .table-scroll::-webkit-scrollbar { height:10px; }
  .table-scroll::-webkit-scrollbar-track { background:#F3F4F6; }
  .table-scroll::-webkit-scrollbar-thumb { background:#C5CBE8; border-radius:10px; }
  .table-scroll::-webkit-scrollbar-thumb:hover { background:#1B2A6B; }
  .table-scroll table { min-width:1100px; }
  .table-toolbar { display:flex; gap:10px; padding:14px 16px; border-bottom:1px solid #F3F4F6; flex-wrap:wrap; }
  .table-toolbar input, .table-toolbar select { border:1px solid #E5E7EB; border-radius:8px; padding:7px 12px; font-size:13px; color:#374151; outline:none; font-family:inherit; }
  .table-toolbar input { flex:1; min-width:160px; }
  .table-toolbar input:focus, .table-toolbar select:focus { border-color:#1B2A6B; }
  table { width:100%; border-collapse:collapse; }
  thead th { text-align:left; font-size:11px; font-weight:600; color:#9CA3AF; text-transform:uppercase; letter-spacing:0.5px; padding:11px 16px; background:#F9FAFB; }
  tbody tr { border-top:1px solid #F3F4F6; transition:background 0.1s; }
  tbody tr:hover { background:#FAFAFA; }
  tbody td { padding:12px 16px; font-size:13px; color:#374151; }
  .td-company { font-weight:500; color:#111827; }

  .badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-size:11px; font-weight:600; }
  .stage-new { background:#EEF0F8; color:#0F1A45; }
  .stage-contact { background:#FEF3C7; color:#92400E; }
  .stage-demo { background:#DBEAFE; color:#1E40AF; }
  .stage-proposal { background:#FCE7F3; color:#9D174D; }
  .stage-closed { background:#D1FAE5; color:#065F46; }
  .stage-lost { background:#FEE2E2; color:#991B1B; }
  .role-admin { background:#EDE9FE; color:#5B21B6; }
  .role-manager { background:#DBEAFE; color:#1D4ED8; }
  .role-salesperson { background:#D1FAE5; color:#065F46; }
  .role-quote-manager { background:#FEF3C7; color:#92400E; }
  .priority-high { background:#FEE2E2; color:#991B1B; }
  .priority-med { background:#FEF3C7; color:#92400E; }
  .priority-low { background:#F0FDF4; color:#166534; }
  .status-active { background:#D1FAE5; color:#065F46; }
  .status-inactive { background:#F3F4F6; color:#6B7280; }

  .status-overdue  { background:#FEE2E2; color:#991B1B; }
  .status-today    { background:#FEF3C7; color:#92400E; }
  .status-tomorrow { background:#DBEAFE; color:#1E40AF; }
  .status-upcoming { background:#F0FDF4; color:#166534; }
  .status-done     { background:#F3F4F6; color:#9CA3AF; }

  .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:50; align-items:center; justify-content:center; padding:16px; }
  .modal-overlay.open { display:flex; }
  .modal { background:#fff; border-radius:16px; width:100%; max-width:500px; max-height:calc(100vh - 32px); overflow:hidden; display:flex; flex-direction:column; }
  .modal-header { flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:18px 22px; border-bottom:1px solid #F3F4F6; }
  .modal-title { font-size:15px; font-weight:700; color:#111827; }
  .modal-close { background:none; border:none; cursor:pointer; color:#9CA3AF; font-size:20px; line-height:1; }
  .modal-close:hover { color:#374151; }
  .modal-body { padding:22px; display:flex; flex-direction:column; gap:16px; overflow-y:auto; flex:1 1 auto; min-height:0; }
  .modal-footer { flex-shrink:0; padding:14px 22px; background:#F9FAFB; display:flex; justify-content:flex-end; gap:10px; border-top:1px solid #F3F4F6; }
  .field-label { font-size:11px; font-weight:600; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
  .field-input { width:100%; border:1px solid #E5E7EB; border-radius:8px; padding:9px 12px; font-size:13px; font-family:inherit; color:#111827; outline:none; }
  .field-input:focus { border-color:#1B2A6B; }
  .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

  .toast { position:fixed; bottom:24px; right:24px; background:#1F2937; color:#fff; padding:11px 18px; border-radius:10px; font-size:13px; font-weight:500; z-index:200; opacity:0; transform:translateY(8px); transition:all 0.25s; pointer-events:none; max-width:320px; }
  .toast.show { opacity:1; transform:translateY(0); }

  .rep-cell { display:flex; align-items:center; gap:8px; }
  .avatar-xs { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }

  .kanban { display:flex; gap:14px; overflow-x:auto; padding-bottom:12px; }
  .kanban-col { min-width:185px; max-width:185px; }
  .kanban-col-header { display:flex; align-items:center; gap:7px; margin-bottom:10px; }
  .kanban-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .kanban-col-label { font-size:11px; font-weight:600; color:#6B7280; text-transform:uppercase; letter-spacing:0.5px; }
  .kanban-col-count { margin-left:auto; font-size:11px; color:#9CA3AF; }
  .kanban-card { background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:12px; margin-bottom:8px; cursor:pointer; transition:box-shadow 0.15s; }
  .kanban-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.08); }
  .kanban-company { font-size:13px; font-weight:600; color:#111827; }
  .kanban-product { font-size:11px; color:#9CA3AF; margin-top:2px; }
  .kanban-value { font-size:13px; font-weight:700; color:#1B2A6B; margin-top:8px; }

  .section-card { background:#fff; border:1px solid #E5E7EB; border-radius:12px; padding:22px; }
  .section-card-title { font-size:13px; font-weight:600; color:#374151; margin-bottom:18px; }

  /* Every <select> app-wide: hides the native arrow (whose spacing can't be
     controlled via padding alone) and draws a consistent, well-spaced one
     instead. All !important: an inline background:#fff shorthand (used
     all over this app for the white fill) resets background-image to none
     as a side effect — that silently wiped the arrow out wherever it
     happened, which is exactly the bug this !important set prevents from
     ever recurring, on any current or future select. */
  select {
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    background-color: #fff !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 12px center !important;
    background-size: 14px !important;
    padding-right: 36px !important;
  }
  select.field-input { cursor:pointer; }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:#D1D5DB; border-radius:2px; }

  /* ── Mobile topbar / hamburger / backdrop (hidden on desktop) ────── */
  .mobile-topbar { display:none; }
  .hamburger-btn { align-items:center; background:#fff; border:none; border-bottom:1px solid #E5E7EB; cursor:pointer; padding:12px 16px; color:#374151; font-size:20px; line-height:1; position:sticky; top:0; z-index:15; width:100%; text-align:left; }
  .sidebar-backdrop { display:none; position:fixed; inset:0; background:rgba(17,24,39,0.45); z-index:15; }
  .sidebar-backdrop.open { display:block; }

  /* ── Responsive breakpoints ───────────────────────────────────────
     Everything above this point is the desktop-default styling and is
     completely unaffected — these rules only activate below the stated
     widths, layering mobile/tablet behavior on top without touching
     desktop's appearance at all. */
  @media (max-width:900px) {
    .mobile-topbar { display:flex; }
    .sidebar { transform:translateX(-100%); }
    .sidebar.open { transform:translateX(0); box-shadow:0 0 24px rgba(0,0,0,0.15); }
    .main { margin-left:0 !important; padding:20px 16px; }
    .page-header { flex-wrap:wrap; row-gap:12px; }
    .stat-grid { grid-template-columns:repeat(2,1fr); }
    .field-row { grid-template-columns:1fr; }
    .modal-body { padding:16px; }
    .modal-header { padding:14px 16px; }
    .modal-footer { padding:12px 16px; flex-wrap:wrap; }
    .modal { max-width:100%; }
    /* Catch inline 3/4-column stat grids used across various pages
       (admin/leads.html, admin/users.html, manager/all-leads.html, etc.)
       without needing to edit every page's markup individually. */
    [style*="grid-template-columns:repeat(3,1fr)"],
    [style*="grid-template-columns:repeat(4,1fr)"] { grid-template-columns:repeat(2,1fr) !important; }
  }

  @media (max-width:560px) {
    .main { padding:16px 12px; }
    .stat-grid { grid-template-columns:1fr; }
    .page-title { font-size:18px; }
    .page-header .btn-primary, .page-header .btn-outline { font-size:12px; padding:8px 12px; }
    [style*="grid-template-columns:repeat(2,1fr)"],
    [style*="grid-template-columns:repeat(3,1fr)"],
    [style*="grid-template-columns:repeat(4,1fr)"] { grid-template-columns:1fr !important; }
  }
`;
