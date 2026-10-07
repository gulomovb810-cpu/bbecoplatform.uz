/* =====================================================================
   EKO-MUROJAAT — vazirlik va idoralar uchun murojaatlar portali
   Sahifalar: bosh sahifa, kiruvchi arizalar, ariza kartasi, ijro nazorati,
   xarita, tahlil, tashkilotlar, xodimlar, javob shablonlari, jurnal, sozlamalar.
   ===================================================================== */
'use strict';

const CFG = window.ECO_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR-PROJECT/.test(CFG.SUPABASE_URL) && !/YOUR-ANON/.test(CFG.SUPABASE_ANON_KEY) && window.supabase);
const sb = LIVE ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

// ---------------------------------------------------------------------
// Til (o'zbek / rus). Matnlar o'zbekcha yoziladi, RU lug'ati oxirida.
// ---------------------------------------------------------------------
let LANG = (() => { try { return localStorage.getItem('eko_portal_lang') || 'uz'; } catch (e) { return 'uz'; } })();
function T(s, v) {
  let out = (LANG === 'ru' && RU[s]) || s;
  if (v) Object.keys(v).forEach(k => { out = out.split('{' + k + '}').join(v[k]); });
  return out;
}
const stT = k => T((STATUSES[k] || STATUSES[0]).t);
const catT = k => T(catOf(k).t);
const regT = c => { const r = regionOf(c); return r ? T(r.uz) : (c ? c : T('Respublika')); };
const roleT = r => T(ROLES[r] || r);
const prioT = k => T((PRIORITIES[k] || PRIORITIES[0]).t);

// ---------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => Number(n || 0).toLocaleString('ru-RU');
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const pad = n => String(n).padStart(2, '0');
const fmtD = d => d ? fmtDay(d) : '—';
const fmtDT = d => { if (!d) return '—'; const x = new Date(d); return fmtDay(x) + ' ' + pad(x.getHours()) + ':' + pad(x.getMinutes()); };
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return T('hozirgina');
  if (s < 3600) return T('{n} daq. oldin', { n: Math.floor(s / 60) });
  if (s < 86400) return T('{n} soat oldin', { n: Math.floor(s / 3600) });
  if (s < 86400 * 30) return T('{n} kun oldin', { n: Math.floor(s / 86400) });
  return fmtD(d);
}
function maskPhone(p) { if (!p) return '—'; const d = String(p); return d.length > 7 ? d.slice(0, 7) + ' *** ** ' + d.slice(-2) : d; }
const safeLS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

// ---------------------------------------------------------------------
// Holat
// ---------------------------------------------------------------------
const S = {
  store: null, me: null, data: null, route: { page: 'dashboard', id: null, q: {} },
  sel: new Set(), sort: { k: 'created_at', d: -1 }, page: 0, perPage: 25,
  seenAt: null, notifSeen: null, sim: safeLS.get('eko_portal_sim', true), sound: safeLS.get('eko_portal_sound', false),
  maps: {}, sideOpen: false
};
const me = () => S.me;
const isStaff = () => isStaffRole(S.me.role);
const isHead = () => S.me.role === 'org_head';
const isAgent = () => isAgentRole(S.me.role);
const orgById = id => S.data.orgs.find(o => o.id === id);
const orgShort = id => { const o = orgById(id); return o ? (o.short_name || o.name) : T('Taqsimlanmagan'); };
const personById = id => S.data.profiles.find(p => p.id === id);
const personName = id => { const p = personById(id); return p ? p.full_name : (id ? T('Xodim') : '—'); };
const repById = id => S.data.reports.find(r => r.id === id || r.case_no === id);

// Ariza holati bo'yicha hosilalar
const isOpen = r => !r.cancelled && r.status < 3;
const isClosed = r => r.cancelled || r.status >= 3;
const isOverdue = r => isOpen(r) && r.deadline_at && new Date(r.deadline_at) < Date.now();
const hoursLeft = r => r.deadline_at ? (new Date(r.deadline_at) - Date.now()) / 3600e3 : null;
const onTime = r => r.resolved_at && r.deadline_at ? new Date(r.resolved_at) <= new Date(r.deadline_at) : null;
function dueLabel(r) {
  if (r.cancelled) return { cls: 'ok', t: T('Bekor qilingan') };
  if (r.status >= 3) { const ok = onTime(r); return { cls: ok === false ? 'late' : 'ok', t: ok === false ? T('Kechikib yopilgan') : T('O‘z vaqtida') }; }
  const h = hoursLeft(r); if (h === null) return { cls: 'ok', t: '—' };
  if (h < 0) { const d = Math.ceil(-h / 24); return { cls: 'late', t: T('{n} kun kechikdi', { n: d }) }; }
  if (h < 24) return { cls: 'soon', t: T('{n} soat qoldi', { n: Math.max(1, Math.floor(h)) }) };
  return { cls: h < 72 ? 'soon' : 'ok', t: T('{n} kun qoldi', { n: Math.floor(h / 24) }) };
}
// Ruxsatlar (baza qoidalari bilan bir xil)
const canWork = r => !r.cancelled && (isStaff() || (isAgent() && r.org_id === me().org_id && (isHead() || r.assignee_id === me().id)));
const canAssign = r => !r.cancelled && r.status < 3 && (isStaff() || (isHead() && r.org_id === me().org_id));
const canForward = r => !r.cancelled && r.status < 3 && (isStaff() || (isHead() && r.org_id === me().org_id));

function statusChip(r) {
  if (r.cancelled) return `<span class="chip"><span class="dot"></span>${esc(T('Bekor qilingan'))}</span>`;
  if (r.reject_reason && r.status >= 3) return `<span class="chip chip-danger"><span class="dot"></span>${esc(T('Rad etildi'))}</span>`;
  const s = STATUSES[r.status] || STATUSES[0];
  return `<span class="chip chip-status" style="--c:${s.c}"><span class="dot"></span>${esc(T(s.t))}</span>`;
}
const prioChip = r => r.priority ? `<span class="chip chip-prio${r.priority}">${r.priority === 2 ? '⚡ ' : ''}${esc(prioT(r.priority))}</span>` : '';
const catChip = r => `<span class="chip">${catOf(r.category).icon} ${esc(catT(r.category))}</span>`;

// ---------------------------------------------------------------------
// Toast, modal, tooltip
// ---------------------------------------------------------------------
function toast(msg, kind, onClick, sub) {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.innerHTML = `<div>${esc(msg)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  el.onclick = () => { if (onClick) onClick(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), kind === 'err' ? 7000 : 4500);
}
function modal({ title, body, actions, wide, onOpen }) {
  return new Promise(resolve => {
    const root = $('#modalRoot');
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h3>${esc(title)}</h3><button class="btn btn-ghost btn-icon x" data-x aria-label="${esc(T('Yopish'))}">✕</button></div>
      <div class="modal-b">${body}</div>
      <div class="modal-f">${(actions || []).map((a, i) => `<button class="btn ${a.cls || ''}" data-a="${i}">${esc(a.t)}</button>`).join('')}</div></div>`;
    const close = v => { ov.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', e => { if (e.target === ov) close(null); });
    ov.querySelector('[data-x]').onclick = () => close(null);
    $$('[data-a]', ov).forEach(b => b.onclick = async () => {
      const a = actions[+b.dataset.a];
      if (!a.run) return close(a.v);
      const err = $('.form-error', ov);
      try { b.disabled = true; const v = await a.run(ov); if (v !== false) close(v === undefined ? true : v); }
      catch (e) { if (err) err.textContent = T(e.message || String(e)); else toast(T(e.message || String(e)), 'err'); }
      finally { b.disabled = false; }
    });
    root.appendChild(ov);
    if (onOpen) onOpen(ov);
    const f = $('textarea, input, select', $('.modal-b', ov)); if (f) setTimeout(() => f.focus(), 30);
  });
}
const confirmBox = (title, text, okT, danger) => modal({ title, body: `<p style="margin:0">${esc(text)}</p>`, actions: [{ t: T('Bekor qilish'), v: false }, { t: okT || T('Tasdiqlash'), cls: danger ? 'btn-primary btn-danger' : 'btn-primary', v: true }] });
let tipEl = null;
function tip(e, html) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); }
  if (!html) { tipEl.classList.remove('on'); return; }
  tipEl.innerHTML = html; tipEl.classList.add('on');
  const x = Math.min(window.innerWidth - tipEl.offsetWidth - 10, e.clientX + 14), y = Math.min(window.innerHeight - tipEl.offsetHeight - 10, e.clientY + 14);
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
}
function bindTips(root) {
  $$('[data-tip]', root).forEach(el => {
    el.addEventListener('mousemove', e => tip(e, el.dataset.tip));
    el.addEventListener('mouseleave', () => tip(null));
  });
}
function lightbox(src) {
  const el = document.createElement('div'); el.className = 'lightbox';
  el.innerHTML = `<img src="${esc(src)}" alt="">`; el.onclick = () => el.remove();
  document.body.appendChild(el);
}
function beep() {
  if (!S.sound) return;
  try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.08, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .4); o.start(); o.stop(c.currentTime + .4); } catch (e) { }
}

// ---------------------------------------------------------------------
// Kirish
// ---------------------------------------------------------------------
async function boot() {
  applyTheme();
  S.store = LIVE ? new LiveStore(sb) : new DemoStore();
  let who = null;
  try { who = await S.store.init(); } catch (e) { console.error(e); }
  if (!who) return renderLogin();
  S.me = who; await startApp();
}
function applyTheme() {
  const t = safeLS.get('eko_portal_theme', null);
  if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  document.documentElement.lang = LANG;
}
function renderLogin(err) {
  const accts = S.store.demoAccounts();
  $('#app').innerHTML = `<div class="login">
    <section class="login-hero">
      <div>
        <div class="login-brand"><span class="logo">🌿</span><div>EKO-MUROJAAT<small>${esc(T('Ekologik murojaatlar bilan ishlash tizimi'))}</small></div></div>
        <h1>${esc(T('Fuqarolarning ekologik murojaatlari — bitta oynada'))}</h1>
        <p>${esc(T('Vazirlik va hududiy idoralar uchun portal: murojaatlarni qabul qilish, ijrochiga biriktirish, muddatni nazorat qilish va fuqaroga rasmiy javob berish.'))}</p>
        <ul>
          <li><i>📥</i><div><b>${esc(T('Avtomatik taqsimlash'))}</b>${esc(T('Ariza toifasi va hududiga qarab mas’ul idoraga o‘zi tushadi.'))}</div></li>
          <li><i>⏱️</i><div><b>${esc(T('Muddat nazorati'))}</b>${esc(T('Har bir ariza uchun muddat, kechikayotganlar qizil bilan ajratiladi.'))}</div></li>
          <li><i>🗺️</i><div><b>${esc(T('Aniq joy va surat'))}</b>${esc(T('Koordinata, surat va fuqaro tavsifi — joyni izlash shart emas.'))}</div></li>
          <li><i>📊</i><div><b>${esc(T('Ijro intizomi reytingi'))}</b>${esc(T('Idoralar va xodimlar kesimida natijalar, hisobotlar Excel’ga.'))}</div></li>
        </ul>
      </div>
      <div class="small" style="color:#9CC5B0">bbecoplatform.uz · ${new Date().getFullYear()}</div>
    </section>
    <section class="login-main">
      <form class="login-card" id="loginForm" autocomplete="on">
        <div><h2>${esc(T('Tizimga kirish'))}</h2><p class="muted" style="margin:6px 0 0">${esc(T('Idora xodimining ish emaili va paroli bilan kiring.'))}</p></div>
        ${LIVE ? '' : `<div class="notice">🧪 <b>${esc(T('Demo rejim'))}.</b> ${esc(T('Ma’lumotlar bazasi hali ulanmagan. Barcha amallarni namunaviy ma’lumotlarda sinab ko‘rishingiz mumkin, ular faqat shu brauzerda saqlanadi.'))}</div>`}
        <label class="field"><span>${esc(T('Email'))}</span><input id="lEmail" type="email" required autocomplete="username" placeholder="ism@eco.gov.uz"></label>
        <label class="field"><span>${esc(T('Parol'))}</span><input id="lPass" type="password" ${LIVE ? 'required' : ''} autocomplete="current-password" placeholder="••••••••"></label>
        <div class="form-error" id="lErr">${esc(err ? T(err) : '')}</div>
        <button class="btn btn-primary btn-block" style="height:44px" type="submit" id="lBtn">${esc(T('Kirish'))}</button>
        ${accts.length ? `<div class="divider">${esc(T('yoki tayyor demo hisob bilan'))}</div>
        <div class="demo-accts">${accts.map(a => `<button type="button" class="demo-acct" data-id="${esc(a.p.id)}"><span class="avatar">${esc(initials(a.p.full_name))}</span><div><b>${esc(roleT(a.p.role))}${a.p.org_id ? ' · ' + esc(orgShortRaw(a.p.org_id)) : ''}</b><span>${esc(a.p.full_name)} — ${esc(T(a.note))}</span></div></button>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:center">${langSwitch()}</div>
      </form>
    </section></div>`;
  bindLang();
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const b = $('#lBtn'); b.disabled = true; $('#lErr').textContent = '';
    try { S.me = await S.store.login($('#lEmail').value, $('#lPass').value); await startApp(); }
    catch (er) { $('#lErr').textContent = T(er.message || String(er)); }
    finally { b.disabled = false; }
  };
  $$('.demo-acct').forEach(b => b.onclick = async () => { S.me = await S.store.loginAs(b.dataset.id); await startApp(); });
}
function orgShortRaw(id) { const o = S.store.db && S.store.db.orgs.find(x => x.id === id); return o ? (o.short_name || o.name) : ''; }
function langSwitch() { return `<div class="lang-sw" role="group" aria-label="Til"><button type="button" data-lang="uz" class="${LANG === 'uz' ? 'on' : ''}">UZ</button><button type="button" data-lang="ru" class="${LANG === 'ru' ? 'on' : ''}">RU</button></div>`; }
function bindLang() {
  $$('[data-lang]').forEach(b => b.onclick = () => {
    LANG = b.dataset.lang; try { localStorage.setItem('eko_portal_lang', LANG); } catch (e) { }
    document.documentElement.lang = LANG;
    if (S.data) { renderShell(); route(); } else renderLogin();
  });
}

async function startApp() {
  $('#app').innerHTML = `<div class="empty" style="padding-top:30vh"><div class="ei">🌿</div>${esc(T('Yuklanmoqda...'))}</div>`;
  try { S.data = await S.store.load(); }
  catch (e) { console.error(e); return renderLogin(e.message || 'Ma’lumotlarni yuklab bo‘lmadi'); }
  S.me = S.data.me;
  const k = 'eko_portal_seen_' + S.me.id;
  S.seenAt = safeLS.get(k, null) || new Date(Date.now() - 2 * DAY).toISOString();
  S.notifSeen = safeLS.get('eko_portal_nseen_' + S.me.id, S.seenAt);
  S.readSet = new Set(safeLS.get('eko_portal_read_' + S.me.id, []));
  renderShell();
  if (!location.hash || location.hash === '#') location.hash = '#/dashboard'; else route();
  if (!S.bound) {
    S.bound = true;
    window.addEventListener('hashchange', () => route());
    S.store.onChange(onStoreChange);
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); const s = $('#gSearch'); if (s) s.focus(); }
    });
    setInterval(() => { if (S.route.page === 'dashboard' || S.route.page === 'inbox') refreshBadges(); }, 60000);
  }
  if (S.store.mode === 'demo' && S.sim) S.store.startSim(); else S.store.stopSim();
}

// Yangi ma'lumotlar (realtime yoki demo taqlidi)
const reloadSoon = debounce(async (ev) => {
  try { S.data = await S.store.load(); S.me = S.data.me; } catch (e) { return; }
  refreshBadges();
  const p = S.route.page;
  if (p === 'report' && ev && ev.id && repById(S.route.id) && repById(S.route.id).id !== ev.id) return;   // boshqa ariza kartasi — tegmaymiz
  if (['dashboard', 'inbox', 'control', 'journal', 'report'].includes(p)) route(true);
}, 350);
function onStoreChange(ev) {
  if (ev.type === 'new' && ev.visible !== false) {
    setTimeout(() => {
      const r = repById(ev.id);
      if (r) { beep(); toast(T('Yangi murojaat: {n}', { n: r.case_no }), 'new', () => go('#/report/' + r.id), catT(r.category) + ' · ' + regT(r.region)); }
    }, 400);
  }
  reloadSoon(ev);
}

// ---------------------------------------------------------------------
// Qobiq: yon panel + yuqori panel
// ---------------------------------------------------------------------
function navItems() {
  const m = me(), R = S.data.reports;
  const n = {
    inbox: R.filter(r => r.status === 0 && !r.cancelled && (isStaff() ? true : true)).length,
    mine: R.filter(r => r.assignee_id === m.id && isOpen(r)).length,
    overdue: R.filter(isOverdue).length,
    unrouted: R.filter(r => !r.org_id && isOpen(r)).length
  };
  const items = [
    { sec: T('Ish stoli') },
    { id: 'dashboard', ic: '🏠', t: T('Bosh sahifa') },
    { id: 'inbox', ic: '📥', t: T('Kiruvchi arizalar'), badge: n.inbox },
  ];
  if (isAgent()) items.push({ id: 'inbox', q: 'view=mine', ic: '🧑‍💼', t: T('Mening topshiriqlarim'), cnt: n.mine });
  if (isStaff()) items.push({ id: 'inbox', q: 'view=unrouted', ic: '🧭', t: T('Taqsimlanmagan'), badge: n.unrouted });
  items.push({ id: 'inbox', q: 'view=overdue', ic: '⏰', t: T('Muddati o‘tganlar'), badge: n.overdue });
  items.push({ sec: T('Nazorat va tahlil') });
  if (!(me().role === 'org_staff')) items.push({ id: 'control', ic: '🎯', t: T('Ijro nazorati') });
  items.push({ id: 'map', ic: '🗺️', t: T('Xarita') });
  items.push({ id: 'analytics', ic: '📊', t: T('Tahlil va hisobotlar') });
  items.push({ sec: T('Ma’lumotnoma') });
  if (isStaff()) items.push({ id: 'orgs', ic: '🏛️', t: T('Tashkilotlar') });
  if (isStaff() || isHead()) items.push({ id: 'staff', ic: '👥', t: T('Xodimlar') });
  items.push({ id: 'events', ic: '🧹', t: T('Tozalash aksiyalari') });
  items.push({ id: 'templates', ic: '📝', t: T('Javob shablonlari') });
  items.push({ id: 'journal', ic: '🧾', t: T('Faoliyat jurnali') });
  if (me().role === 'admin') items.push({ id: 'settings', ic: '⚙️', t: T('Sozlamalar') });
  return items;
}
function renderShell() {
  const m = me(), org = m.org_id ? orgById(m.org_id) : null;
  $('#app').innerHTML = `<div class="shell">
    <aside class="side" id="side">
      <div class="side-brand"><span class="logo">🌿</span><div>EKO-MUROJAAT<small>${esc(T('Idoralar portali'))}</small></div></div>
      <div class="side-org"><b>${esc(org ? (org.short_name || org.name) : T('Ekologiya vazirligi'))}</b><span>${esc(roleT(m.role))}</span></div>
      <nav class="nav" id="nav"></nav>
      <div class="side-foot">${esc(T('Ma’lumotlar'))}: ${S.store.mode === 'demo' ? esc(T('demo (brauzerda)')) : 'Supabase'}<br>bbecoplatform.uz</div>
    </aside>
    <div class="main">
      <header class="top">
        <button class="icon-btn burger" id="burger" aria-label="${esc(T('Menyu'))}">☰</button>
        <label class="search"><span class="si">🔍</span><input class="input" id="gSearch" type="search" placeholder="${esc(T('Ariza raqami, manzil yoki matn bo‘yicha qidirish'))}" autocomplete="off"><kbd>/</kbd></label>
        <div class="top-actions">
          ${langSwitch()}
          <button class="icon-btn" id="themeBtn" title="${esc(T('Mavzu'))}" aria-label="${esc(T('Mavzu'))}">🌓</button>
          <div class="rel"><button class="icon-btn" id="bellBtn" aria-label="${esc(T('Bildirishnomalar'))}">🔔<span class="badge" id="bellBadge" hidden></span></button></div>
          <div class="rel"><button class="user-btn" id="userBtn"><span class="avatar">${esc(initials(m.full_name))}</span><div class="uinfo"><b>${esc(m.full_name || m.email)}</b><span>${esc(m.position || roleT(m.role))}</span></div></button></div>
        </div>
      </header>
      ${S.store.mode === 'demo' ? `<div class="demo-bar">🧪 <b>${esc(T('Demo rejim'))}</b><span>${esc(T('Namunaviy ma’lumotlar. Haqiqiy arizalar uchun Supabase’ni ulang.'))}</span>
        <label class="check small" style="margin-left:auto"><input type="checkbox" id="simChk" ${S.sim ? 'checked' : ''}> ${esc(T('Fuqarolardan yangi ariza kelishini taqlid qilish'))}</label>
        <button class="btn btn-sm" id="simNow">${esc(T('Hozir bitta ariza yuborish'))}</button></div>` : ''}
      <main class="page" id="page"></main>
    </div></div>`;
  renderNav();
  bindLang();
  $('#burger').onclick = () => toggleSide(true);
  $('#themeBtn').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    safeLS.set('eko_portal_theme', cur === 'dark' ? 'light' : 'dark'); applyTheme(); if (S.route.page === 'map' || S.route.page === 'report') route(true);
  };
  $('#bellBtn').onclick = e => { e.stopPropagation(); toggleBell(); };
  $('#userBtn').onclick = e => { e.stopPropagation(); toggleUserMenu(); };
  const gs = $('#gSearch');
  gs.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const q = gs.value.trim(); if (!q) return;
    const hit = S.data.reports.find(r => r.case_no.toLowerCase() === q.toLowerCase() || r.case_no.toLowerCase() === ('eco-' + q.replace(/\D/g, '').padStart(6, '0')).toLowerCase());
    go(hit ? '#/report/' + hit.id : '#/inbox?view=all&q=' + encodeURIComponent(q));
  };
  if ($('#simChk')) {
    $('#simChk').onchange = e => { S.sim = e.target.checked; safeLS.set('eko_portal_sim', S.sim); S.sim ? S.store.startSim() : S.store.stopSim(); };
    $('#simNow').onclick = () => S.store.simulateIncoming(isAgent() ? me().org_id : null);
  }
  document.addEventListener('click', closeDropdowns);
  refreshBadges();
}
function renderNav() {
  const cur = S.route.page, q = new URLSearchParams(location.hash.split('?')[1] || '');
  $('#nav').innerHTML = navItems().map(it => {
    if (it.sec) return `<div class="nav-sec">${esc(it.sec)}</div>`;
    const href = '#/' + it.id + (it.q ? '?' + it.q : '');
    const view = it.q ? new URLSearchParams(it.q).get('view') : null;
    const on = cur === it.id && (it.id !== 'inbox' || (view ? q.get('view') === view : !['mine', 'overdue', 'unrouted'].includes(q.get('view'))));
    return `<a href="${href}" class="${on ? 'on' : ''}"><span class="ni">${it.ic}</span>${esc(it.t)}${it.badge ? `<span class="badge">${it.badge > 99 ? '99+' : it.badge}</span>` : it.cnt ? `<span class="cnt">${it.cnt}</span>` : ''}</a>`;
  }).join('');
  $$('#nav a').forEach(a => a.addEventListener('click', () => toggleSide(false)));
}
function toggleSide(open) {
  const s = $('#side'); if (!s) return;
  s.classList.toggle('open', open);
  const sc = $('.side-scrim');
  if (open && !sc) { const d = document.createElement('div'); d.className = 'side-scrim'; d.onclick = () => toggleSide(false); document.body.appendChild(d); }
  if (!open && sc) sc.remove();
}
function closeDropdowns() { $$('.dropdown').forEach(d => d.remove()); }

// Bildirishnomalar: menga tegishli yangi voqealar
function notifications() {
  const m = me(), out = [], R = S.data.reports;
  R.forEach(r => {
    if (r.cancelled) return;
    if (r.status === 0 && (isStaff() ? !r.org_id || true : isHead()) && r.created_at > S.seenAt) out.push({ at: r.created_at, r, ic: '📥', t: T('Yangi murojaat: {n}', { n: r.case_no }), s: catT(r.category) + ' · ' + regT(r.region) });
    if (r.assignee_id === m.id && isOpen(r)) {
      const h = S.data.history.filter(x => x.report_id === r.id && x.event === 'assigned').sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0];
      if (h) out.push({ at: h.created_at, r, ic: '🧑‍💼', t: T('Sizga biriktirildi: {n}', { n: r.case_no }), s: catT(r.category) + ' · ' + dueLabel(r).t });
    }
    if ((isHead() || isStaff() || r.assignee_id === m.id) && isOpen(r)) {
      const h = hoursLeft(r);
      if (h !== null && h < 0 && (r.assignee_id === m.id || isHead())) out.push({ at: r.deadline_at, r, ic: '⏰', t: T('Muddati o‘tdi: {n}', { n: r.case_no }), s: dueLabel(r).t, warn: true });
      else if (h !== null && h >= 0 && h < 24 && (r.assignee_id === m.id || isHead())) out.push({ at: new Date(Date.now() - 1).toISOString(), r, ic: '⌛', t: T('Muddat tugayapti: {n}', { n: r.case_no }), s: dueLabel(r).t, warn: true });
    }
  });
  return out.sort((a, b) => a.at < b.at ? 1 : -1).slice(0, 40);
}
function refreshBadges() {
  if (!$('#bellBadge')) return;
  const n = notifications().filter(x => x.at > S.notifSeen).length;
  const b = $('#bellBadge'); b.hidden = !n; b.textContent = n > 99 ? '99+' : n;
  renderNav();
}
function toggleBell() {
  if ($('#bellDrop')) return closeDropdowns();
  closeDropdowns();
  const list = notifications();
  const d = document.createElement('div'); d.className = 'dropdown'; d.id = 'bellDrop';
  d.innerHTML = `<div class="dh">${esc(T('Bildirishnomalar'))}<button class="btn btn-sm btn-ghost" id="nAll">${esc(T('Hammasini o‘qildi deb belgilash'))}</button></div>
    <div class="dl">${list.length ? list.map((x, i) => `<div class="di ${x.at > S.notifSeen ? 'unread' : ''}" data-i="${i}"><span class="ic">${x.ic}</span><div><b>${esc(x.t)}</b><div class="muted small">${esc(x.s)} · ${esc(ago(x.at))}</div></div></div>`).join('') : `<div class="empty">${esc(T('Yangi bildirishnoma yo‘q'))}</div>`}</div>`;
  d.onclick = e => e.stopPropagation();
  $('#bellBtn').parentNode.appendChild(d);
  $$('.di', d).forEach(el => el.onclick = () => { closeDropdowns(); go('#/report/' + list[+el.dataset.i].r.id); });
  $('#nAll').onclick = () => { S.notifSeen = new Date().toISOString(); safeLS.set('eko_portal_nseen_' + me().id, S.notifSeen); closeDropdowns(); refreshBadges(); };
}
function toggleUserMenu() {
  if ($('#userDrop')) return closeDropdowns();
  closeDropdowns();
  const m = me(), d = document.createElement('div'); d.className = 'dropdown'; d.id = 'userDrop'; d.style.width = '280px';
  d.innerHTML = `<div class="dh" style="flex-direction:column; align-items:flex-start; gap:2px"><span>${esc(m.full_name || '')}</span><span class="muted small" style="font-weight:500">${esc(m.email || '')} · ${esc(roleT(m.role))}</span></div>
    <button class="menu-i" id="mSound">${S.sound ? '🔔' : '🔕'} ${esc(S.sound ? T('Ovozli signal yoqilgan') : T('Ovozli signal o‘chirilgan'))}</button>
    ${S.store.mode === 'demo' ? `<button class="menu-i" id="mSwitch">🔁 ${esc(T('Boshqa demo hisobga o‘tish'))}</button><button class="menu-i" id="mReset">♻️ ${esc(T('Demo ma’lumotlarni qayta tiklash'))}</button>` : ''}
    <button class="menu-i" id="mOut" style="color:var(--danger)">⎋ ${esc(T('Chiqish'))}</button>`;
  d.onclick = e => e.stopPropagation();
  $('#userBtn').parentNode.appendChild(d);
  $('#mSound').onclick = () => { S.sound = !S.sound; safeLS.set('eko_portal_sound', S.sound); closeDropdowns(); if (S.sound) beep(); toast(S.sound ? T('Ovozli signal yoqildi') : T('Ovozli signal o‘chirildi')); };
  $('#mOut').onclick = logout;
  if ($('#mSwitch')) $('#mSwitch').onclick = logout;
  if ($('#mReset')) $('#mReset').onclick = async () => { closeDropdowns(); if (await confirmBox(T('Demo ma’lumotlarni qayta tiklash'), T('Siz kiritgan barcha o‘zgarishlar o‘chadi va boshlang‘ich namunaviy ma’lumotlar qaytadi.'), T('Qayta tiklash'), true)) { S.store.reset(); S.data = await S.store.load(); toast(T('Demo ma’lumotlar qayta tiklandi')); route(true); refreshBadges(); } };
}
async function logout() {
  closeDropdowns(); S.store.stopSim();
  safeLS.set('eko_portal_seen_' + me().id, new Date().toISOString());
  await S.store.logout(); S.me = null; S.data = null; location.hash = ''; renderLogin();
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------
function go(h) { if (location.hash === h) route(); else location.hash = h; }
function route(soft) {
  if (!S.data) return;
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [page, id] = path.split('/');
  const prevPage = S.route.page;
  S.route = { page: page || 'dashboard', id: id ? decodeURIComponent(id) : null, q: Object.fromEntries(new URLSearchParams(qs || '')) };
  if (!soft) { S.sel.clear(); if (prevPage !== S.route.page) S.page = 0; }
  renderNav(); tip(null);
  const P = PAGES[S.route.page] || PAGES.dashboard;
  const el = $('#page'); if (!el) return;
  const y = window.scrollY;
  Object.values(S.maps).forEach(m => { try { m.remove(); } catch (e) { } }); S.maps = {};
  const done = () => {
    document.title = (document.querySelector('.page-head h1') || { textContent: '' }).textContent + ' · EKO-MUROJAAT';
    window.scrollTo(0, soft ? y : 0);
  };
  const res = P(el);
  if (res && res.then) res.then(done, done); else done();
}

// =====================================================================
// SAHIFALAR
// =====================================================================
const PAGES = {};

// ---------- Bosh sahifa ----------
PAGES.dashboard = el => {
  const R = S.data.reports, m = me();
  const act = R.filter(r => !r.cancelled);
  const since30 = Date.now() - 30 * DAY;
  const closed30 = act.filter(r => r.resolved_at && new Date(r.resolved_at) > since30);
  const ontime = closed30.filter(r => onTime(r) !== false).length;
  const avgDays = closed30.length ? closed30.reduce((s, r) => s + (new Date(r.resolved_at) - new Date(r.created_at)) / DAY, 0) / closed30.length : 0;
  const k = {
    nw: act.filter(r => r.status === 0).length,
    work: act.filter(r => r.status === 1 || r.status === 2).length,
    over: act.filter(isOverdue).length,
    soon: act.filter(r => isOpen(r) && hoursLeft(r) >= 0 && hoursLeft(r) < 48).length,
    today: act.filter(r => dayKey(r.created_at) === dayKey(Date.now())).length,
    done30: closed30.length
  };
  const hello = new Date().getHours() < 12 ? T('Xayrli tong') : new Date().getHours() < 18 ? T('Xayrli kun') : T('Xayrli kech');
  const kpi = (l, v, s, c, href, alert) => `<a class="kpi ${alert ? 'alert' : ''}" style="--c:${c}" href="${href}"><span class="kl">${esc(l)}</span><span class="kv">${typeof v === 'number' ? nf(v) : esc(v)}</span><span class="ks">${esc(s)}</span></a>`;
  const myTasks = isAgent() ? R.filter(r => r.assignee_id === m.id && isOpen(r)).sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at)) : [];
  const urgent = act.filter(r => isOpen(r)).sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at)).slice(0, 7);
  const latest = R.slice().sort((a, b) => a.created_at < b.created_at ? 1 : -1).slice(0, 7);
  el.innerHTML = `
    <div class="page-head"><div><h1>${esc(hello)}, ${esc((m.full_name || '').split(' ')[0])}</h1><p>${esc(T('Bugun {d}. Sizning hududingizdagi murojaatlar holati.', { d: fmtD(Date.now()) }))}</p></div>
      <div class="row"><a class="btn" href="#/inbox?view=all">📋 ${esc(T('Barcha arizalar'))}</a><a class="btn btn-primary" href="#/inbox?view=new">📥 ${esc(T('Yangilarini ko‘rish'))} (${k.nw})</a></div></div>
    <div class="kpis">
      ${kpi(T('Yangi, ko‘rilmagan'), k.nw, T('bugun {n} ta keldi', { n: k.today }), 'var(--s0)', '#/inbox?view=new')}
      ${kpi(T('Ijroda'), k.work, T('ko‘rib chiqilmoqda va ijroda'), 'var(--s2)', '#/inbox?view=work')}
      ${kpi(T('Muddati o‘tgan'), k.over, T('zudlik bilan hal qilish kerak'), 'var(--danger)', '#/inbox?view=overdue', k.over > 0)}
      ${kpi(T('48 soatda muddati tugaydi'), k.soon, T('nazoratga oling'), 'var(--warn)', '#/inbox?view=soon')}
      ${kpi(T('30 kunda hal qilindi'), k.done30, T('o‘rtacha {n} kunda', { n: avgDays.toFixed(1) }), 'var(--s3)', '#/inbox?view=closed')}
      ${kpi(T('O‘z vaqtida ijro'), pct(ontime, closed30.length) + '%', T('oxirgi 30 kun'), 'var(--accent)', '#/control')}
    </div>
    <div class="dash">
      <div class="col">
        ${isAgent() ? `<div class="card"><div class="card-h"><h3>🧑‍💼 ${esc(T('Mening topshiriqlarim'))}</h3><span class="chip">${myTasks.length}</span><div class="row"><a class="btn btn-sm" href="#/inbox?view=mine">${esc(T('Hammasi'))} →</a></div></div>${miniTable(myTasks.slice(0, 6), T('Sizga biriktirilgan ochiq ariza yo‘q'))}</div>` : ''}
        <div class="card"><div class="card-h"><h3>📈 ${esc(T('Oxirgi 30 kun: kelgan va hal qilingan'))}</h3><div class="row legend"><span><i style="background:var(--series-1)"></i>${esc(T('Kelgan'))}</span><span><i style="background:var(--series-2)"></i>${esc(T('Hal qilingan'))}</span></div></div><div class="card-b"><div class="chart" id="trend"></div></div></div>
        <div class="card"><div class="card-h"><h3>⏳ ${esc(T('Muddati yaqin va o‘tgan arizalar'))}</h3><div class="row"><a class="btn btn-sm" href="#/inbox?view=overdue">${esc(T('Muddati o‘tganlar'))} →</a></div></div>${miniTable(urgent, T('Ochiq ariza yo‘q'))}</div>
      </div>
      <div class="col">
        <div class="card"><div class="card-h"><h3>🧩 ${esc(T('Holatlar bo‘yicha'))}</h3></div><div class="card-b" id="donut"></div></div>
        <div class="card"><div class="card-h"><h3>🏷️ ${esc(T('Muammo turlari (ochiq)'))}</h3></div><div class="card-b" id="cats"></div></div>
        <div class="card"><div class="card-h"><h3>🆕 ${esc(T('So‘nggi murojaatlar'))}</h3></div><div class="card-b" style="padding:6px 16px">${latest.map(r => `<a href="#/report/${r.id}" style="display:flex; gap:10px; padding:9px 0; border-bottom:1px solid var(--line); color:inherit; text-decoration:none"><span style="font-size:20px">${catOf(r.category).icon}</span><div style="min-width:0; flex:1"><div class="row" style="gap:6px"><b class="num">${esc(r.case_no)}</b>${statusChip(r)}</div><div class="muted small" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${esc(regT(r.region))} · ${esc(ago(r.created_at))}</div></div></a>`).join('')}</div></div>
      </div>
    </div>`;
  // trend
  const days = 30, start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - days + 1);
  const keys = Array.from({ length: days }, (_, i) => dayKey(start.getTime() + i * DAY));
  const inc = Object.fromEntries(keys.map(x => [x, 0])), res = Object.fromEntries(keys.map(x => [x, 0]));
  R.forEach(r => { const a = dayKey(r.created_at); if (a in inc) inc[a]++; if (r.resolved_at) { const b = dayKey(r.resolved_at); if (b in res) res[b]++; } });
  lineChart($('#trend'), keys, [{ name: T('Kelgan'), c: 'var(--series-1)', v: keys.map(x => inc[x]) }, { name: T('Hal qilingan'), c: 'var(--series-2)', v: keys.map(x => res[x]) }]);
  donut($('#donut'), STATUSES.map(s => ({ label: T(s.t), v: act.filter(r => r.status === s.k).length, c: s.c, href: '#/inbox?view=all&status=' + s.k })));
  bars($('#cats'), CATEGORIES.map(c => ({ label: c.icon + ' ' + T(c.t), v: act.filter(r => isOpen(r) && r.category === c.k).length, href: '#/inbox?view=open&cat=' + encodeURIComponent(c.k) })).sort((a, b) => b.v - a.v));
  // ko'rilgan vaqt
  safeLS.set('eko_portal_seen_' + m.id, new Date().toISOString());
};
function miniTable(list, emptyT) {
  if (!list.length) return `<div class="empty"><div class="ei">✅</div>${esc(emptyT)}</div>`;
  return `<div class="tbl-wrap"><table class="tbl cards-sm"><tbody>${list.map(r => { const d = dueLabel(r); return `<tr data-go="${r.id}" class="${isOverdue(r) ? 'overdue' : ''}"><td class="cno">${esc(r.case_no)}</td><td><div class="desc"><span title="${esc(catT(r.category))}">${catOf(r.category).icon}</span> ${esc(r.description)}</div><div class="muted small">${esc(catT(r.category))} · ${esc(regT(r.region))}</div></td><td>${statusChip(r)}</td><td><span class="due ${d.cls}">${esc(d.t)}</span></td></tr>`; }).join('')}</tbody></table></div>`;
}
document.addEventListener('click', e => { const tr = e.target.closest('[data-go]'); if (tr && !e.target.closest('input,button,a')) go('#/report/' + tr.dataset.go); });

// ---------- Kiruvchi arizalar ----------
const VIEWS = [
  { k: 'new', t: 'Yangi', f: r => !r.cancelled && r.status === 0 },
  { k: 'mine', t: 'Menga biriktirilgan', f: r => r.assignee_id === S.me.id && isOpen(r), agent: true },
  { k: 'unassigned', t: 'Ijrochisiz', f: r => isOpen(r) && r.org_id && !r.assignee_id, head: true },
  { k: 'unrouted', t: 'Taqsimlanmagan', f: r => isOpen(r) && !r.org_id, staff: true },
  { k: 'work', t: 'Ijroda', f: r => !r.cancelled && (r.status === 1 || r.status === 2) },
  { k: 'soon', t: 'Muddati yaqin', f: r => isOpen(r) && hoursLeft(r) >= 0 && hoursLeft(r) < 48 },
  { k: 'overdue', t: 'Muddati o‘tgan', f: isOverdue, warn: true },
  { k: 'open', t: 'Ochiq', f: isOpen, hidden: true },
  { k: 'closed', t: 'Yopilgan', f: isClosed },
  { k: 'all', t: 'Hammasi', f: () => true }
];
function viewsFor() { return VIEWS.filter(v => !v.hidden && (!v.agent || isAgent()) && (!v.head || isHead() || isStaff()) && (!v.staff || isStaff())); }
function filteredReports() {
  const q = S.route.q, v = VIEWS.find(x => x.k === (q.view || 'new')) || VIEWS[0];
  let L = S.data.reports.filter(v.f);
  if (q.status !== undefined && q.status !== '') L = L.filter(r => String(r.status) === q.status && !r.cancelled);
  if (q.cat) L = L.filter(r => r.category === q.cat);
  if (q.region) L = L.filter(r => r.region === q.region);
  if (q.org) L = L.filter(r => (q.org === 'none' ? !r.org_id : r.org_id === q.org));
  if (q.asg) L = L.filter(r => (q.asg === 'none' ? !r.assignee_id : r.assignee_id === q.asg));
  if (q.prio) L = L.filter(r => String(r.priority) === q.prio);
  if (q.from) L = L.filter(r => r.created_at >= q.from);
  if (q.to) L = L.filter(r => r.created_at <= q.to + 'T23:59:59');
  if (q.q) { const s = q.q.toLowerCase(); L = L.filter(r => [r.case_no, r.description, r.address, r.citizen && r.citizen.name, regT(r.region)].some(x => String(x || '').toLowerCase().includes(s))); }
  const k = S.sort.k, d = S.sort.d;
  const val = r => k === 'deadline_at' ? (isOpen(r) ? new Date(r.deadline_at).getTime() : 9e15) : k === 'priority' ? r.priority * 1e13 + new Date(r.created_at).getTime() : k === 'status' ? r.status : r[k] || '';
  L.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * d);
  return L;
}
function setQ(patch) {
  const q = Object.assign({}, S.route.q, patch);
  Object.keys(q).forEach(k => { if (q[k] === '' || q[k] == null) delete q[k]; });
  S.page = 0;
  go('#/inbox?' + new URLSearchParams(q).toString());
}
PAGES.inbox = el => {
  const q = S.route.q; if (!q.view) q.view = 'new';
  const L = filteredReports();
  const pages = Math.max(1, Math.ceil(L.length / S.perPage)); if (S.page >= pages) S.page = pages - 1;
  const slice = L.slice(S.page * S.perPage, (S.page + 1) * S.perPage);
  const counts = Object.fromEntries(VIEWS.map(v => [v.k, S.data.reports.filter(v.f).length]));
  const orgOpts = S.data.orgs.filter(o => !o.central).map(o => `<option value="${o.id}" ${q.org === o.id ? 'selected' : ''}>${esc(o.short_name || o.name)}</option>`).join('');
  const staffOpts = S.data.profiles.filter(p => isAgentRole(p.role) && (isStaff() || p.org_id === me().org_id)).map(p => `<option value="${p.id}" ${q.asg === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('');
  const th = (k, t, cls) => `<th class="sortable ${cls || ''}" data-sort="${k}">${esc(t)}${S.sort.k === k ? (S.sort.d > 0 ? ' ↑' : ' ↓') : ''}</th>`;
  const vt = (VIEWS.find(v => v.k === q.view) || VIEWS[0]).t;
  el.innerHTML = `
    <div class="page-head"><div><div class="crumbs"><a href="#/dashboard">${esc(T('Bosh sahifa'))}</a> / ${esc(T('Kiruvchi arizalar'))}</div><h1>${esc(T(vt))}</h1><p>${esc(T('{n} ta ariza topildi', { n: nf(L.length) }))}</p></div>
      <div class="row"><button class="btn" id="csvBtn">⬇️ ${esc(T('Excel (CSV)'))}</button></div></div>
    <div class="card">
      <div class="views">${viewsFor().map(v => `<button data-view="${v.k}" class="${q.view === v.k ? 'on' : ''} ${v.warn ? 'warnv' : ''}">${esc(T(v.t))}<span class="n">${counts[v.k]}</span></button>`).join('')}</div>
      <div class="toolbar">
        <input class="input search-in" id="fq" type="search" placeholder="${esc(T('Qidirish: raqam, manzil, matn, fuqaro'))}" value="${esc(q.q || '')}">
        <select id="fcat"><option value="">${esc(T('Barcha turlar'))}</option>${CATEGORIES.map(c => `<option value="${c.k}" ${q.cat === c.k ? 'selected' : ''}>${c.icon} ${esc(T(c.t))}</option>`).join('')}</select>
        <select id="fstatus"><option value="">${esc(T('Barcha holatlar'))}</option>${STATUSES.map(s => `<option value="${s.k}" ${q.status === String(s.k) ? 'selected' : ''}>${esc(T(s.t))}</option>`).join('')}</select>
        <select id="fregion"><option value="">${esc(T('Barcha hududlar'))}</option>${REGIONS.map(r => `<option value="${r.code}" ${q.region === r.code ? 'selected' : ''}>${esc(T(r.uz))}</option>`).join('')}</select>
        ${isStaff() ? `<select id="forg"><option value="">${esc(T('Barcha idoralar'))}</option><option value="none" ${q.org === 'none' ? 'selected' : ''}>${esc(T('Taqsimlanmagan'))}</option>${orgOpts}</select>` : ''}
        ${isStaff() || isHead() ? `<select id="fasg"><option value="">${esc(T('Barcha ijrochilar'))}</option><option value="none" ${q.asg === 'none' ? 'selected' : ''}>${esc(T('Ijrochisiz'))}</option>${staffOpts}</select>` : ''}
        <select id="fprio"><option value="">${esc(T('Har qanday muhimlik'))}</option>${PRIORITIES.map(p => `<option value="${p.k}" ${q.prio === String(p.k) ? 'selected' : ''}>${esc(T(p.t))}</option>`).join('')}</select>
        <input class="input" type="date" id="ffrom" value="${esc(q.from || '')}" title="${esc(T('Sanadan'))}"><input class="input" type="date" id="fto" value="${esc(q.to || '')}" title="${esc(T('Sanagacha'))}">
        ${Object.keys(q).some(k => k !== 'view') ? `<button class="btn btn-sm btn-ghost" id="fclear">✕ ${esc(T('Tozalash'))}</button>` : ''}
      </div>
      <div id="bulk"></div>
      <div class="tbl-wrap"><table class="tbl cards-sm">
        <thead><tr><th class="chk"><input type="checkbox" id="selAll" aria-label="${esc(T('Hammasini tanlash'))}"></th>${th('case_no', T('Raqam'))}${th('created_at', T('Kelgan'))}<th>${esc(T('Muammo'))}</th><th>${esc(T('Hudud'))}</th>${isStaff() ? `<th>${esc(T('Idora'))}</th>` : ''}<th>${esc(T('Ijrochi'))}</th>${th('status', T('Holat'))}${th('deadline_at', T('Muddat'))}</tr></thead>
        <tbody>${slice.map(r => rowHtml(r)).join('') || `<tr><td colspan="9"><div class="empty"><div class="ei">🗂️</div>${esc(T('Bu ro‘yxatda ariza yo‘q'))}</div></td></tr>`}</tbody>
      </table></div>
      <div class="pager"><span>${esc(T('{a}–{b} / {n}', { a: L.length ? S.page * S.perPage + 1 : 0, b: Math.min(L.length, (S.page + 1) * S.perPage), n: L.length }))}</span>
        <div class="row"><select class="input" id="perPage" style="height:32px; width:auto">${[25, 50, 100].map(n => `<option ${S.perPage === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn btn-sm" id="pPrev" ${S.page ? '' : 'disabled'}>←</button><span>${S.page + 1} / ${pages}</span><button class="btn btn-sm" id="pNext" ${S.page < pages - 1 ? '' : 'disabled'}>→</button></div></div>
    </div>`;
  $$('[data-view]').forEach(b => b.onclick = () => setQ({ view: b.dataset.view, status: '' }));
  $('#fq').oninput = debounce(e => setQ({ q: e.target.value.trim() }), 350);
  [['fcat', 'cat'], ['fstatus', 'status'], ['fregion', 'region'], ['forg', 'org'], ['fasg', 'asg'], ['fprio', 'prio'], ['ffrom', 'from'], ['fto', 'to']].forEach(([id, k]) => { const e = $('#' + id); if (e) e.onchange = () => setQ({ [k]: e.value }); });
  if ($('#fclear')) $('#fclear').onclick = () => go('#/inbox?view=' + q.view);
  $$('[data-sort]').forEach(h => h.onclick = () => { const k = h.dataset.sort; S.sort = { k, d: S.sort.k === k ? -S.sort.d : (k === 'deadline_at' ? 1 : -1) }; route(true); });
  $('#perPage').onchange = e => { S.perPage = +e.target.value; S.page = 0; route(true); };
  $('#pPrev').onclick = () => { S.page--; route(); };
  $('#pNext').onclick = () => { S.page++; route(); };
  $('#csvBtn').onclick = () => exportCsv(L, 'arizalar');
  const fq = $('#fq'); if (q.q && document.activeElement !== fq) { fq.focus(); fq.setSelectionRange(fq.value.length, fq.value.length); }
  // tanlash
  const upd = () => {
    $$('.rowchk').forEach(c => { c.checked = S.sel.has(c.value); });
    $('#selAll').checked = slice.length > 0 && slice.every(r => S.sel.has(r.id));
    renderBulk();
  };
  $$('.rowchk').forEach(c => c.onchange = () => { c.checked ? S.sel.add(c.value) : S.sel.delete(c.value); upd(); });
  $('#selAll').onchange = e => { slice.forEach(r => e.target.checked ? S.sel.add(r.id) : S.sel.delete(r.id)); upd(); };
  upd();
};
function rowHtml(r) {
  const d = dueLabel(r), unread = r.status === 0 && !r.cancelled && !S.readSet.has(r.id);
  return `<tr data-go="${r.id}" class="${isOverdue(r) ? 'overdue' : ''} ${unread ? 'unread' : ''}">
    <td class="chk"><input type="checkbox" class="rowchk" value="${r.id}" aria-label="${esc(r.case_no)}"></td>
    <td><span class="cno">${esc(r.case_no)}</span><div class="row" style="gap:4px; margin-top:3px">${prioChip(r)}${r.media_type === 'image' ? '<span class="tiny muted" title="' + esc(T('Surat bor')) + '">📷</span>' : ''}</div></td>
    <td class="nowrap"><div>${esc(fmtD(r.created_at))}</div><div class="muted tiny">${esc(ago(r.created_at))}</div></td>
    <td>${catChip(r)}<div class="desc" style="margin-top:4px">${unread ? '<b>' : ''}${esc(r.description)}${unread ? '</b>' : ''}</div></td>
    <td class="hide-sm"><div>${esc(regT(r.region))}</div><div class="muted tiny">${esc(r.address || '')}</div></td>
    ${isStaff() ? `<td class="hide-sm">${r.org_id ? esc(orgShort(r.org_id)) : `<span class="chip chip-warn">${esc(T('Taqsimlanmagan'))}</span>`}</td>` : ''}
    <td class="hide-sm">${r.assignee_id ? esc(personName(r.assignee_id)) : '<span class="muted">—</span>'}</td>
    <td>${statusChip(r)}</td>
    <td><span class="due ${d.cls}">${esc(d.t)}</span><div class="muted tiny">${esc(fmtD(r.deadline_at))}</div></td></tr>`;
}
function renderBulk() {
  const box = $('#bulk'); if (!box) return;
  const ids = Array.from(S.sel), list = ids.map(repById).filter(Boolean);
  if (!list.length) { box.innerHTML = ''; return; }
  const can = list.every(canAssign);
  box.innerHTML = `<div class="bulk"><b>${esc(T('{n} ta tanlandi', { n: list.length }))}</b>
    ${can && (isHead() || isStaff()) ? `<button class="btn btn-sm" id="bAssign">🧑‍💼 ${esc(T('Ijrochiga biriktirish'))}</button>` : ''}
    ${can && (isStaff() || isHead()) ? `<button class="btn btn-sm" id="bFwd">↪️ ${esc(T('Idoraga yo‘naltirish'))}</button>` : ''}
    ${list.every(r => canWork(r) && r.status === 0) ? `<button class="btn btn-sm" id="bAccept">✔️ ${esc(T('Ko‘rib chiqishga qabul qilish'))}</button>` : ''}
    <button class="btn btn-sm" id="bCsv">⬇️ CSV</button>
    <button class="btn btn-sm btn-ghost" id="bClear">${esc(T('Bekor qilish'))}</button></div>`;
  if ($('#bAssign')) $('#bAssign').onclick = () => assignDialog(list);
  if ($('#bFwd')) $('#bFwd').onclick = () => forwardDialog(list);
  if ($('#bAccept')) $('#bAccept').onclick = () => runMany(list, r => S.store.updateReport(r.id, { status: 1 }), T('{n} ta ariza qabul qilindi'));
  $('#bCsv').onclick = () => exportCsv(list, 'tanlangan-arizalar');
  $('#bClear').onclick = () => { S.sel.clear(); route(true); };
}
async function runMany(list, fn, okT) {
  let ok = 0; const errs = [];
  for (const r of list) { try { await fn(r); ok++; } catch (e) { errs.push(r.case_no + ': ' + T(e.message)); } }
  S.sel.clear();
  S.data = await S.store.load();
  if (ok) toast(T(okT, { n: ok }));
  if (errs.length) toast(errs.slice(0, 3).join('\n'), 'err');
  route(true); refreshBadges();
}
function exportCsv(list, name) {
  const head = [T('Raqam'), T('Kelgan sana'), T('Toifa'), T('Muhimlik'), T('Hudud'), T('Manzil'), T('Tavsif'), T('Idora'), T('Ijrochi'), T('Holat'), T('Muddat'), T('Hal qilingan sana'), T('Muddatda'), T('Fuqaroga javob')];
  const rows = list.map(r => [r.case_no, fmtDT(r.created_at), catT(r.category), prioT(r.priority), regT(r.region), r.address || '', r.description, r.org_id ? orgShort(r.org_id) : '', r.assignee_id ? personName(r.assignee_id) : '', r.cancelled ? T('Bekor qilingan') : stT(r.status), fmtD(r.deadline_at), fmtD(r.resolved_at), onTime(r) === null ? '' : onTime(r) ? T('ha') : T('yo‘q'), r.admin_note || '']);
  downloadCsv([head].concat(rows), name);
}
function downloadCsv(rows, name) {
  const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '-' + dayKey(Date.now()) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(T('Fayl yuklab olindi: {n} qator', { n: rows.length - 1 }));
}

// ---------- Ariza kartasi ----------
PAGES.report = async el => {
  const r = repById(S.route.id);
  if (!r) { el.innerHTML = `<div class="empty"><div class="ei">🔎</div>${esc(T('Ariza topilmadi yoki uni ko‘rishga ruxsatingiz yo‘q.'))}<p><a class="btn" href="#/inbox">${esc(T('Arizalar ro‘yxatiga qaytish'))}</a></p></div>`; return; }
  if (!S.readSet.has(r.id)) { S.readSet.add(r.id); safeLS.set('eko_portal_read_' + me().id, Array.from(S.readSet).slice(-2000)); }
  const hist = S.data.history.filter(h => h.report_id === r.id);
  const d = dueLabel(r), h = hoursLeft(r);
  const slaCls = r.cancelled ? '' : r.status >= 3 ? (onTime(r) === false ? 'late' : 'done') : h < 0 ? 'late' : h < 48 ? 'soon' : '';
  const slaBig = r.cancelled ? '—' : r.status >= 3 ? (onTime(r) === false ? T('Kechikkan') : T('Muddatida')) : h < 0 ? T('{n} kun', { n: Math.ceil(-h / 24) }) : h < 48 ? T('{n} soat', { n: Math.floor(h) }) : T('{n} kun', { n: Math.floor(h / 24) });
  const slaSmall = r.cancelled ? T('Fuqaro arizani bekor qilgan') : r.status >= 3 ? T('Yopilgan: {d}', { d: fmtDT(r.resolved_at) }) : h < 0 ? T('muddat o‘tib ketdi ({d})', { d: fmtD(r.deadline_at) }) : T('muddat: {d}', { d: fmtDT(r.deadline_at) });
  const work = canWork(r);
  const step = r.cancelled ? -1 : r.status;
  el.innerHTML = `
    <div class="crumbs"><a href="#/inbox">${esc(T('Kiruvchi arizalar'))}</a> / ${esc(r.case_no)}</div>
    <div class="rp-head" style="margin-bottom:16px"><div style="flex:1; min-width:260px"><h1>${catOf(r.category).icon} ${esc(r.case_no)} · ${esc(catT(r.category))}</h1>
      <div class="rp-meta">${statusChip(r)}${prioChip(r)}<span class="chip">📍 ${esc(regT(r.region))}</span><span class="chip">🕒 ${esc(fmtDT(r.created_at))}</span>${r.extend_count ? `<span class="chip chip-warn">${esc(T('Muddat uzaytirilgan'))}</span>` : ''}</div></div>
      <div class="row"><button class="btn" id="printBtn">🖨️ ${esc(T('Javob xati'))}</button><button class="btn" id="copyBtn">🔗 ${esc(T('Havola'))}</button></div></div>
    <div class="rp">
      <div class="cards">
        <div class="card"><div class="card-h"><h3>📝 ${esc(T('Fuqaro murojaati'))}</h3>${r.edited_at ? `<span class="muted small">${esc(T('tahrirlangan'))} ${esc(fmtDT(r.edited_at))}</span>` : ''}</div><div class="card-b"><div class="desc-box">${esc(r.description)}</div></div></div>
        <div class="card"><div class="card-h"><h3>📷 ${esc(T('Suratlar'))}</h3></div><div class="card-b"><div class="photos" id="photos"><div class="photo none">${esc(T('Yuklanmoqda...'))}</div></div></div></div>
        <div class="card"><div class="card-h"><h3>📍 ${esc(T('Joylashuv'))}</h3>${r.lat ? `<div class="row"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${r.lat},${r.lng}">Google Maps ↗</a><a class="btn btn-sm" target="_blank" rel="noopener" href="https://yandex.uz/maps/?pt=${r.lng},${r.lat}&z=17&l=map">Yandex ↗</a></div>` : ''}</div>
          <div class="card-b"><dl class="kv"><dt>${esc(T('Hudud'))}</dt><dd>${esc(regT(r.region))}</dd><dt>${esc(T('Manzil'))}</dt><dd>${esc(r.address || r.location_text || '—')}</dd><dt>${esc(T('Koordinata'))}</dt><dd class="num">${r.lat ? `${r.lat.toFixed ? r.lat.toFixed(5) : r.lat}, ${r.lng.toFixed ? r.lng.toFixed(5) : r.lng}` : '—'}</dd></dl>
          ${r.lat ? '<div class="mini-map" id="miniMap" style="margin-top:12px"></div>' : ''}</div></div>
        ${r.admin_note ? `<div class="card"><div class="card-h"><h3>${r.reject_reason ? '⛔' : '✅'} ${esc(T('Fuqaroga berilgan javob'))}</h3><span class="muted small">${esc(T('fuqaro ilovada ko‘radi'))}</span></div><div class="card-b">${r.reject_reason ? `<p style="margin:0 0 8px"><b>${esc(T('Rad etish sababi'))}:</b> ${esc(r.reject_reason)}</p>` : ''}<div class="answer ${r.reject_reason ? 'rej' : ''}">${esc(r.admin_note)}</div></div></div>` : ''}
        <div class="card"><div class="card-h"><h3>🕓 ${esc(T('Ijro tarixi va ichki izohlar'))}</h3><span class="muted small">${esc(T('izohlarni fuqaro ko‘rmaydi'))}</span></div><div class="card-b">
          <ul class="tl" id="tl"></ul>
          ${!r.cancelled ? `<div class="cmt-form"><textarea class="input" id="cmt" placeholder="${esc(T('Ichki izoh yozing (masalan: joyiga chiqildi, dalolatnoma tuzildi)'))}"></textarea><button class="btn btn-primary" id="cmtBtn">${esc(T('Qo‘shish'))}</button></div>` : ''}
        </div></div>
      </div>
      <div class="side-panel">
        <div class="card"><div class="card-b" style="display:flex; flex-direction:column; gap:12px">
          <div><div class="steps">${STATUSES.map(s => `<i class="${step >= s.k ? 'on' : ''}" style="--c:${s.c}"></i>`).join('')}</div><div class="steps-l"><span>${esc(T('Yangi'))}</span><span>${esc(T('Ijroda'))}</span><span>${esc(T('Yopildi'))}</span></div></div>
          <div class="sla ${slaCls}"><div style="font-size:24px">⏱️</div><div><div class="big">${esc(slaBig)}</div><div class="small muted">${esc(slaSmall)}</div></div></div>
          <dl class="kv" style="grid-template-columns:110px 1fr">
            <dt>${esc(T('Idora'))}</dt><dd>${r.org_id ? esc(orgShort(r.org_id)) : `<span class="chip chip-warn">${esc(T('Taqsimlanmagan'))}</span>`}</dd>
            <dt>${esc(T('Ijrochi'))}</dt><dd>${r.assignee_id ? esc(personName(r.assignee_id)) : '<span class="muted">' + esc(T('biriktirilmagan')) + '</span>'}</dd>
            <dt>${esc(T('Muhimlik'))}</dt><dd>${esc(prioT(r.priority))}</dd>
            <dt>${esc(T('Muddat'))}</dt><dd>${esc(fmtDT(r.deadline_at))}${r.extend_count ? ` <span class="muted small">(${esc(T('uzaytirilgan'))})</span>` : ''}</dd>
            <dt>${esc(T('Qabul qilingan'))}</dt><dd>${esc(fmtDT(r.accepted_at))}</dd>
          </dl>
        </div></div>
        <div class="card"><div class="card-h"><h3>⚡ ${esc(T('Amallar'))}</h3></div><div class="card-b acts" id="acts"></div></div>
        <div class="card"><div class="card-h"><h3>👤 ${esc(T('Murojaatchi'))}</h3></div><div class="card-b">
          <div class="contact"><span class="avatar">${esc(initials(r.citizen && r.citizen.name || '?'))}</span><div><b>${esc(r.citizen && r.citizen.name || T('Anonim fuqaro'))}</b><div class="muted small num" id="phone">${esc(maskPhone(r.citizen && r.citizen.phone))}</div></div>
          ${r.citizen && r.citizen.phone ? `<button class="btn btn-sm" id="showPhone" style="margin-left:auto">${esc(T('Ko‘rsatish'))}</button>` : ''}</div>
          ${r.citizen && r.citizen.blocked ? `<div class="notice warn" style="margin-top:10px">🚫 ${esc(T('Fuqaro bloklangan: yangi ariza yubora olmaydi'))}</div>` : ''}
          ${r.citizen && me().role === 'admin' ? `<button class="btn btn-sm ${r.citizen.blocked ? '' : 'btn-danger'}" id="blockBtn" style="margin-top:10px">${esc(r.citizen.blocked ? T('Blokdan chiqarish') : T('Fuqaroni bloklash (spam, haqorat)'))}</button>` : ''}
          <p class="muted tiny" style="margin:10px 0 0">${esc(T('Shaxsiy ma’lumotlar faqat murojaatni hal qilish uchun ishlatiladi. Telefon raqami ko‘rilgani jurnalga yoziladi.'))}</p>
        </div></div>
      </div>
    </div>
    <div class="letter" id="letter"></div>`;
  // amallar paneli
  const A = [];
  if (r.cancelled) A.push(`<p class="muted" style="margin:0">${esc(T('Fuqaro arizani bekor qilgan. Amallar mavjud emas.'))}</p>`);
  else if (!work && !canAssign(r)) A.push(`<p class="muted" style="margin:0">${esc(T('Bu ariza sizga biriktirilmagan. Faqat ko‘rish mumkin.'))}</p>`);
  else {
    if (r.status === 0 && work && r.org_id) A.push(`<button class="btn btn-primary" data-act="accept">✔️ ${esc(T('Ko‘rib chiqishga qabul qilish'))}</button>`);
    if (!r.org_id && isStaff()) A.push(`<button class="btn btn-primary" data-act="forward">🧭 ${esc(T('Mas’ul idoraga yo‘naltirish'))}</button>`);
    if (canAssign(r) && r.org_id) A.push(`<button class="btn" data-act="assign">🧑‍💼 ${esc(r.assignee_id ? T('Ijrochini almashtirish') : T('Ijrochi tayinlash'))}</button>`);
    if (r.status === 1 && work) A.push(`<button class="btn" data-act="work">🚗 ${esc(T('Ijroga olish (joyiga chiqish)'))}</button>`);
    if (r.status < 3 && work && r.org_id) A.push(`<button class="btn" data-act="proof">📸 ${esc(r.proof_path ? T('Bajarilgan ish suratini almashtirish') : T('Bajarilgan ish suratini yuklash'))}</button>`);
    if (r.status < 3 && work && r.org_id) A.push(`<button class="btn btn-primary" data-act="resolve">✅ ${esc(T('Hal qilindi — fuqaroga javob'))}</button>`);
    if (r.status === 3 && (isHead() || isStaff())) A.push(`<button class="btn btn-primary" data-act="close">🔒 ${esc(T('Tasdiqlash va yopish'))}</button>`);
    if (r.status >= 3 && (isHead() || isStaff()) && !r.reject_reason) A.push(`<button class="btn" data-act="reopen">↩️ ${esc(T('Qayta ijroga qaytarish'))}</button>`);
    if (canAssign(r) && r.org_id) A.push(`<button class="btn" data-act="deadline">📅 ${esc(T('Muddatni o‘zgartirish'))}</button>`);
    if (canAssign(r)) A.push(`<button class="btn" data-act="prio">⚡ ${esc(T('Muhimlik darajasi'))}</button>`);
    if (canForward(r) && r.org_id) A.push(`<button class="btn" data-act="forward">↪️ ${esc(T('Boshqa idoraga yo‘naltirish'))}</button>`);
    if (r.status < 3 && work && r.org_id) A.push(`<button class="btn btn-danger" data-act="reject">⛔ ${esc(T('Rad etish (asossiz)'))}</button>`);
  }
  $('#acts').innerHTML = A.join('');
  $$('#acts [data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, r));
  // tarix
  renderTimeline(r, hist);
  if ($('#cmtBtn')) $('#cmtBtn').onclick = async () => {
    const v = $('#cmt').value.trim(); if (!v) return;
    try { await S.store.addComment(r.id, v); $('#cmt').value = ''; renderTimeline(r, hist); toast(T('Izoh qo‘shildi')); } catch (e) { toast(T(e.message), 'err'); }
  };
  if ($('#blockBtn')) $('#blockBtn').onclick = async () => {
    const b = !r.citizen.blocked;
    if (b && !(await confirmBox(T('Fuqaroni bloklash'), T('Bloklangan fuqaro ilovadan yangi ariza yubora olmaydi. Avvalgi arizalari ko‘rib chiqilishda davom etadi.'), T('Bloklash'), true))) return;
    try { await S.store.setBlocked(r.citizen.id, b); S.data = await S.store.load(); toast(b ? T('Fuqaro bloklandi') : T('Fuqaro blokdan chiqarildi')); route(true); } catch (e) { toast(T(e.message), 'err'); }
  };
  if ($('#showPhone')) $('#showPhone').onclick = () => { $('#phone').textContent = r.citizen.phone; $('#showPhone').remove(); S.store.logContactView(r); };
  $('#printBtn').onclick = () => printLetter(r);
  $('#copyBtn').onclick = () => { const u = location.href; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast(T('Havola nusxalandi')), () => toast(u)); };
  // suratlar
  Promise.all([S.store.mediaUrl(r, 'media'), S.store.mediaUrl(r, 'proof')]).then(([a, b]) => {
    const box = $('#photos'); if (!box) return;
    const ph = (src, cap) => `<div class="photo" data-src="${esc(src)}"><img src="${esc(src)}" alt="${esc(cap)}" loading="lazy"><span class="cap">${esc(cap)}</span></div>`;
    box.innerHTML = (a ? ph(a, T('Fuqaro surati')) : `<div class="photo none">${esc(r.media_type === 'video' ? T('Video biriktirilgan') : T('Fuqaro surat biriktirmagan'))}</div>`) + (b ? ph(b, T('Bajarilgan ish')) : '');
    $$('.photo[data-src]', box).forEach(p => p.onclick = () => lightbox(p.dataset.src));
  });
  if (r.lat) setTimeout(() => miniMap(r), 30);
};
async function renderTimeline(r, hist) {
  const ul = $('#tl'); if (!ul) return;
  let cm = []; try { cm = await S.store.comments(r.id); } catch (e) { }
  const items = hist.map(h => ({ at: h.created_at, h })).concat(cm.map(c => ({ at: c.created_at, c }))).sort((a, b) => a.at < b.at ? -1 : 1);
  ul.innerHTML = items.map(x => {
    if (x.c) return `<li class="comment"><span class="td"></span><div class="tt">💬 <b>${esc(personName(x.c.author))}</b> ${esc(T('izoh qoldirdi'))}</div><div class="tm">${esc(fmtDT(x.at))}</div><div class="tn">${esc(x.c.body)}</div></li>`;
    const h = x.h, who = h.actor ? personName(h.actor) : T('Tizim');
    const [c, t, note] = histText(h);
    return `<li style="--c:${c}"><span class="td"></span><div class="tt">${t}</div><div class="tm">${esc(fmtDT(h.created_at))} · ${esc(who)}</div>${note ? `<div class="tn">${esc(note)}</div>` : ''}</li>`;
  }).join('') || `<li class="muted">${esc(T('Tarix bo‘sh'))}</li>`;
}
function histText(h) {
  switch (h.event) {
    case 'created': return ['var(--s0)', '📨 ' + esc(T('Fuqaro murojaat yubordi')), null];
    case 'org': return ['var(--accent)', '🏛️ ' + esc(T('Idoraga yo‘naltirildi')), h.note];
    case 'forwarded': return ['var(--warn)', '↪️ ' + esc(T('Boshqa idoraga qayta yo‘naltirildi')), h.note];
    case 'status': return [(STATUSES[h.status] || STATUSES[0]).c, '🔄 ' + esc(T('Holat')) + ': <b>' + esc(stT(h.status)) + '</b>', null];
    case 'assigned': return ['var(--s2)', '🧑‍💼 ' + esc(T('Ijrochi tayinlandi')), h.note];
    case 'deadline': return ['var(--warn)', '📅 ' + esc(T('Muddat belgilandi')) + ': <b>' + esc(h.note || '') + '</b>', null];
    case 'note': return ['var(--s3)', '✉️ ' + esc(T('Fuqaroga javob yozildi')), h.note];
    case 'priority': return ['var(--warn)', '⚡ ' + esc(T('Muhimlik')) + ': <b>' + esc(prioT(h.status)) + '</b>', null];
    case 'rejected': return ['var(--danger)', '⛔ ' + esc(T('Rad etildi')), h.note];
    case 'proof': return ['var(--s3)', '📸 ' + esc(T('Bajarilgan ish surati yuklandi')), null];
    case 'cancelled': return ['var(--s4)', '🚫 ' + esc(T('Fuqaro arizani bekor qildi')), null];
    case 'edited': return ['var(--s4)', '✏️ ' + esc(T('Fuqaro arizani tahrirladi')), null];
    default: return ['var(--s4)', esc(h.event), h.note];
  }
}
async function act(r, patch, okT) {
  try { await S.store.updateReport(r.id, patch); S.data = await S.store.load(); toast(okT); route(true); refreshBadges(); return true; }
  catch (e) { toast(T(e.message || String(e)), 'err'); return false; }
}
function templatesFor(r) { return S.data.templates.filter(t => !t.org_id || t.org_id === (r.org_id || me().org_id)); }
async function doAction(a, r) {
  if (a === 'accept') return act(r, { status: 1, assignee_id: r.assignee_id || (me().role === 'org_staff' ? me().id : r.assignee_id) }, T('Ariza ko‘rib chiqishga qabul qilindi'));
  if (a === 'work') return act(r, { status: 2 }, T('Ariza ijroga olindi'));
  if (a === 'assign') return assignDialog([r]);
  if (a === 'forward') return forwardDialog([r]);
  if (a === 'close') { if (await confirmBox(T('Arizani yopish'), T('Javob va bajarilgan ish tasdiqlanadi, ariza yopiladi. Fuqaro ilovada “Yakunlandi” holatini ko‘radi.'), T('Yopish'))) act(r, { status: 4 }, T('Ariza yopildi')); return; }
  if (a === 'reopen') { if (await confirmBox(T('Qayta ijroga qaytarish'), T('Ariza “Ijroda” holatiga qaytadi va ijrochi qayta ishlaydi.'), T('Qaytarish'))) act(r, { status: 2 }, T('Ariza qayta ijroga qaytarildi')); return; }
  if (a === 'proof') {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { toast(T('Surat yuklanmoqda...')); await S.store.uploadProof(r.id, f); S.data = await S.store.load(); toast(T('Bajarilgan ish surati yuklandi')); route(true); } catch (e) { toast(T(e.message), 'err'); } };
    inp.click(); return;
  }
  if (a === 'prio') {
    const v = await modal({ title: T('Muhimlik darajasi'), body: `<div class="field"><span>${esc(T('Daraja'))}</span><select id="mPrio">${PRIORITIES.map(p => `<option value="${p.k}" ${r.priority === p.k ? 'selected' : ''}>${esc(T(p.t))}</option>`).join('')}</select></div>`, actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Saqlash'), cls: 'btn-primary', run: ov => +$('#mPrio', ov).value }] });
    if (v !== null && v !== undefined && v !== r.priority) act(r, { priority: v }, T('Muhimlik o‘zgartirildi'));
    return;
  }
  if (a === 'deadline') {
    const max = new Date(new Date(r.created_at).getTime() + MAX_TERM_DAYS * DAY);
    const cur = new Date(r.deadline_at || Date.now());
    const v = await modal({ title: T('Muddatni o‘zgartirish'), body: `
      <div class="notice info">${esc(T('Qonunchilikka ko‘ra murojaat 15 kun ichida ko‘rib chiqiladi; qo‘shimcha o‘rganish talab etilsa — kelgan kundan boshlab 30 kungacha uzaytiriladi.'))}</div>
      <div class="grid2"><label class="field"><span>${esc(T('Yangi muddat'))}</span><input type="date" id="mDl" value="${dayKey(cur)}" max="${dayKey(max)}"></label><div class="field"><span>${esc(T('Eng uzoq muddat'))}</span><div style="padding-top:8px"><b>${esc(fmtD(max))}</b></div></div></div>
      <label class="field"><span>${esc(T('Sabab (ichki izohga yoziladi)'))}</span><textarea id="mWhy" placeholder="${esc(T('Masalan: laboratoriya tahlili natijasi kutilmoqda'))}"></textarea></label><div class="form-error"></div>`,
      actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Saqlash'), cls: 'btn-primary', run: async ov => {
        const dv = $('#mDl', ov).value, why = $('#mWhy', ov).value.trim();
        if (!dv) throw new Error('Sanani tanlang');
        const nd = new Date(dv + 'T18:00:00');
        if (nd > max) throw new Error('Muddat murojaat kelgan kundan boshlab 30 kundan oshmasligi kerak');
        if (nd > cur && !why) throw new Error('Muddatni uzaytirish sababini yozing');
        await S.store.updateReport(r.id, { deadline_at: nd.toISOString() });
        if (why) await S.store.addComment(r.id, T('Muddat o‘zgartirildi') + ' (' + fmtD(nd) + '): ' + why);
      } }] });
    if (v) { S.data = await S.store.load(); toast(T('Muddat yangilandi')); route(true); }
    return;
  }
  if (a === 'resolve' || a === 'reject') {
    const rej = a === 'reject', tpls = templatesFor(r);
    const v = await modal({ wide: true, title: rej ? T('Arizani rad etish') : T('Hal qilindi: fuqaroga javob'),
      body: `${rej ? `<label class="field"><span>${esc(T('Rad etish sababi'))}</span><select id="mRs"><option value="">${esc(T('Tanlang...'))}</option>${DEMO_REJECTS.map(x => `<option>${esc(T(x))}</option>`).join('')}<option value="__other">${esc(T('Boshqa sabab'))}</option></select></label><input class="input" id="mRo" placeholder="${esc(T('Sababni yozing'))}" hidden>` : `<div class="notice info">${esc(T('Javob fuqaroning ilovasida ko‘rinadi. Aniq, xushmuomala va bajarilgan ishni ko‘rsatgan holda yozing.'))}</div>`}
        ${tpls.length ? `<div class="field"><span>${esc(T('Shablondan tanlash'))}</span><div class="tpl-list">${tpls.map(t => `<button type="button" data-t="${esc(t.id)}"><b>${esc(t.title)}</b>${esc(t.body.slice(0, 110))}…</button>`).join('')}</div></div>` : ''}
        <label class="field"><span>${esc(T('Fuqaroga javob matni'))}</span><textarea id="mAns" style="min-height:150px">${esc(r.admin_note || '')}</textarea></label>
        ${!rej && !r.proof_path ? `<p class="muted small" style="margin:0">💡 ${esc(T('Bajarilgan ish suratini yuklash fuqaro ishonchini oshiradi (“Amallar” bo‘limida).'))}</p>` : ''}
        <div class="form-error"></div>`,
      onOpen: ov => {
        $$('[data-t]', ov).forEach(b => b.onclick = () => { const t = tpls.find(x => x.id === b.dataset.t); $('#mAns', ov).value = t.body; });
        const rs = $('#mRs', ov); if (rs) rs.onchange = () => { $('#mRo', ov).hidden = rs.value !== '__other'; };
      },
      actions: [{ t: T('Bekor qilish'), v: null }, { t: rej ? T('Rad etish') : T('Javobni yuborish'), cls: rej ? 'btn-primary btn-danger' : 'btn-primary', run: async ov => {
        const ans = $('#mAns', ov).value.trim();
        if (ans.length < 20) throw new Error('Javob juda qisqa: kamida 20 belgi yozing');
        if (rej) {
          let why = $('#mRs', ov).value; if (why === '__other') why = $('#mRo', ov).value.trim();
          if (!why) throw new Error('Rad etish sababini tanlang');
          await S.store.updateReport(r.id, { admin_note: ans, reject_reason: why });
        } else await S.store.updateReport(r.id, { admin_note: ans, status: 3 });
      } }] });
    if (v) { S.data = await S.store.load(); toast(rej ? T('Ariza rad etildi, fuqaroga javob yuborildi') : T('Ariza hal qilindi, fuqaroga javob yuborildi')); route(true); refreshBadges(); }
  }
}
async function assignDialog(list) {
  const orgId = list[0].org_id;
  if (list.some(r => r.org_id !== orgId)) return toast(T('Bir vaqtda faqat bitta idoraning arizalarini biriktirish mumkin'), 'err');
  const staff = S.data.profiles.filter(p => p.org_id === orgId && isAgentRole(p.role) && !p.blocked);
  if (!staff.length) return toast(T('Bu idorada xodim yo‘q. Avval “Xodimlar” bo‘limida xodim qo‘shing.'), 'err');
  const load = id => S.data.reports.filter(r => r.assignee_id === id && isOpen(r)).length;
  const late = id => S.data.reports.filter(r => r.assignee_id === id && isOverdue(r)).length;
  const v = await modal({ title: list.length > 1 ? T('{n} ta arizaga ijrochi tayinlash', { n: list.length }) : T('Ijrochi tayinlash'),
    body: `<div class="field"><span>${esc(T('Ijrochi'))}</span><div class="tpl-list" style="max-height:300px">${staff.sort((a, b) => load(a.id) - load(b.id)).map(p => `<label class="demo-acct" style="cursor:pointer"><input type="radio" name="asg" value="${p.id}" ${list[0].assignee_id === p.id ? 'checked' : ''}><span class="avatar">${esc(initials(p.full_name))}</span><div style="flex:1"><b>${esc(p.full_name)}</b><span>${esc(p.position || roleT(p.role))}</span></div><div class="small" style="text-align:right"><b>${load(p.id)}</b> ${esc(T('ochiq'))}${late(p.id) ? `<div class="due late">${late(p.id)} ${esc(T('kechikkan'))}</div>` : ''}</div></label>`).join('')}</div></div>
      <label class="check"><input type="checkbox" id="mAcc" checked> ${esc(T('Bir vaqtda “Ko‘rib chiqilmoqda” holatiga o‘tkazish'))}</label>
      <label class="field"><span>${esc(T('Topshiriq matni (ixtiyoriy, ichki izoh)'))}</span><textarea id="mTask" placeholder="${esc(T('Masalan: 2 kun ichida joyiga chiqib, dalolatnoma tuzing'))}"></textarea></label><div class="form-error"></div>`,
    actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Tayinlash'), cls: 'btn-primary', run: ov => {
      const c = $('input[name=asg]:checked', ov); if (!c) throw new Error('Ijrochini tanlang');
      return { id: c.value, acc: $('#mAcc', ov).checked, task: $('#mTask', ov).value.trim() };
    } }] });
  if (!v) return;
  await runMany(list, async r => {
    await S.store.updateReport(r.id, Object.assign({ assignee_id: v.id }, v.acc && r.status === 0 ? { status: 1 } : {}));
    if (v.task) await S.store.addComment(r.id, T('Topshiriq') + ': ' + v.task);
  }, T('{n} ta arizaga ijrochi tayinlandi'));
}
async function forwardDialog(list) {
  const cur = list[0].org_id;
  const cands = S.data.orgs.filter(o => o.active && !o.central && o.id !== cur);
  const r0 = list[0], best = routeOrg(S.data.orgs.filter(o => o.id !== cur), r0.category, r0.region) || ((S.data.orgs.find(o => o.id !== cur && o.active && !o.central && o.region === r0.region) || {}).id);
  const v = await modal({ title: list.length > 1 ? T('{n} ta arizani yo‘naltirish', { n: list.length }) : T('Mas’ul idoraga yo‘naltirish'),
    body: `<label class="field"><span>${esc(T('Idora'))}</span><select id="mOrg"><option value="">${esc(T('Tanlang...'))}</option>${cands.map(o => `<option value="${o.id}" ${o.id === best ? 'selected' : ''}>${esc(o.short_name || o.name)}${o.region ? ' — ' + esc(regT(o.region)) : ''}${o.id === best ? ' ★ ' + esc(T('tavsiya')) : ''}</option>`).join('')}</select></label>
      ${best ? `<p class="muted small" style="margin:-6px 0 0">★ ${esc(T('Toifa va hududga qarab tavsiya etilgan idora'))}</p>` : ''}
      <label class="field"><span>${esc(T('Yo‘naltirish sababi'))}</span><textarea id="mWhy" placeholder="${esc(T('Masalan: masala chiqindi olib chiqish xizmati vakolatiga kiradi'))}"></textarea></label>
      ${cur ? `<div class="notice">${esc(T('Yo‘naltirilgandan keyin ariza sizning ro‘yxatingizdan chiqadi va yangi idorada “Yangi” holatida paydo bo‘ladi.'))}</div>` : ''}<div class="form-error"></div>`,
    actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Yo‘naltirish'), cls: 'btn-primary', run: ov => {
      const o = $('#mOrg', ov).value; if (!o) throw new Error('Idorani tanlang');
      const why = $('#mWhy', ov).value.trim(); if (cur && !why) throw new Error('Yo‘naltirish sababini yozing');
      return { o, why };
    } }] });
  if (!v) return;
  const stay = isStaff();
  await runMany(list, r => S.store.forward(r.id, v.o, v.why), T('{n} ta ariza yo‘naltirildi'));
  if (!stay && S.route.page === 'report') go('#/inbox');
}
function printLetter(r) {
  const org = orgById(r.org_id), head = S.data.profiles.find(p => p.org_id === r.org_id && p.role === 'org_head');
  $('#letter').innerHTML = `<div class="lh">${esc(org ? org.name : T('Ekologiya vazirligi'))}${org && org.address ? '<br><span style="font-weight:400">' + esc(org.address) + (org.phone ? ', ' + esc(org.phone) : '') + '</span>' : ''}</div>
    <div class="meta"><span>№ ${esc(r.case_no)}</span><span>${esc(fmtD(r.resolved_at || Date.now()))}</span></div>
    <p><b>${esc(T('Hurmatli'))} ${esc(r.citizen && r.citizen.name || T('fuqaro'))}!</b></p>
    <p>${esc(T('Sizning {d} sanadagi {n}-sonli murojaatingiz ({c}, {a}) ko‘rib chiqildi.', { d: fmtD(r.created_at), n: r.case_no, c: catT(r.category), a: (regT(r.region) + ', ' + (r.address || '')).replace(/, $/, '') }))}</p>
    <p style="white-space:pre-wrap">${esc(r.admin_note || T('[Javob hali yozilmagan]'))}</p>
    <p>${esc(T('Javobdan norozi bo‘lsangiz, yuqori turuvchi organga yoki sudga murojaat qilishingiz mumkin.'))}</p>
    <div class="sign"><span>${esc(head ? T('Boshqarma boshlig‘i') : T('Mas’ul xodim'))}</span><span>${esc(head ? head.full_name : (r.assignee_id ? personName(r.assignee_id) : ''))}</span></div>
    <p style="margin-top:30px; font-size:10pt">${esc(T('Ijrochi'))}: ${esc(r.assignee_id ? personName(r.assignee_id) : '—')}</p>`;
  window.print();
}

// ---------- Ijro nazorati ----------
PAGES.control = el => {
  const R = S.data.reports.filter(r => !r.cancelled);
  const days = +(S.route.q.days || 30), since = Date.now() - days * DAY;
  const inP = r => new Date(r.created_at) > since;
  const groups = isStaff()
    ? S.data.orgs.filter(o => !o.central).map(o => ({ id: o.id, name: o.short_name || o.name, sub: o.region ? regT(o.region) : T('Respublika'), f: r => r.org_id === o.id, link: '#/inbox?view=all&org=' + o.id }))
    : S.data.profiles.filter(p => p.org_id === me().org_id && isAgentRole(p.role)).map(p => ({ id: p.id, name: p.full_name, sub: p.position || roleT(p.role), f: r => r.assignee_id === p.id, link: '#/inbox?view=all&asg=' + p.id }));
  const rows = groups.map(g => {
    const all = R.filter(g.f), period = all.filter(inP);
    const closed = period.filter(r => r.resolved_at);
    const ontime = closed.filter(r => onTime(r) !== false).length;
    const over = all.filter(isOverdue).length;
    const avg = closed.length ? closed.reduce((s, r) => s + (new Date(r.resolved_at) - new Date(r.created_at)) / DAY, 0) / closed.length : null;
    const score = period.length ? Math.max(0, Math.round(pct(ontime, Math.max(1, closed.length)) * 0.6 + pct(closed.length, period.length) * 0.4 - over * 3)) : null;
    return Object.assign({}, g, { got: period.length, open: all.filter(isOpen).length, over, closed: closed.length, ontimeP: closed.length ? pct(ontime, closed.length) : null, avg, score });
  }).filter(x => x.got || x.open).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const unrouted = isStaff() ? S.data.reports.filter(r => !r.org_id && isOpen(r)).length : 0;
  const overList = S.data.reports.filter(isOverdue).sort((a, b) => new Date(a.deadline_at) - new Date(b.deadline_at));
  const meter = v => v === null ? '<span class="muted">—</span>' : `<div class="row" style="gap:8px; flex-wrap:nowrap"><div class="meter ${v < 60 ? 'low' : v < 85 ? 'mid' : ''}" style="flex:1"><i style="width:${v}%"></i></div><b class="num">${v}%</b></div>`;
  el.innerHTML = `
    <div class="page-head"><div><h1>🎯 ${esc(T('Ijro nazorati'))}</h1><p>${esc(isStaff() ? T('Idoralar kesimida ijro intizomi reytingi') : T('Xodimlar kesimida ijro intizomi'))}</p></div>
      <div class="row"><select class="input" id="days" style="width:auto">${[7, 30, 90, 365].map(d => `<option value="${d}" ${days === d ? 'selected' : ''}>${esc(T('Oxirgi {n} kun', { n: d }))}</option>`).join('')}</select><button class="btn" id="csv">⬇️ ${esc(T('Excel (CSV)'))}</button></div></div>
    ${unrouted ? `<div class="notice" style="margin-bottom:16px">🧭 ${esc(T('{n} ta ariza hali idoraga yo‘naltirilmagan.', { n: unrouted }))} <a href="#/inbox?view=unrouted">${esc(T('Taqsimlash'))} →</a></div>` : ''}
    <div class="card" style="margin-bottom:16px"><div class="card-h"><h3>🏆 ${esc(T('Reyting'))}</h3><span class="muted small">${esc(T('Ball = o‘z vaqtida ijro (60%) + hal qilinganlar ulushi (40%) − har bir kechikkan ariza uchun 3 ball'))}</span></div>
      <div class="tbl-wrap"><table class="tbl rank cards-sm"><thead><tr><th>#</th><th>${esc(isStaff() ? T('Idora') : T('Xodim'))}</th><th>${esc(T('Kelgan'))}</th><th>${esc(T('Ochiq'))}</th><th>${esc(T('Muddati o‘tgan'))}</th><th>${esc(T('Hal qilingan'))}</th><th>${esc(T('O‘rtacha muddat'))}</th><th style="min-width:160px">${esc(T('O‘z vaqtida'))}</th><th>${esc(T('Ball'))}</th></tr></thead>
      <tbody>${rows.map((x, i) => `<tr onclick="go('${x.link}')"><td class="r">${i + 1}</td><td><b>${esc(x.name)}</b><div class="muted tiny">${esc(x.sub)}</div></td><td class="num">${x.got}</td><td class="num">${x.open}</td><td class="num">${x.over ? `<span class="due late">${x.over}</span>` : '0'}</td><td class="num">${x.closed}</td><td class="num">${x.avg === null ? '—' : T('{n} kun', { n: x.avg.toFixed(1) })}</td><td>${meter(x.ontimeP)}</td><td><b class="num">${x.score ?? '—'}</b></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">${esc(T('Tanlangan davrda ma’lumot yo‘q'))}</div></td></tr>`}</tbody></table></div></div>
    <div class="card"><div class="card-h"><h3>⏰ ${esc(T('Muddati o‘tgan arizalar'))}</h3><span class="chip chip-danger">${overList.length}</span></div>${miniTable(overList.slice(0, 15), T('Muddati o‘tgan ariza yo‘q — barakalla!'))}</div>`;
  $('#days').onchange = e => go('#/control?days=' + e.target.value);
  $('#csv').onclick = () => downloadCsv([[isStaff() ? T('Idora') : T('Xodim'), T('Kelgan'), T('Ochiq'), T('Muddati o‘tgan'), T('Hal qilingan'), T('O‘rtacha muddat (kun)'), T('O‘z vaqtida, %'), T('Ball')]].concat(rows.map(x => [x.name, x.got, x.open, x.over, x.closed, x.avg === null ? '' : x.avg.toFixed(1), x.ontimeP ?? '', x.score ?? ''])), 'ijro-nazorati');
};

// ---------- Xarita ----------
PAGES.map = el => {
  const q = S.route.q;
  el.innerHTML = `<div class="page-head"><div><h1>🗺️ ${esc(T('Murojaatlar xaritasi'))}</h1><p>${esc(T('Har bir nuqta — fuqaro murojaati. Rang holatni bildiradi.'))}</p></div>
    <div class="row"><select class="input" id="mf" style="width:auto"><option value="open" ${q.f !== 'all' && q.f !== 'overdue' ? 'selected' : ''}>${esc(T('Ochiq arizalar'))}</option><option value="overdue" ${q.f === 'overdue' ? 'selected' : ''}>${esc(T('Muddati o‘tganlar'))}</option><option value="all" ${q.f === 'all' ? 'selected' : ''}>${esc(T('Hammasi'))}</option></select>
    <select class="input" id="mc" style="width:auto"><option value="">${esc(T('Barcha turlar'))}</option>${CATEGORIES.map(c => `<option value="${c.k}" ${q.cat === c.k ? 'selected' : ''}>${c.icon} ${esc(T(c.t))}</option>`).join('')}</select></div></div>
    <div class="legend" style="margin-bottom:10px">${STATUSES.map(s => `<span><i style="background:${s.c}"></i>${esc(T(s.t))}</span>`).join('')}<span><i style="background:var(--danger)"></i>${esc(T('Muddati o‘tgan'))}</span></div>
    <div class="big-map" id="bigMap"></div>`;
  const upd = () => go('#/map?' + new URLSearchParams({ f: $('#mf').value, cat: $('#mc').value }).toString());
  $('#mf').onchange = upd; $('#mc').onchange = upd;
  let L = S.data.reports.filter(r => r.lat && !r.cancelled);
  if (q.f === 'overdue') L = L.filter(isOverdue); else if (q.f !== 'all') L = L.filter(isOpen);
  if (q.cat) L = L.filter(r => r.category === q.cat);
  setTimeout(() => bigMap(L), 20);
};
function leafletOk(box) {
  if (window.L && L.map) return true;
  box.innerHTML = `<div class="map-fallback">🗺️<br>${esc(T('Xarita kutubxonasi yuklanmadi. Internet aloqasini tekshiring.'))}</div>`;
  return false;
}
function tiles(map) {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
}
function cssColor(v) { const m = /var\((--[^)]+)\)/.exec(v); return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() : v; }
function pinIcon(r) {
  const c = cssColor(isOverdue(r) ? 'var(--danger)' : (STATUSES[r.status] || STATUSES[0]).c);
  return L.divIcon({ className: '', html: `<div class="pin" style="background:${c}"><span>${catOf(r.category).icon}</span></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
}
function bigMap(list) {
  const box = $('#bigMap'); if (!box || !leafletOk(box)) return;
  const map = L.map(box, { zoomControl: true }); S.maps.big = map; tiles(map);
  const group = L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50, iconCreateFunction: c => { const late = c.getAllChildMarkers().some(m => m.options.late); return L.divIcon({ html: `<div>${c.getChildCount()}</div>`, className: 'mc' + (late ? ' late' : ''), iconSize: [42, 42] }); } }) : L.layerGroup();
  list.forEach(r => {
    const m = L.marker([r.lat, r.lng], { icon: pinIcon(r), late: isOverdue(r) });
    m.bindPopup(`<b>${esc(r.case_no)}</b> · ${esc(catT(r.category))}<br>${esc(r.description.slice(0, 120))}${r.description.length > 120 ? '…' : ''}<br><span style="color:#666">${esc(regT(r.region))} · ${esc(stT(r.status))} · ${esc(dueLabel(r).t)}</span><br><a href="#/report/${r.id}">${esc(T('Arizani ochish'))} →</a>`);
    group.addLayer(m);
  });
  map.addLayer(group);
  if (list.length) map.fitBounds(L.latLngBounds(list.map(r => [r.lat, r.lng])).pad(0.1), { maxZoom: 13 }); else map.setView([41.3, 64.5], 6);
}
function miniMap(r) {
  const box = $('#miniMap'); if (!box || !leafletOk(box)) return;
  const map = L.map(box, { scrollWheelZoom: false }); S.maps.mini = map; tiles(map);
  map.setView([r.lat, r.lng], 15); L.marker([r.lat, r.lng], { icon: pinIcon(r) }).addTo(map);
}

// ---------- Tahlil ----------
PAGES.analytics = el => {
  const q = S.route.q, days = +(q.days || 90), since = Date.now() - days * DAY;
  const R = S.data.reports.filter(r => !r.cancelled && new Date(r.created_at) > since);
  const closed = R.filter(r => r.resolved_at);
  const ontime = closed.filter(r => onTime(r) !== false).length;
  const avgAcc = R.filter(r => r.accepted_at); const accH = avgAcc.length ? avgAcc.reduce((s, r) => s + (new Date(r.accepted_at) - new Date(r.created_at)) / 3600e3, 0) / avgAcc.length : 0;
  const byReg = REGIONS.map(g => { const L = R.filter(r => r.region === g.code); const c = L.filter(r => r.resolved_at); return { code: g.code, name: T(g.uz), n: L.length, open: L.filter(isOpen).length, over: L.filter(isOverdue).length, closed: c.length, ot: c.length ? pct(c.filter(r => onTime(r) !== false).length, c.length) : null, cats: CATEGORIES.map(k => L.filter(r => r.category === k.k).length) }; }).filter(x => x.n).sort((a, b) => b.n - a.n);
  el.innerHTML = `<div class="page-head"><div><h1>📊 ${esc(T('Tahlil va hisobotlar'))}</h1><p>${esc(T('Tanlangan davr bo‘yicha umumiy ko‘rsatkichlar'))}</p></div>
    <div class="row"><select class="input" id="days" style="width:auto">${[30, 90, 180, 365].map(d => `<option value="${d}" ${days === d ? 'selected' : ''}>${esc(T('Oxirgi {n} kun', { n: d }))}</option>`).join('')}</select><button class="btn" id="csv">⬇️ ${esc(T('Hududlar hisoboti (CSV)'))}</button><button class="btn" onclick="window.print()">🖨️</button></div></div>
    <div class="kpis">
      <div class="kpi" style="--c:var(--series-1)"><span class="kl">${esc(T('Kelgan murojaatlar'))}</span><span class="kv">${nf(R.length)}</span><span class="ks">${esc(T('kuniga o‘rtacha {n}', { n: (R.length / days).toFixed(1) }))}</span></div>
      <div class="kpi" style="--c:var(--s3)"><span class="kl">${esc(T('Hal qilingan'))}</span><span class="kv">${pct(closed.length, R.length)}%</span><span class="ks">${nf(closed.length)} ${esc(T('ta'))}</span></div>
      <div class="kpi" style="--c:var(--accent)"><span class="kl">${esc(T('O‘z vaqtida ijro'))}</span><span class="kv">${pct(ontime, closed.length)}%</span><span class="ks">${esc(T('hal qilinganlar ichida'))}</span></div>
      <div class="kpi" style="--c:var(--s1)"><span class="kl">${esc(T('Qabul qilish tezligi'))}</span><span class="kv">${accH < 48 ? T('{n} soat', { n: accH.toFixed(0) }) : T('{n} kun', { n: (accH / 24).toFixed(1) })}</span><span class="ks">${esc(T('kelgandan qabul qilinguncha'))}</span></div>
      <div class="kpi" style="--c:var(--danger)"><span class="kl">${esc(T('Hozir muddati o‘tgan'))}</span><span class="kv">${nf(R.filter(isOverdue).length)}</span><span class="ks">${esc(T('ochiq arizalar ichida'))}</span></div>
      <div class="kpi" style="--c:var(--s2)"><span class="kl">${esc(T('Rad etilgan'))}</span><span class="kv">${nf(R.filter(r => r.reject_reason).length)}</span><span class="ks">${esc(T('asossiz deb topilgan'))}</span></div>
    </div>
    <div class="dash">
      <div class="col">
        <div class="card"><div class="card-h"><h3>📈 ${esc(T('Haftalar bo‘yicha dinamika'))}</h3><div class="row legend"><span><i style="background:var(--series-1)"></i>${esc(T('Kelgan'))}</span><span><i style="background:var(--series-2)"></i>${esc(T('Hal qilingan'))}</span></div></div><div class="card-b"><div class="chart" id="wk"></div></div></div>
        <div class="card"><div class="card-h"><h3>🗺️ ${esc(T('Hududlar kesimida'))}</h3></div><div class="tbl-wrap"><table class="tbl cards-sm"><thead><tr><th>${esc(T('Hudud'))}</th><th>${esc(T('Jami'))}</th>${CATEGORIES.map(c => `<th title="${esc(T(c.t))}">${c.icon}</th>`).join('')}<th>${esc(T('Ochiq'))}</th><th>${esc(T('Kechikkan'))}</th><th>${esc(T('O‘z vaqtida'))}</th></tr></thead>
          <tbody>${byReg.map(x => `<tr onclick="go('#/inbox?view=all&region=${x.code}')"><td><b>${esc(x.name)}</b></td><td class="num"><b>${x.n}</b></td>${x.cats.map(n => `<td class="num hide-sm">${n || '<span class="muted">·</span>'}</td>`).join('')}<td class="num">${x.open}</td><td class="num">${x.over ? `<span class="due late">${x.over}</span>` : 0}</td><td class="num">${x.ot === null ? '—' : x.ot + '%'}</td></tr>`).join('')}</tbody></table></div></div>
      </div>
      <div class="col">
        <div class="card"><div class="card-h"><h3>🏷️ ${esc(T('Muammo turlari'))}</h3></div><div class="card-b" id="cats"></div></div>
        <div class="card"><div class="card-h"><h3>🕐 ${esc(T('Murojaatlar qaysi soatlarda keladi'))}</h3></div><div class="card-b"><div class="chart" id="hours"></div></div></div>
        <div class="card"><div class="card-h"><h3>🧩 ${esc(T('Holatlar'))}</h3></div><div class="card-b" id="donut"></div></div>
      </div>
    </div>`;
  $('#days').onchange = e => go('#/analytics?days=' + e.target.value);
  $('#csv').onclick = () => downloadCsv([[T('Hudud'), T('Jami')].concat(CATEGORIES.map(c => T(c.t)), [T('Ochiq'), T('Muddati o‘tgan'), T('Hal qilingan'), T('O‘z vaqtida, %')])].concat(byReg.map(x => [x.name, x.n].concat(x.cats, [x.open, x.over, x.closed, x.ot ?? '']))), 'hududlar-hisoboti');
  // haftalik
  const weeks = Math.min(26, Math.ceil(days / 7)), w0 = new Date(); w0.setHours(0, 0, 0, 0); w0.setDate(w0.getDate() - w0.getDay() + 1 - (weeks - 1) * 7);
  const wk = i => w0.getTime() + i * 7 * DAY, keys = Array.from({ length: weeks }, (_, i) => fmtD(wk(i)).slice(0, 5));
  const inc = Array(weeks).fill(0), res = Array(weeks).fill(0);
  S.data.reports.filter(r => !r.cancelled).forEach(r => { const a = Math.floor((new Date(r.created_at) - w0) / (7 * DAY)); if (a >= 0 && a < weeks) inc[a]++; if (r.resolved_at) { const b = Math.floor((new Date(r.resolved_at) - w0) / (7 * DAY)); if (b >= 0 && b < weeks) res[b]++; } });
  lineChart($('#wk'), keys, [{ name: T('Kelgan'), c: 'var(--series-1)', v: inc }, { name: T('Hal qilingan'), c: 'var(--series-2)', v: res }]);
  bars($('#cats'), CATEGORIES.map(c => ({ label: c.icon + ' ' + T(c.t), v: R.filter(r => r.category === c.k).length, href: '#/inbox?view=all&cat=' + encodeURIComponent(c.k) })).sort((a, b) => b.v - a.v));
  const hrs = Array(24).fill(0); R.forEach(r => hrs[new Date(r.created_at).getHours()]++);
  columnChart($('#hours'), hrs.map((v, i) => ({ label: pad(i) + ':00', v })));
  donut($('#donut'), STATUSES.map(s => ({ label: T(s.t), v: R.filter(r => r.status === s.k).length, c: s.c, href: '#/inbox?view=all&status=' + s.k })));
};

// ---------- Tashkilotlar ----------
PAGES.orgs = el => {
  if (!isStaff()) return go('#/dashboard');
  const O = S.data.orgs.slice().sort((a, b) => (a.central ? -1 : 0) - (b.central ? -1 : 0) || (a.region || '').localeCompare(b.region || ''));
  const cnt = id => S.data.reports.filter(r => r.org_id === id && isOpen(r)).length;
  const staff = id => S.data.profiles.filter(p => p.org_id === id && isAgentRole(p.role)).length;
  el.innerHTML = `<div class="page-head"><div><h1>🏛️ ${esc(T('Tashkilotlar'))}</h1><p>${esc(T('Murojaatlarni ko‘rib chiquvchi idoralar va avtomatik taqsimlash qoidalari'))}</p></div>
    <div class="row">${me().role === 'admin' ? `<button class="btn btn-primary" id="addOrg">➕ ${esc(T('Tashkilot qo‘shish'))}</button>` : ''}</div></div>
    <div class="notice info" style="margin-bottom:16px">🧭 ${esc(T('Yangi ariza kelganda tizim toifa va hududga mos keladigan faol idorani topadi. Hududiy idora bo‘lmasa respublika idorasi tanlanadi, u ham bo‘lmasa ariza “Taqsimlanmagan” ro‘yxatiga tushadi.'))}</div>
    <div class="card"><div class="tbl-wrap"><table class="tbl cards-sm"><thead><tr><th>${esc(T('Nomi'))}</th><th>${esc(T('Hudud'))}</th><th>${esc(T('Qabul qiladigan toifalar'))}</th><th>${esc(T('Rahbar'))}</th><th>${esc(T('Xodimlar'))}</th><th>${esc(T('Ochiq arizalar'))}</th><th>${esc(T('Holat'))}</th></tr></thead>
    <tbody>${O.map(o => `<tr data-org="${o.id}"><td><b>${esc(o.short_name || o.name)}</b><div class="muted tiny">${esc(o.name)}</div></td><td>${o.region ? esc(regT(o.region)) : `<span class="chip">${esc(T('Respublika'))}</span>`}</td><td>${(o.categories || []).map(c => `<span title="${esc(catT(c))}">${catOf(c).icon}</span>`).join(' ')}</td><td>${esc(o.head || '—')}<div class="muted tiny">${esc(o.phone || '')}</div></td><td class="num">${staff(o.id)}</td><td class="num">${o.central ? '—' : `<a href="#/inbox?view=open&org=${o.id}">${cnt(o.id)}</a>`}</td><td>${o.active ? `<span class="chip chip-ok">${esc(T('Faol'))}</span>` : `<span class="chip">${esc(T('Nofaol'))}</span>`}</td></tr>`).join('')}</tbody></table></div></div>`;
  if ($('#addOrg')) $('#addOrg').onclick = () => orgDialog({ active: true, categories: [] });
  $$('[data-org]').forEach(tr => tr.onclick = e => { if (e.target.closest('a')) return; if (me().role === 'admin') orgDialog(orgById(tr.dataset.org)); });
};
async function orgDialog(o) {
  const v = await modal({ wide: true, title: o.id ? T('Tashkilotni tahrirlash') : T('Yangi tashkilot'), body: `
    <label class="field"><span>${esc(T('To‘liq nomi'))}</span><input id="oN" value="${esc(o.name || '')}"></label>
    <div class="grid2"><label class="field"><span>${esc(T('Qisqa nomi'))}</span><input id="oS" value="${esc(o.short_name || '')}"></label>
    <label class="field"><span>${esc(T('Hudud'))}</span><select id="oR"><option value="">${esc(T('Respublika miqyosida'))}</option>${REGIONS.map(r => `<option value="${r.code}" ${o.region === r.code ? 'selected' : ''}>${esc(T(r.uz))}</option>`).join('')}</select></label></div>
    <div class="field"><span>${esc(T('Qabul qiladigan toifalar'))}</span><div class="row">${CATEGORIES.map(c => `<label class="check"><input type="checkbox" class="oC" value="${c.k}" ${(o.categories || []).includes(c.k) ? 'checked' : ''}> ${c.icon} ${esc(T(c.t))}</label>`).join('')}</div></div>
    <div class="grid3"><label class="field"><span>${esc(T('Rahbar'))}</span><input id="oH" value="${esc(o.head || '')}"></label><label class="field"><span>${esc(T('Telefon'))}</span><input id="oP" value="${esc(o.phone || '')}"></label><label class="field"><span>Email</span><input id="oE" value="${esc(o.email || '')}"></label></div>
    <label class="field"><span>${esc(T('Manzil'))}</span><input id="oA" value="${esc(o.address || '')}"></label>
    <label class="check"><input type="checkbox" id="oX" ${o.active ? 'checked' : ''}> ${esc(T('Faol (yangi arizalar shu idoraga tushadi)'))}</label><div class="form-error"></div>`,
    actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Saqlash'), cls: 'btn-primary', run: async ov => {
      const n = { id: o.id, central: o.central, name: $('#oN', ov).value.trim(), short_name: $('#oS', ov).value.trim(), region: $('#oR', ov).value || null, categories: $$('.oC:checked', ov).map(x => x.value), head: $('#oH', ov).value.trim(), phone: $('#oP', ov).value.trim(), email: $('#oE', ov).value.trim(), address: $('#oA', ov).value.trim(), active: $('#oX', ov).checked };
      if (n.name.length < 3) throw new Error('Tashkilot nomini kiriting');
      if (!n.categories.length) throw new Error('Kamida bitta toifani tanlang');
      await S.store.saveOrg(n);
    } }] });
  if (v) { S.data = await S.store.load(); toast(T('Saqlandi')); route(true); }
}

// ---------- Xodimlar ----------
PAGES.staff = el => {
  if (!(isStaff() || isHead())) return go('#/dashboard');
  const P = S.data.profiles.filter(p => PORTAL_ROLES.includes(p.role) && (isStaff() || p.org_id === me().org_id));
  const open = id => S.data.reports.filter(r => r.assignee_id === id && isOpen(r)).length;
  const late = id => S.data.reports.filter(r => r.assignee_id === id && isOverdue(r)).length;
  const done = id => S.data.reports.filter(r => r.assignee_id === id && r.resolved_at && new Date(r.resolved_at) > Date.now() - 30 * DAY).length;
  const admin = me().role === 'admin';
  el.innerHTML = `<div class="page-head"><div><h1>👥 ${esc(T('Xodimlar'))}</h1><p>${esc(isStaff() ? T('Portalga kirish huquqi berilgan barcha xodimlar') : T('Idorangiz xodimlari va ularning ish yuklamasi'))}</p></div>
    <div class="row">${admin ? `<button class="btn btn-primary" id="addP">➕ ${esc(T('Xodim qo‘shish'))}</button>` : ''}</div></div>
    ${S.store.mode === 'live' && admin ? `<div class="notice info" style="margin-bottom:16px">${esc(T('Yangi xodim avval Supabase → Authentication → Users bo‘limida (ish emaili va parol bilan) yaratiladi. U birinchi marta kirgach, shu yerda unga idora va rol tanlang.'))}</div>` : ''}
    <div class="card"><div class="tbl-wrap"><table class="tbl cards-sm"><thead><tr><th>${esc(T('F.I.Sh.'))}</th><th>${esc(T('Rol'))}</th>${isStaff() ? `<th>${esc(T('Idora'))}</th>` : ''}<th>${esc(T('Ochiq'))}</th><th>${esc(T('Kechikkan'))}</th><th>${esc(T('30 kunda hal qildi'))}</th><th>${esc(T('Holat'))}</th></tr></thead>
    <tbody>${P.sort((a, b) => (a.org_id || '').localeCompare(b.org_id || '') || a.role.localeCompare(b.role)).map(p => `<tr data-p="${p.id}"><td><div class="row" style="flex-wrap:nowrap"><span class="avatar">${esc(initials(p.full_name))}</span><div><b>${esc(p.full_name || '—')}</b><div class="muted tiny">${esc(p.position || '')} ${p.email ? '· ' + esc(p.email) : ''}</div></div></div></td><td>${esc(roleT(p.role))}</td>${isStaff() ? `<td>${p.org_id ? esc(orgShort(p.org_id)) : `<span class="muted">${esc(T('Vazirlik'))}</span>`}</td>` : ''}<td class="num"><a href="#/inbox?view=open&asg=${p.id}">${open(p.id)}</a></td><td class="num">${late(p.id) ? `<span class="due late">${late(p.id)}</span>` : 0}</td><td class="num">${done(p.id)}</td><td>${p.blocked ? `<span class="chip chip-danger">${esc(T('Bloklangan'))}</span>` : `<span class="chip chip-ok">${esc(T('Faol'))}</span>`}</td></tr>`).join('')}</tbody></table></div></div>`;
  if ($('#addP')) $('#addP').onclick = () => staffDialog({ role: 'org_staff', org_id: S.data.orgs.find(o => !o.central).id });
  $$('[data-p]').forEach(tr => tr.onclick = e => { if (e.target.closest('a')) return; if (admin) staffDialog(personById(tr.dataset.p)); });
};
async function staffDialog(p) {
  const v = await modal({ title: p.id ? T('Xodimni tahrirlash') : T('Yangi xodim'), body: `
    <label class="field"><span>${esc(T('F.I.Sh.'))}</span><input id="pN" value="${esc(p.full_name || '')}"></label>
    ${p.id ? '' : `<label class="field"><span>${esc(T('Ish emaili'))}</span><input id="pE" type="email" value="${esc(p.email || '')}"></label>`}
    <label class="field"><span>${esc(T('Lavozimi'))}</span><input id="pPos" value="${esc(p.position || '')}"></label>
    <div class="grid2"><label class="field"><span>${esc(T('Rol'))}</span><select id="pR">${PORTAL_ROLES.map(r => `<option value="${r}" ${p.role === r ? 'selected' : ''}>${esc(roleT(r))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(T('Idora'))}</span><select id="pO">${S.data.orgs.filter(o => !o.central).map(o => `<option value="${o.id}" ${p.org_id === o.id ? 'selected' : ''}>${esc(o.short_name || o.name)}</option>`).join('')}</select></label></div>
    <p class="muted small" style="margin:0">${esc(T('Vazirlik administratori va dispetcheri barcha idoralar arizalarini ko‘radi; idora rahbari va ijrochisi faqat o‘z idorasinikini.'))}</p>
    <label class="check"><input type="checkbox" id="pB" ${p.blocked ? 'checked' : ''}> ${esc(T('Bloklash (portalga kira olmaydi)'))}</label><div class="form-error"></div>`,
    onOpen: ov => { const s = () => { $('#pO', ov).disabled = !isAgentRole($('#pR', ov).value); }; $('#pR', ov).onchange = s; s(); },
    actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Saqlash'), cls: 'btn-primary', run: async ov => {
      const n = { id: p.id, full_name: $('#pN', ov).value.trim(), position: $('#pPos', ov).value.trim(), role: $('#pR', ov).value, org_id: $('#pO', ov).value, blocked: $('#pB', ov).checked };
      if (!p.id) n.email = $('#pE', ov).value.trim();
      if (n.full_name.length < 3) throw new Error('F.I.Sh. kiriting');
      await S.store.saveProfile(n);
    } }] });
  if (v) { S.data = await S.store.load(); toast(T('Saqlandi')); route(true); }
}

// ---------- Tozalash aksiyalari (fuqarolar ilovasida e'lon qilinadi) ----------
const EV_TYPES = { clean: ['🧹', 'Tozalash / hashar'], tree: ['🌳', 'Daraxt ekish'], volunteer: ['🤝', 'Volontyorlik'], action: ['🌍', 'Ekologik aksiya'] };
const toLocalInput = d => { if (!d) return ''; const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes()); };
PAGES.events = async el => {
  const canAdd = isStaff() || isHead();
  const canEdit = e => isStaff() || (isHead() && e.org_id === me().org_id);
  const view = S.route.q.view || 'upcoming';
  el.innerHTML = `<div class="page-head"><div><h1>🧹 ${esc(T('Tozalash aksiyalari'))}</h1><p>${esc(T('Hashar, ko‘chat ekish va volontyorlik tadbirlari. E’lon qilinganlari fuqarolar ilovasida darhol ko‘rinadi, ular “Qatnashaman” tugmasini bosadi.'))}</p></div><div class="row">${canAdd ? `<button class="btn btn-primary" id="addE">➕ ${esc(T('Aksiya e’lon qilish'))}</button>` : ''}</div></div><div class="empty">${esc(T('Yuklanmoqda…'))}</div>`;
  let list;
  try { list = await S.store.loadEvents(); } catch (e) { el.querySelector('.empty').textContent = T('Aksiyalarni yuklab bo‘lmadi') + ': ' + e.message; return; }
  const now = Date.now(), endOf = e => new Date(e.ends_at || new Date(new Date(e.starts_at).getTime() + 864e5)).getTime();
  const groups = {
    upcoming: list.filter(e => e.status === 'published' && endOf(e) > now).sort((a, b) => a.starts_at < b.starts_at ? -1 : 1),
    draft: list.filter(e => e.status === 'draft'),
    past: list.filter(e => e.status === 'cancelled' || (e.status === 'published' && endOf(e) <= now))
  };
  const L = groups[view] || groups.upcoming;
  const going = groups.upcoming.reduce((a, e) => a + (e.going || 0), 0);
  const tab = (k, t) => `<a class="btn btn-sm ${view === k ? 'btn-primary' : ''}" href="#/events?view=${k}">${esc(T(t))} <b>${groups[k].length}</b></a>`;
  const card = e => {
    const ty = EV_TYPES[e.type] || EV_TYPES.action, full = e.max_people && (e.going || 0) >= e.max_people;
    return `<div class="card ev-card"><div class="card-h"><h3>${ty[0]} ${esc(e.title)}</h3></div><div class="card-b">
      <div class="row" style="gap:6px; margin-bottom:8px"><span class="chip">${esc(T(ty[1]))}</span>${e.status === 'draft' ? `<span class="chip chip-warn">${esc(T('Qoralama'))}</span>` : e.status === 'cancelled' ? `<span class="chip chip-danger">${esc(T('Bekor qilingan'))}</span>` : endOf(e) <= now ? `<span class="chip">${esc(T('O‘tkazildi'))}</span>` : `<span class="chip chip-ok">${esc(T('E’lon qilingan'))}</span>`}${e.region ? `<span class="chip">${esc(regT(e.region))}</span>` : ''}</div>
      <div class="ev-meta">📅 <b>${esc(fmtDT(e.starts_at))}</b>${e.ends_at ? ' — ' + esc(fmtDT(e.ends_at)) : ''}</div>
      ${e.place ? `<div class="ev-meta">📍 ${esc(e.place)}${e.lat != null ? ` · <a href="https://www.google.com/maps?q=${e.lat},${e.lng}" target="_blank" rel="noopener">${esc(T('xaritada'))}</a>` : ''}</div>` : ''}
      <div class="ev-meta">🏛️ ${esc(e.organizer || (e.org_id ? orgShort(e.org_id) : '—'))}${e.contact ? ' · ' + esc(e.contact) : ''}</div>
      <div class="ev-meta">🙋 <b>${e.going || 0}</b>${e.max_people ? ' / ' + e.max_people : ''} ${esc(T('kishi qatnashadi'))}${full ? ` <span class="chip chip-warn">${esc(T('Joy qolmadi'))}</span>` : ''}</div>
      ${e.description ? `<p class="ev-desc">${esc(e.description)}</p>` : ''}
      ${canEdit(e) ? `<div class="row" style="margin-top:10px"><button class="btn btn-sm" data-eed="${e.id}">✏️ ${esc(T('Tahrirlash'))}</button>${e.status === 'published' && endOf(e) > now ? `<button class="btn btn-sm" data-ecan="${e.id}">⛔ ${esc(T('Bekor qilish'))}</button>` : ''}<button class="btn btn-sm btn-danger" data-edel="${e.id}">🗑️ ${esc(T('O‘chirish'))}</button></div>` : ''}
    </div></div>`;
  };
  el.innerHTML = `<div class="page-head"><div><h1>🧹 ${esc(T('Tozalash aksiyalari'))}</h1><p>${esc(T('Hashar, ko‘chat ekish va volontyorlik tadbirlari. E’lon qilinganlari fuqarolar ilovasida darhol ko‘rinadi, ular “Qatnashaman” tugmasini bosadi.'))}</p></div><div class="row">${canAdd ? `<button class="btn btn-primary" id="addE">➕ ${esc(T('Aksiya e’lon qilish'))}</button>` : ''}</div></div>
    <div class="row" style="margin-bottom:14px; gap:8px; flex-wrap:wrap">${tab('upcoming', 'Kelgusi')}${canAdd ? tab('draft', 'Qoralamalar') : ''}${tab('past', 'O‘tganlar')}<span class="muted" style="margin-left:auto">🙋 ${esc(T('Kelgusi aksiyalarga yozilganlar'))}: <b>${going}</b></span></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${L.map(card).join('') || `<div class="empty">${esc(T('Bu bo‘limda aksiya yo‘q'))}</div>`}</div>`;
  const reload = () => route(true);
  if ($('#addE')) $('#addE').onclick = () => eventDialog({ type: 'clean', status: 'published', org_id: me().org_id || null, region: me().org_id ? (orgById(me().org_id) || {}).region : null }).then(ok => ok && reload());
  const byId = id => list.find(e => e.id === id);
  $$('[data-eed]').forEach(b => b.onclick = () => eventDialog(Object.assign({}, byId(b.dataset.eed))).then(ok => ok && reload()));
  $$('[data-ecan]').forEach(b => b.onclick = async () => { const e = byId(b.dataset.ecan); if (await confirmBox(T('Aksiyani bekor qilish'), T('Fuqarolar ilovasida aksiya “Bekor qilingan” deb ko‘rsatiladi.'), T('Bekor qilish'), true)) { try { await S.store.saveEvent(Object.assign({}, e, { status: 'cancelled' })); toast(T('Saqlandi')); reload(); } catch (err) { toast(T(err.message), 'err'); } } });
  $$('[data-edel]').forEach(b => b.onclick = async () => { if (await confirmBox(T('Aksiyani o‘chirish'), T('Aksiya va unga yozilganlar ro‘yxati butunlay o‘chiriladi.'), T('O‘chirish'), true)) { try { await S.store.deleteEvent(b.dataset.edel); reload(); } catch (err) { toast(T(err.message), 'err'); } } });
};
async function eventDialog(e) {
  const v = await modal({ wide: true, title: e.id ? T('Aksiyani tahrirlash') : T('Yangi aksiya'), body: `
    <label class="field"><span>${esc(T('Sarlavha'))}</span><input id="eT" maxlength="160" value="${esc(e.title || '')}" placeholder="${esc(T('Masalan: Chilonzor tumanida umumshahar shanbaligi'))}"></label>
    <div class="grid2"><label class="field"><span>${esc(T('Turi'))}</span><select id="eY">${Object.entries(EV_TYPES).map(([k, t]) => `<option value="${k}" ${e.type === k ? 'selected' : ''}>${t[0]} ${esc(T(t[1]))}</option>`).join('')}</select></label>
    <label class="field"><span>${esc(T('Hudud'))}</span><select id="eR"><option value="">${esc(T('Respublika miqyosida'))}</option>${REGIONS.map(r => `<option value="${r.code}" ${e.region === r.code ? 'selected' : ''}>${esc(T(r.uz))}</option>`).join('')}</select></label></div>
    <div class="grid2"><label class="field"><span>${esc(T('Boshlanishi'))}</span><input id="eS" type="datetime-local" value="${toLocalInput(e.starts_at)}"></label><label class="field"><span>${esc(T('Tugashi (ixtiyoriy)'))}</span><input id="eE" type="datetime-local" value="${toLocalInput(e.ends_at)}"></label></div>
    <label class="field"><span>${esc(T('Joy (manzil, mo‘ljal)'))}</span><input id="eP" maxlength="300" value="${esc(e.place || '')}"></label>
    <div class="grid3"><label class="field"><span>${esc(T('Kenglik (lat)'))}</span><input id="eLa" inputmode="decimal" value="${e.lat ?? ''}" placeholder="41.31"></label><label class="field"><span>${esc(T('Uzunlik (lng)'))}</span><input id="eLo" inputmode="decimal" value="${e.lng ?? ''}" placeholder="69.28"></label><label class="field"><span>${esc(T('Ishtirokchilar chegarasi'))}</span><input id="eM" type="number" min="1" value="${e.max_people || ''}" placeholder="${esc(T('cheksiz'))}"></label></div>
    <div class="grid2"><label class="field"><span>${esc(T('Tashkilotchi'))}</span><input id="eO" maxlength="160" value="${esc(e.organizer || (e.org_id ? orgShort(e.org_id) : ''))}"></label><label class="field"><span>${esc(T('Aloqa (telefon yoki Telegram)'))}</span><input id="eC" maxlength="160" value="${esc(e.contact || '')}"></label></div>
    <label class="field"><span>${esc(T('Batafsil havola (https://, ixtiyoriy)'))}</span><input id="eLk" maxlength="500" value="${esc(e.link || '')}"></label>
    <label class="field"><span>${esc(T('Tavsif: nima qilinadi, nima olib kelish kerak'))}</span><textarea id="eD" maxlength="3000" style="min-height:110px">${esc(e.description || '')}</textarea></label>
    ${isStaff() ? `<label class="field"><span>${esc(T('Tashkilot'))}</span><select id="eG"><option value="">—</option>${S.data.orgs.map(o => `<option value="${o.id}" ${e.org_id === o.id ? 'selected' : ''}>${esc(o.short_name || o.name)}</option>`).join('')}</select></label>` : ''}
    <label class="check"><input type="checkbox" id="eDr" ${e.status === 'draft' ? 'checked' : ''}> ${esc(T('Qoralama sifatida saqlash (fuqarolarga ko‘rinmaydi)'))}</label><div class="form-error"></div>`,
    actions: [{ t: T('Bekor qilish'), v: null }, { t: e.id ? T('Saqlash') : T('E’lon qilish'), cls: 'btn-primary', run: async ov => {
      const num = id => { const x = $(id, ov).value.trim().replace(',', '.'); return x === '' ? null : Number(x); };
      const st = $('#eS', ov).value, en = $('#eE', ov).value;
      const n = { id: e.id, title: $('#eT', ov).value.trim(), type: $('#eY', ov).value, region: $('#eR', ov).value || null,
        starts_at: st ? new Date(st).toISOString() : null, ends_at: en ? new Date(en).toISOString() : null,
        place: $('#eP', ov).value.trim(), lat: num('#eLa'), lng: num('#eLo'), max_people: num('#eM'),
        organizer: $('#eO', ov).value.trim(), contact: $('#eC', ov).value.trim(), link: $('#eLk', ov).value.trim(), description: $('#eD', ov).value.trim(),
        org_id: isStaff() ? ($('#eG', ov).value || null) : me().org_id,
        status: $('#eDr', ov).checked ? 'draft' : (e.status === 'cancelled' ? 'cancelled' : 'published') };
      if (n.title.length < 5) throw new Error('Sarlavha kamida 5 belgidan iborat bo‘lsin');
      if (!n.starts_at) throw new Error('Boshlanish vaqtini kiriting');
      if (n.ends_at && n.ends_at < n.starts_at) throw new Error('Tugash vaqti boshlanishdan keyin bo‘lsin');
      if ((n.lat == null) !== (n.lng == null) || (n.lat != null && (!isFinite(n.lat) || !isFinite(n.lng) || Math.abs(n.lat) > 90 || Math.abs(n.lng) > 180))) throw new Error('Koordinatalarni to‘g‘ri kiriting (ikkalasini ham)');
      if (n.max_people != null && !(n.max_people >= 1)) throw new Error('Ishtirokchilar chegarasi musbat son bo‘lsin');
      if (n.link && !/^https:\/\/\S+$/.test(n.link)) throw new Error('Havola https:// bilan boshlansin');
      await S.store.saveEvent(n);
    } }] });
  if (v) toast(T('Saqlandi'));
  return !!v;
}

// ---------- Javob shablonlari ----------
PAGES.templates = el => {
  const mine = t => me().role === 'admin' || (isHead() && t.org_id === me().org_id);
  const canAdd = me().role === 'admin' || isHead();
  el.innerHTML = `<div class="page-head"><div><h1>📝 ${esc(T('Javob shablonlari'))}</h1><p>${esc(T('Fuqarolarga tez va bir xil sifatda javob berish uchun tayyor matnlar'))}</p></div><div class="row">${canAdd ? `<button class="btn btn-primary" id="addT">➕ ${esc(T('Shablon qo‘shish'))}</button>` : ''}</div></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${S.data.templates.map(t => `<div class="card"><div class="card-h"><h3>${esc(t.title)}</h3><span class="chip" style="margin-left:auto">${t.org_id ? esc(orgShort(t.org_id)) : esc(T('Umumiy'))}</span></div><div class="card-b"><p style="margin:0 0 12px; white-space:pre-wrap; color:var(--ink-2)">${esc(t.body)}</p>${mine(t) ? `<div class="row"><button class="btn btn-sm" data-ed="${t.id}">✏️ ${esc(T('Tahrirlash'))}</button><button class="btn btn-sm btn-danger" data-del="${t.id}">🗑️ ${esc(T('O‘chirish'))}</button></div>` : ''}</div></div>`).join('') || `<div class="empty">${esc(T('Shablon yo‘q'))}</div>`}</div>`;
  const dlg = async t => {
    const v = await modal({ wide: true, title: t.id ? T('Shablonni tahrirlash') : T('Yangi shablon'), body: `<label class="field"><span>${esc(T('Sarlavha'))}</span><input id="tT" value="${esc(t.title || '')}"></label><label class="field"><span>${esc(T('Matn'))}</span><textarea id="tB" style="min-height:160px">${esc(t.body || '')}</textarea></label>${me().role === 'admin' ? `<label class="field"><span>${esc(T('Kim uchun'))}</span><select id="tO"><option value="">${esc(T('Barcha idoralar'))}</option>${S.data.orgs.filter(o => !o.central).map(o => `<option value="${o.id}" ${t.org_id === o.id ? 'selected' : ''}>${esc(o.short_name)}</option>`).join('')}</select></label>` : ''}<div class="form-error"></div>`,
      actions: [{ t: T('Bekor qilish'), v: null }, { t: T('Saqlash'), cls: 'btn-primary', run: async ov => {
        const n = { id: t.id, title: $('#tT', ov).value.trim(), body: $('#tB', ov).value.trim(), org_id: me().role === 'admin' ? ($('#tO', ov).value || null) : me().org_id };
        if (!n.title || n.body.length < 20) throw new Error('Sarlavha va kamida 20 belgili matn kiriting');
        await S.store.saveTemplate(n);
      } }] });
    if (v) { S.data = await S.store.load(); toast(T('Saqlandi')); route(true); }
  };
  if ($('#addT')) $('#addT').onclick = () => dlg({});
  $$('[data-ed]').forEach(b => b.onclick = () => dlg(Object.assign({}, S.data.templates.find(t => t.id === b.dataset.ed))));
  $$('[data-del]').forEach(b => b.onclick = async () => { if (await confirmBox(T('Shablonni o‘chirish'), T('Bu shablon o‘chiriladi.'), T('O‘chirish'), true)) { try { await S.store.deleteTemplate(b.dataset.del); S.data = await S.store.load(); route(true); } catch (e) { toast(T(e.message), 'err'); } } });
};

// ---------- Faoliyat jurnali ----------
PAGES.journal = el => {
  const q = S.route.q;
  let H = S.data.history.slice().sort((a, b) => a.created_at < b.created_at ? 1 : -1);
  if (q.ev) H = H.filter(h => h.event === q.ev);
  if (q.who) H = H.filter(h => h.actor === q.who);
  const total = H.length, lim = Math.max(100, +q.n || 100); H = H.slice(0, lim);
  const evs = ['created', 'org', 'forwarded', 'status', 'assigned', 'deadline', 'note', 'rejected', 'proof', 'priority', 'cancelled'];
  const people = S.data.profiles.filter(p => PORTAL_ROLES.includes(p.role));
  el.innerHTML = `<div class="page-head"><div><h1>🧾 ${esc(T('Faoliyat jurnali'))}</h1><p>${esc(T('Arizalar bo‘yicha har bir amal: kim, qachon va nima qildi'))}</p></div>
    <div class="row"><select class="input" id="jev" style="width:auto"><option value="">${esc(T('Barcha amallar'))}</option>${evs.map(e => `<option value="${e}" ${q.ev === e ? 'selected' : ''}>${histText({ event: e, status: 0 })[1].replace(/<[^>]+>/g, '').replace(/:.*/, '')}</option>`).join('')}</select>
    <select class="input" id="jwho" style="width:auto"><option value="">${esc(T('Barcha xodimlar'))}</option>${people.map(p => `<option value="${p.id}" ${q.who === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>
    <button class="btn" id="csv">⬇️ CSV</button></div></div>
    <div class="card"><div class="card-b"><ul class="tl">${H.map(h => { const r = S.data.reports.find(x => x.id === h.report_id); const [c, t, note] = histText(h); return `<li style="--c:${c}"><span class="td"></span><div class="tt">${t} — <a href="#/report/${h.report_id}">${esc(r ? r.case_no : '')}</a></div><div class="tm">${esc(fmtDT(h.created_at))} · ${esc(h.actor ? personName(h.actor) : T('Tizim'))}</div>${note ? `<div class="tn">${esc(String(note).slice(0, 240))}</div>` : ''}</li>`; }).join('') || `<li class="muted">${esc(T('Yozuv yo‘q'))}</li>`}</ul>
    ${total > lim ? `<div class="row" style="justify-content:space-between; margin-top:10px"><span class="muted small">${esc(T('{a} / {n} ta yozuv ko‘rsatildi', { a: lim, n: total }))}</span><button class="btn btn-sm" id="jmore">${esc(T('Yana ko‘rsatish'))}</button></div>` : ''}</div></div>`;
  const upd = n => go('#/journal?' + new URLSearchParams(Object.assign({ ev: $('#jev').value, who: $('#jwho').value }, n ? { n } : {})).toString());
  if ($('#jmore')) $('#jmore').onclick = () => { const y = scrollY; upd(lim + 200); requestAnimationFrame(() => scrollTo(0, y)); };
  $('#jev').onchange = () => upd(); $('#jwho').onchange = () => upd();
  $('#csv').onclick = () => { let A = S.data.history.slice().sort((a, b) => a.created_at < b.created_at ? 1 : -1); if (q.ev) A = A.filter(h => h.event === q.ev); if (q.who) A = A.filter(h => h.actor === q.who); downloadCsv([[T('Sana'), T('Ariza'), T('Amal'), T('Izoh'), T('Xodim')]].concat(A.map(h => { const r = S.data.reports.find(x => x.id === h.report_id); return [fmtDT(h.created_at), r ? r.case_no : '', histText(h)[1].replace(/<[^>]+>/g, ''), h.note || '', h.actor ? personName(h.actor) : T('Tizim')]; })), 'faoliyat-jurnali'); };
};

// ---------- Sozlamalar ----------
PAGES.settings = el => {
  if (me().role !== 'admin') return go('#/dashboard');
  const s = S.data.settings, sla = Object.assign({}, DEFAULT_SETTINGS.sla_days, s.sla_days || {}), an = Object.assign({}, DEFAULT_SETTINGS.announcement, s.announcement || {});
  el.innerHTML = `<div class="page-head"><div><h1>⚙️ ${esc(T('Sozlamalar'))}</h1><p>${esc(T('Murojaatlarni qabul qilish va taqsimlash qoidalari'))}</p></div></div>
    <div class="cards" style="max-width:820px">
      <div class="card"><div class="card-h"><h3>📥 ${esc(T('Qabul qilish'))}</h3></div><div class="card-b" style="display:grid; gap:14px">
        <label class="check"><input type="checkbox" id="sAcc" ${s.accepting_reports !== false ? 'checked' : ''}> ${esc(T('Fuqarolardan yangi murojaatlar qabul qilinadi'))}</label>
        <label class="check"><input type="checkbox" id="sAuto" ${s.auto_assign ? 'checked' : ''}> ${esc(T('Yangi arizani toifa va hudud bo‘yicha idoraga avtomatik yo‘naltirish'))}</label>
        <div class="grid2"><label class="field"><span>${esc(T('Fuqaro arizasini tahrirlashi mumkin bo‘lgan kunlar'))}</span><input type="number" id="sEdit" min="0" max="30" value="${esc(s.edit_days ?? 5)}"></label>
        <label class="field"><span>${esc(T('Bir fuqaroning kunlik ariza limiti (0 = cheklanmagan)'))}</span><input type="number" id="sLim" min="0" max="100" value="${esc(s.daily_limit ?? 10)}"></label></div>
      </div></div>
      <div class="card"><div class="card-h"><h3>⏱️ ${esc(T('Ko‘rib chiqish muddatlari (kun)'))}</h3></div><div class="card-b">
        <p class="muted small" style="margin:0 0 12px">${esc(T('Qonunchilikka ko‘ra murojaatlar 15 kun ichida ko‘rib chiqiladi. Shoshilinch toifalar uchun qisqaroq muddat belgilash mumkin.'))}</p>
        <div class="grid3">${CATEGORIES.map(c => `<label class="field"><span>${c.icon} ${esc(T(c.t))}</span><input type="number" class="sSla" data-k="${c.k}" min="1" max="15" value="${esc(sla[c.k])}"></label>`).join('')}</div>
      </div></div>
      <div class="card"><div class="card-h"><h3>📢 ${esc(T('Ilovadagi e’lon'))}</h3></div><div class="card-b" style="display:grid; gap:14px">
        <p class="muted small" style="margin:0">${esc(T('Yoqilgan e’lon fuqarolar ilovasining bosh sahifasida ko‘rinadi (masalan, shanbalik yoki texnik ishlar haqida).'))}</p>
        <label class="check"><input type="checkbox" id="sAnOn" ${an.enabled ? 'checked' : ''}> ${esc(T('E’lonni ko‘rsatish'))}</label>
        <label class="field"><span>${esc(T('Matn (o‘zbekcha)'))}</span><textarea id="sAnUz" maxlength="300">${esc(an.uz || '')}</textarea></label>
        <label class="field"><span>${esc(T('Matn (ruscha)'))}</span><textarea id="sAnRu" maxlength="300">${esc(an.ru || '')}</textarea></label>
      </div></div>
      <div class="row"><button class="btn btn-primary" id="sSave">💾 ${esc(T('Saqlash'))}</button></div>
    </div>`;
  $('#sSave').onclick = async () => {
    const n = { accepting_reports: $('#sAcc').checked, auto_assign: $('#sAuto').checked, edit_days: +$('#sEdit').value || 0, daily_limit: +$('#sLim').value || 0, sla_days: Object.fromEntries($$('.sSla').map(i => [i.dataset.k, Math.min(15, Math.max(1, +i.value || 15))])), announcement: { enabled: $('#sAnOn').checked, uz: $('#sAnUz').value.trim(), ru: $('#sAnRu').value.trim() } };
    if (n.announcement.enabled && !n.announcement.uz) return toast(T('E’lon matnini kiriting'), 'err');
    try { await S.store.saveSettings(n); S.data = await S.store.load(); toast(T('Sozlamalar saqlandi')); route(true); } catch (e) { toast(T(e.message), 'err'); }
  };
};

// =====================================================================
// GRAFIKLAR (kutubxonasiz SVG)
// =====================================================================
function lineChart(box, labels, series) {
  if (!box) return;
  const W = 640, H = 220, pl = 32, pr = 10, pt = 10, pb = 26, n = labels.length;
  const max = Math.max(4, ...series.flatMap(s => s.v)); const top = Math.ceil(max / 4) * 4;
  const x = i => pl + (n === 1 ? 0 : i * (W - pl - pr) / (n - 1)), y = v => pt + (H - pt - pb) * (1 - v / top);
  let g = '<g class="grid">'; for (let k = 0; k <= 4; k++) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(top * k / 4)}" y2="${y(top * k / 4)}"/>`; g += '</g>';
  let ax = '<g class="axis">'; for (let k = 0; k <= 4; k++) ax += `<text x="${pl - 6}" y="${y(top * k / 4) + 4}" text-anchor="end">${top * k / 4}</text>`;
  const step = Math.ceil(n / 7); labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) ax += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(l.length > 5 ? l.slice(5).replace('-', '.') : l)}</text>`; }); ax += '</g>';
  const paths = series.map(s => `<path d="${s.v.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')}" fill="none" stroke="${s.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.name).join(', '))}">${g}${ax}${paths}<line class="xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--ink-3)" stroke-dasharray="3 3" opacity="0"/>${series.map((s, k) => `<circle class="dot${k}" r="4" fill="${s.c}" stroke="var(--surface)" stroke-width="2" opacity="0"/>`).join('')}<rect x="${pl}" y="${pt}" width="${W - pl - pr}" height="${H - pt - pb}" fill="transparent" class="hit"/></svg>`;
  const svg = $('svg', box), hit = $('.hit', svg), xh = $('.xh', svg);
  hit.addEventListener('mousemove', e => {
    const b = svg.getBoundingClientRect(), px = (e.clientX - b.left) * W / b.width;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - pl) / ((W - pl - pr) / Math.max(1, n - 1)))));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('opacity', 1);
    series.forEach((s, k) => { const d = $('.dot' + k, svg); d.setAttribute('cx', x(i)); d.setAttribute('cy', y(s.v[i])); d.setAttribute('opacity', 1); });
    const lab = labels[i].length > 5 ? fmtD(labels[i]) : labels[i];
    tip(e, `<b>${esc(lab)}</b><br>` + series.map(s => `<span style="color:${cssColor(s.c)}">●</span> ${esc(s.name)}: <b>${s.v[i]}</b>`).join('<br>'));
  });
  hit.addEventListener('mouseleave', () => { tip(null); xh.setAttribute('opacity', 0); series.forEach((s, k) => $('.dot' + k, svg).setAttribute('opacity', 0)); });
}
function columnChart(box, items) {
  if (!box) return;
  const W = 640, H = 170, pl = 28, pb = 22, pt = 8, n = items.length, max = Math.max(1, ...items.map(i => i.v)), bw = (W - pl) / n;
  const y = v => pt + (H - pt - pb) * (1 - v / max);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img"><g class="grid"><line x1="${pl}" x2="${W}" y1="${H - pb}" y2="${H - pb}"/></g><g class="axis">${items.map((it, i) => i % 3 === 0 ? `<text x="${pl + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(it.label.slice(0, 2))}</text>` : '').join('')}<text x="${pl - 6}" y="${y(max) + 4}" text-anchor="end">${max}</text></g>${items.map((it, i) => { const h = Math.max(it.v ? 2 : 0, H - pb - y(it.v)); return `<path data-tip="<b>${esc(it.label)}</b><br>${it.v} ${esc(T('ta murojaat'))}" d="M${(pl + i * bw + 1).toFixed(1)} ${H - pb} v-${Math.max(0, h - 4).toFixed(1)} q0 -4 4 -4 h${(bw - 10).toFixed(1)} q4 0 4 4 v${Math.max(0, h - 4).toFixed(1)} z" fill="var(--series-1)"/>`; }).join('')}</svg>`;
  bindTips(box);
}
function bars(box, rows) {
  if (!box) return;
  const max = Math.max(1, ...rows.map(r => r.v));
  box.innerHTML = `<div class="bars">${rows.map(r => `<div class="bar-row ${r.href ? 'click' : ''}" ${r.href ? `onclick="go('${r.href}')"` : ''} data-tip="<b>${esc(r.label)}</b><br>${r.v} ${esc(T('ta'))}"><span class="bl">${esc(r.label)}</span><span class="bt"><i style="width:${r.v / max * 100}%"></i></span><span class="bv">${r.v}</span></div>`).join('')}</div>`;
  bindTips(box);
}
function donut(box, items) {
  if (!box) return;
  const tot = items.reduce((s, i) => s + i.v, 0) || 1, R = 54, C = 2 * Math.PI * R;
  let off = 0;
  const segs = items.map(it => { const len = it.v / tot * C; const gap = it.v && len > 3 ? 2 : 0; const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${it.c}" stroke-width="20" stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" data-tip="<b>${esc(it.label)}</b><br>${it.v} (${pct(it.v, tot)}%)" style="cursor:pointer" ${it.href ? `onclick="go('${it.href}')"` : ''}/>`; off += len; return s; }).join('');
  box.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 140 140" width="150" height="150" role="img"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--surface-3)" stroke-width="20"/>${segs}<text x="70" y="68" text-anchor="middle" font-family="Manrope" font-weight="800" font-size="24" fill="var(--ink)">${nf(items.reduce((s, i) => s + i.v, 0))}</text><text x="70" y="86" text-anchor="middle" font-size="10" fill="var(--ink-3)">${esc(T('jami'))}</text></svg>
    <div class="donut-legend">${items.map(it => `<div ${it.href ? `onclick="go('${it.href}')"` : ''}><i style="width:10px;height:10px;border-radius:3px;background:${it.c};display:inline-block"></i>${esc(it.label)}<b>${it.v}</b></div>`).join('')}</div></div>`;
  bindTips(box);
}

// =====================================================================
// RUS TILI LUG'ATI
// =====================================================================
const RU = {
  "Tozalash aksiyalari": "Экологические акции",
  "Hashar, ko‘chat ekish va volontyorlik tadbirlari. E’lon qilinganlari fuqarolar ilovasida darhol ko‘rinadi, ular “Qatnashaman” tugmasini bosadi.": "Субботники, посадка деревьев и волонтёрские мероприятия. Опубликованные сразу видны гражданам в приложении, они нажимают «Участвую».",
  "Aksiya e’lon qilish": "Объявить акцию",
  "Yuklanmoqda…": "Загрузка…",
  "Aksiyalarni yuklab bo‘lmadi": "Не удалось загрузить акции",
  "Tozalash / hashar": "Уборка / хашар",
  "Daraxt ekish": "Посадка деревьев",
  "Volontyorlik": "Волонтёрство",
  "Ekologik aksiya": "Экологическая акция",
  "Qoralama": "Черновик",
  "O‘tkazildi": "Проведена",
  "E’lon qilingan": "Опубликована",
  "xaritada": "на карте",
  "kishi qatnashadi": "участников",
  "Joy qolmadi": "Мест нет",
  "Kelgusi": "Предстоящие",
  "Qoralamalar": "Черновики",
  "O‘tganlar": "Прошедшие",
  "Kelgusi aksiyalarga yozilganlar": "Записались на предстоящие",
  "Bu bo‘limda aksiya yo‘q": "В этом разделе нет акций",
  "Aksiyani bekor qilish": "Отменить акцию",
  "Fuqarolar ilovasida aksiya “Bekor qilingan” deb ko‘rsatiladi.": "В приложении граждан акция будет показана как «Отменена».",
  "Aksiyani o‘chirish": "Удалить акцию",
  "Aksiya va unga yozilganlar ro‘yxati butunlay o‘chiriladi.": "Акция и список записавшихся будут удалены полностью.",
  "Aksiyani tahrirlash": "Редактировать акцию",
  "Yangi aksiya": "Новая акция",
  "Masalan: Chilonzor tumanida umumshahar shanbaligi": "Например: общегородской субботник в Чиланзарском районе",
  "Turi": "Тип",
  "Boshlanishi": "Начало",
  "Tugashi (ixtiyoriy)": "Окончание (необязательно)",
  "Joy (manzil, mo‘ljal)": "Место (адрес, ориентир)",
  "Kenglik (lat)": "Широта (lat)",
  "Uzunlik (lng)": "Долгота (lng)",
  "Ishtirokchilar chegarasi": "Лимит участников",
  "cheksiz": "без лимита",
  "Tashkilotchi": "Организатор",
  "Aloqa (telefon yoki Telegram)": "Контакт (телефон или Telegram)",
  "Batafsil havola (https://, ixtiyoriy)": "Ссылка на подробности (https://, необязательно)",
  "Tavsif: nima qilinadi, nima olib kelish kerak": "Описание: что будет, что взять с собой",
  "Tashkilot": "Организация",
  "Qoralama sifatida saqlash (fuqarolarga ko‘rinmaydi)": "Сохранить как черновик (не видно гражданам)",
  "E’lon qilish": "Опубликовать",
  "Sarlavha kamida 5 belgidan iborat bo‘lsin": "Заголовок — не короче 5 символов",
  "Boshlanish vaqtini kiriting": "Укажите время начала",
  "Tugash vaqti boshlanishdan keyin bo‘lsin": "Окончание должно быть позже начала",
  "Koordinatalarni to‘g‘ri kiriting (ikkalasini ham)": "Введите корректные координаты (обе)",
  "Ishtirokchilar chegarasi musbat son bo‘lsin": "Лимит участников — положительное число",
  "Havola https:// bilan boshlansin": "Ссылка должна начинаться с https://",
  'Fuqaro bloklangan: yangi ariza yubora olmaydi': 'Гражданин заблокирован: не может отправлять новые обращения', 'Blokdan chiqarish': 'Разблокировать', 'Fuqaroni bloklash (spam, haqorat)': 'Заблокировать гражданина (спам, оскорбления)', 'Fuqaroni bloklash': 'Блокировка гражданина',
  'Bloklangan fuqaro ilovadan yangi ariza yubora olmaydi. Avvalgi arizalari ko‘rib chiqilishda davom etadi.': 'Заблокированный гражданин не сможет отправлять новые обращения. Прежние обращения продолжают рассматриваться.', 'Bloklash': 'Заблокировать', 'Fuqaro bloklandi': 'Гражданин заблокирован', 'Fuqaro blokdan chiqarildi': 'Гражданин разблокирован',
  'Ilovadagi e’lon': 'Объявление в приложении', 'Yoqilgan e’lon fuqarolar ilovasining bosh sahifasida ko‘rinadi (masalan, shanbalik yoki texnik ishlar haqida).': 'Включённое объявление отображается на главной странице приложения граждан (например, о субботнике или техработах).', 'E’lonni ko‘rsatish': 'Показывать объявление', 'Matn (o‘zbekcha)': 'Текст (узбекский)', 'Matn (ruscha)': 'Текст (русский)', 'E’lon matnini kiriting': 'Введите текст объявления',
  'Yangi': 'Новое', 'Ko‘rib chiqilmoqda': 'На рассмотрении', 'Ijroda': 'На исполнении', 'Bartaraf etildi': 'Устранено', 'Yopildi': 'Закрыто',
  'Chiqindi': 'Отходы', 'Havo ifloslanishi': 'Загрязнение воздуха', 'Suv ifloslanishi': 'Загрязнение воды', 'Daraxt kesish': 'Вырубка деревьев', 'Tuproq / yer': 'Почва / земля', 'Boshqa': 'Другое',
  'Oddiy': 'Обычная', 'Muhim': 'Важная', 'Shoshilinch': 'Срочная',
  'Vazirlik administratori': 'Администратор министерства', 'Vazirlik dispetcheri': 'Диспетчер министерства', 'Idora rahbari': 'Руководитель ведомства', 'Ijrochi (inspektor)': 'Исполнитель (инспектор)', 'Fuqaro': 'Гражданин',
  'Toshkent shahri': 'г. Ташкент', 'Toshkent viloyati': 'Ташкентская область', 'Andijon viloyati': 'Андижанская область', 'Buxoro viloyati': 'Бухарская область', 'Farg‘ona viloyati': 'Ферганская область', 'Jizzax viloyati': 'Джизакская область', 'Xorazm viloyati': 'Хорезмская область', 'Namangan viloyati': 'Наманганская область', 'Navoiy viloyati': 'Навоийская область', 'Qashqadaryo viloyati': 'Кашкадарьинская область', 'Qoraqalpog‘iston Respublikasi': 'Республика Каракалпакстан', 'Samarqand viloyati': 'Самаркандская область', 'Sirdaryo viloyati': 'Сырдарьинская область', 'Surxondaryo viloyati': 'Сурхандарьинская область',
  'Respublika': 'Республика', 'Taqsimlanmagan': 'Не распределено', 'Xodim': 'Сотрудник',
  'hozirgina': 'только что', '{n} daq. oldin': '{n} мин назад', '{n} soat oldin': '{n} ч назад', '{n} kun oldin': '{n} дн. назад',
  'Bekor qilingan': 'Отменено', 'Kechikib yopilgan': 'Закрыто с опозданием', 'O‘z vaqtida': 'В срок', '{n} kun kechikdi': 'просрочено на {n} дн.', '{n} soat qoldi': 'осталось {n} ч', '{n} kun qoldi': 'осталось {n} дн.', 'Rad etildi': 'Отклонено',
  'Yopish': 'Закрыть', 'Bekor qilish': 'Отмена', 'Tasdiqlash': 'Подтвердить',
  'Ekologik murojaatlar bilan ishlash tizimi': 'Система работы с экологическими обращениями',
  'Fuqarolarning ekologik murojaatlari — bitta oynada': 'Экологические обращения граждан — в одном окне',
  'Vazirlik va hududiy idoralar uchun portal: murojaatlarni qabul qilish, ijrochiga biriktirish, muddatni nazorat qilish va fuqaroga rasmiy javob berish.': 'Портал для министерства и территориальных ведомств: приём обращений, назначение исполнителя, контроль сроков и официальный ответ гражданину.',
  'Avtomatik taqsimlash': 'Автоматическое распределение', 'Ariza toifasi va hududiga qarab mas’ul idoraga o‘zi tushadi.': 'Обращение само попадает в ответственное ведомство по категории и региону.',
  'Muddat nazorati': 'Контроль сроков', 'Har bir ariza uchun muddat, kechikayotganlar qizil bilan ajratiladi.': 'Срок по каждому обращению, просроченные выделены красным.',
  'Aniq joy va surat': 'Точное место и фото', 'Koordinata, surat va fuqaro tavsifi — joyni izlash shart emas.': 'Координаты, фото и описание — не нужно искать место.',
  'Ijro intizomi reytingi': 'Рейтинг исполнительской дисциплины', 'Idoralar va xodimlar kesimida natijalar, hisobotlar Excel’ga.': 'Результаты по ведомствам и сотрудникам, отчёты в Excel.',
  'Tizimga kirish': 'Вход в систему', 'Idora xodimining ish emaili va paroli bilan kiring.': 'Войдите с рабочей почтой и паролем сотрудника.',
  'Demo rejim': 'Демо-режим', 'Ma’lumotlar bazasi hali ulanmagan. Barcha amallarni namunaviy ma’lumotlarda sinab ko‘rishingiz mumkin, ular faqat shu brauzerda saqlanadi.': 'База данных ещё не подключена. Все действия можно опробовать на демо-данных, они хранятся только в этом браузере.',
  'Email': 'Email', 'Parol': 'Пароль', 'Kirish': 'Войти', 'yoki tayyor demo hisob bilan': 'или с готовой демо-учётной записью',
  'Barcha idoralar va arizalar, taqsimlash, sozlamalar': 'Все ведомства и обращения, распределение, настройки',
  'Taqsimlanmagan arizalarni idoralarga yo‘naltiradi': 'Направляет нераспределённые обращения в ведомства',
  'Idora arizalari, ijrochi tayinlash, muddat': 'Обращения ведомства, назначение исполнителя, сроки',
  'O‘ziga biriktirilgan arizalar ijrosi': 'Исполнение назначенных ему обращений',
  'Chiqindi va obodonlashtirish arizalari': 'Обращения по отходам и благоустройству',
  'Bunday hisob topilmadi. Demo rejimda quyidagi tayyor hisoblardan birini tanlang.': 'Учётная запись не найдена. В демо-режиме выберите одну из готовых записей ниже.',
  'Hisobingiz bloklangan': 'Ваша учётная запись заблокирована', 'Email yoki parol noto‘g‘ri': 'Неверный email или пароль',
  'Bu hisobga portalga kirish huquqi berilmagan. Vazirlik administratoriga murojaat qiling.': 'У этой учётной записи нет доступа к порталу. Обратитесь к администратору министерства.',
  'Hisobingiz hali idoraga biriktirilmagan.': 'Ваша учётная запись ещё не привязана к ведомству.',
  'Yuklanmoqda...': 'Загрузка...', 'Ma’lumotlarni yuklab bo‘lmadi': 'Не удалось загрузить данные',
  'Yangi murojaat: {n}': 'Новое обращение: {n}',
  'Ish stoli': 'Рабочий стол', 'Bosh sahifa': 'Главная', 'Kiruvchi arizalar': 'Входящие обращения', 'Mening topshiriqlarim': 'Мои поручения', 'Muddati o‘tganlar': 'Просроченные',
  'Nazorat va tahlil': 'Контроль и анализ', 'Ijro nazorati': 'Контроль исполнения', 'Xarita': 'Карта', 'Tahlil va hisobotlar': 'Аналитика и отчёты',
  'Ma’lumotnoma': 'Справочники', 'Tashkilotlar': 'Организации', 'Xodimlar': 'Сотрудники', 'Javob shablonlari': 'Шаблоны ответов', 'Faoliyat jurnali': 'Журнал действий', 'Sozlamalar': 'Настройки',
  'Idoralar portali': 'Портал ведомств', 'Ekologiya vazirligi': 'Министерство экологии', 'Ma’lumotlar': 'Данные', 'demo (brauzerda)': 'демо (в браузере)',
  'Menyu': 'Меню', 'Ariza raqami, manzil yoki matn bo‘yicha qidirish': 'Поиск по номеру, адресу или тексту', 'Mavzu': 'Тема', 'Bildirishnomalar': 'Уведомления',
  'Namunaviy ma’lumotlar. Haqiqiy arizalar uchun Supabase’ni ulang.': 'Демо-данные. Для реальных обращений подключите Supabase.',
  'Fuqarolardan yangi ariza kelishini taqlid qilish': 'Имитировать поступление новых обращений', 'Hozir bitta ariza yuborish': 'Отправить одно обращение сейчас',
  'Sizga biriktirildi: {n}': 'Назначено вам: {n}', 'Muddati o‘tdi: {n}': 'Срок истёк: {n}', 'Muddat tugayapti: {n}': 'Срок истекает: {n}',
  'Hammasini o‘qildi deb belgilash': 'Отметить всё прочитанным', 'Yangi bildirishnoma yo‘q': 'Новых уведомлений нет',
  'Ovozli signal yoqilgan': 'Звуковой сигнал включён', 'Ovozli signal o‘chirilgan': 'Звуковой сигнал выключен', 'Ovozli signal yoqildi': 'Звук включён', 'Ovozli signal o‘chirildi': 'Звук выключен',
  'Boshqa demo hisobga o‘tish': 'Сменить демо-учётку', 'Demo ma’lumotlarni qayta tiklash': 'Сбросить демо-данные', 'Chiqish': 'Выйти',
  'Siz kiritgan barcha o‘zgarishlar o‘chadi va boshlang‘ich namunaviy ma’lumotlar qaytadi.': 'Все ваши изменения будут удалены, вернутся исходные демо-данные.', 'Qayta tiklash': 'Сбросить', 'Demo ma’lumotlar qayta tiklandi': 'Демо-данные сброшены',
  'Xayrli tong': 'Доброе утро', 'Xayrli kun': 'Добрый день', 'Xayrli kech': 'Добрый вечер',
  'Bugun {d}. Sizning hududingizdagi murojaatlar holati.': 'Сегодня {d}. Состояние обращений в вашей зоне.',
  'Barcha arizalar': 'Все обращения', 'Yangilarini ko‘rish': 'Смотреть новые',
  'Yangi, ko‘rilmagan': 'Новые, не рассмотрены', 'bugun {n} ta keldi': 'сегодня поступило {n}', 'ko‘rib chiqilmoqda va ijroda': 'на рассмотрении и исполнении',
  'Muddati o‘tgan': 'Просрочено', 'zudlik bilan hal qilish kerak': 'требуют срочного решения', '48 soatda muddati tugaydi': 'Срок истекает за 48 ч', 'nazoratga oling': 'возьмите на контроль',
  '30 kunda hal qilindi': 'Решено за 30 дней', 'o‘rtacha {n} kunda': 'в среднем за {n} дн.', 'O‘z vaqtida ijro': 'Исполнено в срок', 'oxirgi 30 kun': 'последние 30 дней',
  'Hammasi': 'Все', 'Sizga biriktirilgan ochiq ariza yo‘q': 'Нет открытых обращений, назначенных вам',
  'Oxirgi 30 kun: kelgan va hal qilingan': 'Последние 30 дней: поступило и решено', 'Kelgan': 'Поступило', 'Hal qilingan': 'Решено',
  'Muddati yaqin va o‘tgan arizalar': 'Обращения с близким и истёкшим сроком', 'Ochiq ariza yo‘q': 'Открытых обращений нет',
  'Holatlar bo‘yicha': 'По статусам', 'Muammo turlari (ochiq)': 'Типы проблем (открытые)', 'So‘nggi murojaatlar': 'Последние обращения',
  'Menga biriktirilgan': 'Назначены мне', 'Ijrochisiz': 'Без исполнителя', 'Muddati yaqin': 'Срок близок', 'Ochiq': 'Открытые', 'Yopilgan': 'Закрытые',
  '{n} ta ariza topildi': 'Найдено обращений: {n}', 'Excel (CSV)': 'Excel (CSV)',
  'Qidirish: raqam, manzil, matn, fuqaro': 'Поиск: номер, адрес, текст, заявитель', 'Barcha turlar': 'Все типы', 'Barcha holatlar': 'Все статусы', 'Barcha hududlar': 'Все регионы', 'Barcha idoralar': 'Все ведомства', 'Barcha ijrochilar': 'Все исполнители', 'Har qanday muhimlik': 'Любая важность',
  'Sanadan': 'С даты', 'Sanagacha': 'По дату', 'Tozalash': 'Сбросить', 'Hammasini tanlash': 'Выбрать все',
  'Raqam': 'Номер', 'Muammo': 'Проблема', 'Hudud': 'Регион', 'Idora': 'Ведомство', 'Ijrochi': 'Исполнитель', 'Holat': 'Статус', 'Muddat': 'Срок',
  'Bu ro‘yxatda ariza yo‘q': 'В этом списке нет обращений', '{a}–{b} / {n}': '{a}–{b} из {n}', 'Surat bor': 'Есть фото',
  '{n} ta tanlandi': 'Выбрано: {n}', 'Ijrochiga biriktirish': 'Назначить исполнителя', 'Idoraga yo‘naltirish': 'Направить в ведомство', 'Ko‘rib chiqishga qabul qilish': 'Принять к рассмотрению',
  '{n} ta ariza qabul qilindi': 'Принято обращений: {n}',
  'Kelgan sana': 'Дата поступления', 'Toifa': 'Категория', 'Muhimlik': 'Важность', 'Manzil': 'Адрес', 'Tavsif': 'Описание', 'Hal qilingan sana': 'Дата решения', 'Muddatda': 'В срок', 'Fuqaroga javob': 'Ответ гражданину', 'ha': 'да', 'yo‘q': 'нет',
  'Fayl yuklab olindi: {n} qator': 'Файл скачан: {n} строк',
  'Ariza topilmadi yoki uni ko‘rishga ruxsatingiz yo‘q.': 'Обращение не найдено или у вас нет доступа.', 'Arizalar ro‘yxatiga qaytish': 'Вернуться к списку',
  'Kechikkan': 'Просрочено', 'Muddatida': 'В срок', '{n} kun': '{n} дн.', '{n} soat': '{n} ч', 'Fuqaro arizani bekor qilgan': 'Гражданин отменил обращение', 'Yopilgan: {d}': 'Закрыто: {d}', 'muddat o‘tib ketdi ({d})': 'срок истёк ({d})', 'muddat: {d}': 'срок: {d}',
  'Muddat uzaytirilgan': 'Срок продлён', 'Javob xati': 'Письмо-ответ', 'Havola': 'Ссылка',
  'Fuqaro murojaati': 'Обращение гражданина', 'tahrirlangan': 'изменено', 'Suratlar': 'Фотографии', 'Joylashuv': 'Местоположение', 'Koordinata': 'Координаты',
  'Fuqaroga berilgan javob': 'Ответ гражданину', 'fuqaro ilovada ko‘radi': 'гражданин видит в приложении', 'Rad etish sababi': 'Причина отказа',
  'Ijro tarixi va ichki izohlar': 'История исполнения и внутренние комментарии', 'izohlarni fuqaro ko‘rmaydi': 'гражданин не видит комментарии',
  'Ichki izoh yozing (masalan: joyiga chiqildi, dalolatnoma tuzildi)': 'Внутренний комментарий (например: выезд на место, составлен акт)', 'Qo‘shish': 'Добавить',
  'biriktirilmagan': 'не назначен', 'uzaytirilgan': 'продлён', 'Qabul qilingan': 'Принято', 'Amallar': 'Действия', 'Murojaatchi': 'Заявитель', 'Anonim fuqaro': 'Анонимный гражданин', 'Ko‘rsatish': 'Показать',
  'Shaxsiy ma’lumotlar faqat murojaatni hal qilish uchun ishlatiladi. Telefon raqami ko‘rilgani jurnalga yoziladi.': 'Персональные данные используются только для решения обращения. Просмотр телефона записывается в журнал.',
  'Fuqaro arizani bekor qilgan. Amallar mavjud emas.': 'Гражданин отменил обращение. Действия недоступны.', 'Bu ariza sizga biriktirilmagan. Faqat ko‘rish mumkin.': 'Обращение вам не назначено. Только просмотр.',
  'Mas’ul idoraga yo‘naltirish': 'Направить в ответственное ведомство', 'Ijrochini almashtirish': 'Сменить исполнителя', 'Ijrochi tayinlash': 'Назначить исполнителя',
  'Ijroga olish (joyiga chiqish)': 'Взять в работу (выезд на место)', 'Bajarilgan ish suratini almashtirish': 'Заменить фото выполненной работы', 'Bajarilgan ish suratini yuklash': 'Загрузить фото выполненной работы',
  'Hal qilindi — fuqaroga javob': 'Решено — ответ гражданину', 'Tasdiqlash va yopish': 'Утвердить и закрыть', 'Qayta ijroga qaytarish': 'Вернуть на исполнение', 'Muddatni o‘zgartirish': 'Изменить срок', 'Muhimlik darajasi': 'Уровень важности', 'Boshqa idoraga yo‘naltirish': 'Направить в другое ведомство', 'Rad etish (asossiz)': 'Отклонить (необоснованно)',
  'Izoh qo‘shildi': 'Комментарий добавлен', 'Havola nusxalandi': 'Ссылка скопирована', 'Fuqaro surati': 'Фото гражданина', 'Bajarilgan ish': 'Выполненная работа', 'Video biriktirilgan': 'Прикреплено видео', 'Fuqaro surat biriktirmagan': 'Гражданин не прикрепил фото',
  'izoh qoldirdi': 'оставил(а) комментарий', 'Tizim': 'Система', 'Tarix bo‘sh': 'История пуста',
  'Fuqaro murojaat yubordi': 'Гражданин отправил обращение', 'Idoraga yo‘naltirildi': 'Направлено в ведомство', 'Boshqa idoraga qayta yo‘naltirildi': 'Перенаправлено в другое ведомство', 'Ijrochi tayinlandi': 'Назначен исполнитель', 'Muddat belgilandi': 'Установлен срок', 'Fuqaroga javob yozildi': 'Написан ответ гражданину', 'Bajarilgan ish surati yuklandi': 'Загружено фото выполненной работы', 'Fuqaro arizani bekor qildi': 'Гражданин отменил обращение', 'Fuqaro arizani tahrirladi': 'Гражданин изменил обращение',
  'Ariza ko‘rib chiqishga qabul qilindi': 'Обращение принято к рассмотрению', 'Ariza ijroga olindi': 'Обращение взято в работу', 'Arizani yopish': 'Закрыть обращение',
  'Javob va bajarilgan ish tasdiqlanadi, ariza yopiladi. Fuqaro ilovada “Yakunlandi” holatini ko‘radi.': 'Ответ и выполненная работа утверждаются, обращение закрывается. Гражданин увидит статус «Завершено».',
  'Ariza yopildi': 'Обращение закрыто', 'Ariza “Ijroda” holatiga qaytadi va ijrochi qayta ishlaydi.': 'Обращение вернётся в статус «На исполнении».', 'Qaytarish': 'Вернуть', 'Ariza qayta ijroga qaytarildi': 'Обращение возвращено на исполнение',
  'Surat yuklanmoqda...': 'Загрузка фото...', 'Daraja': 'Уровень', 'Saqlash': 'Сохранить', 'Muhimlik o‘zgartirildi': 'Важность изменена',
  'Qonunchilikka ko‘ra murojaat 15 kun ichida ko‘rib chiqiladi; qo‘shimcha o‘rganish talab etilsa — kelgan kundan boshlab 30 kungacha uzaytiriladi.': 'По закону обращение рассматривается в течение 15 дней; при необходимости дополнительного изучения — продлевается до 30 дней со дня поступления.',
  'Yangi muddat': 'Новый срок', 'Eng uzoq muddat': 'Максимальный срок', 'Sabab (ichki izohga yoziladi)': 'Причина (запишется во внутренний комментарий)', 'Masalan: laboratoriya tahlili natijasi kutilmoqda': 'Например: ожидается результат лабораторного анализа',
  'Sanani tanlang': 'Выберите дату', 'Muddat murojaat kelgan kundan boshlab 30 kundan oshmasligi kerak': 'Срок не может превышать 30 дней со дня поступления', 'Muddatni uzaytirish sababini yozing': 'Укажите причину продления', 'Muddat o‘zgartirildi': 'Срок изменён', 'Muddat yangilandi': 'Срок обновлён',
  'Arizani rad etish': 'Отклонить обращение', 'Hal qilindi: fuqaroga javob': 'Решено: ответ гражданину', 'Tanlang...': 'Выберите...', 'Boshqa sabab': 'Другая причина', 'Sababni yozing': 'Укажите причину',
  'Javob fuqaroning ilovasida ko‘rinadi. Aniq, xushmuomala va bajarilgan ishni ko‘rsatgan holda yozing.': 'Ответ появится в приложении гражданина. Пишите ясно, вежливо и с описанием выполненной работы.',
  'Shablondan tanlash': 'Выбрать шаблон', 'Fuqaroga javob matni': 'Текст ответа гражданину', 'Bajarilgan ish suratini yuklash fuqaro ishonchini oshiradi (“Amallar” bo‘limida).': 'Фото выполненной работы повышает доверие граждан (раздел «Действия»).',
  'Rad etish': 'Отклонить', 'Javobni yuborish': 'Отправить ответ', 'Javob juda qisqa: kamida 20 belgi yozing': 'Ответ слишком короткий: минимум 20 символов', 'Rad etish sababini tanlang': 'Выберите причину отказа',
  'Ariza rad etildi, fuqaroga javob yuborildi': 'Обращение отклонено, ответ отправлен', 'Ariza hal qilindi, fuqaroga javob yuborildi': 'Обращение решено, ответ отправлен',
  'Murojaatda ko‘rsatilgan manzil bo‘yicha qoidabuzarlik aniqlanmadi.': 'По указанному адресу нарушение не выявлено.', 'Takroriy murojaat: ushbu holat bo‘yicha avvalroq javob berilgan.': 'Повторное обращение: ответ по этому случаю уже дан.', 'Ko‘rsatilgan daraxtlarni kesish uchun belgilangan tartibda ruxsatnoma olingan.': 'На вырубку указанных деревьев получено разрешение в установленном порядке.',
  'Bir vaqtda faqat bitta idoraning arizalarini biriktirish mumkin': 'Одновременно можно назначать обращения только одного ведомства', 'Bu idorada xodim yo‘q. Avval “Xodimlar” bo‘limida xodim qo‘shing.': 'В ведомстве нет сотрудников. Добавьте их в разделе «Сотрудники».',
  '{n} ta arizaga ijrochi tayinlash': 'Назначить исполнителя для {n} обращений', 'ochiq': 'открыто', 'kechikkan': 'просрочено', 'Bir vaqtda “Ko‘rib chiqilmoqda” holatiga o‘tkazish': 'Сразу перевести в статус «На рассмотрении»',
  'Topshiriq matni (ixtiyoriy, ichki izoh)': 'Текст поручения (необязательно, внутренний комментарий)', 'Masalan: 2 kun ichida joyiga chiqib, dalolatnoma tuzing': 'Например: в течение 2 дней выехать на место и составить акт',
  'Tayinlash': 'Назначить', 'Ijrochini tanlang': 'Выберите исполнителя', 'Topshiriq': 'Поручение', '{n} ta arizaga ijrochi tayinlandi': 'Исполнитель назначен для {n} обращений',
  '{n} ta arizani yo‘naltirish': 'Направить {n} обращений', 'tavsiya': 'рекомендуется', 'Toifa va hududga qarab tavsiya etilgan idora': 'Ведомство, рекомендованное по категории и региону', 'Yo‘naltirish sababi': 'Причина направления',
  'Masalan: masala chiqindi olib chiqish xizmati vakolatiga kiradi': 'Например: вопрос в компетенции службы вывоза отходов',
  'Yo‘naltirilgandan keyin ariza sizning ro‘yxatingizdan chiqadi va yangi idorada “Yangi” holatida paydo bo‘ladi.': 'После направления обращение исчезнет из вашего списка и появится в новом ведомстве со статусом «Новое».',
  'Yo‘naltirish': 'Направить', 'Idorani tanlang': 'Выберите ведомство', 'Yo‘naltirish sababini yozing': 'Укажите причину направления', '{n} ta ariza yo‘naltirildi': 'Направлено обращений: {n}',
  'Hurmatli': 'Уважаемый(ая)', 'fuqaro': 'гражданин', 'Sizning {d} sanadagi {n}-sonli murojaatingiz ({c}, {a}) ko‘rib chiqildi.': 'Ваше обращение № {n} от {d} ({c}, {a}) рассмотрено.', '[Javob hali yozilmagan]': '[Ответ ещё не написан]',
  'Javobdan norozi bo‘lsangiz, yuqori turuvchi organga yoki sudga murojaat qilishingiz mumkin.': 'Если вы не согласны с ответом, вы вправе обратиться в вышестоящий орган или суд.', 'Boshqarma boshlig‘i': 'Начальник управления', 'Mas’ul xodim': 'Ответственный сотрудник',
  'Oxirgi {n} kun': 'Последние {n} дн.', 'Idoralar kesimida ijro intizomi reytingi': 'Рейтинг исполнительской дисциплины по ведомствам', 'Xodimlar kesimida ijro intizomi': 'Исполнительская дисциплина по сотрудникам',
  '{n} ta ariza hali idoraga yo‘naltirilmagan.': '{n} обращений ещё не направлены в ведомства.', 'Taqsimlash': 'Распределить', 'Reyting': 'Рейтинг',
  'Ball = o‘z vaqtida ijro (60%) + hal qilinganlar ulushi (40%) − har bir kechikkan ariza uchun 3 ball': 'Балл = исполнение в срок (60%) + доля решённых (40%) − 3 балла за каждое просроченное',
  'O‘rtacha muddat': 'Средний срок', 'Ball': 'Балл', 'Tanlangan davrda ma’lumot yo‘q': 'Нет данных за период', 'Muddati o‘tgan arizalar': 'Просроченные обращения', 'Muddati o‘tgan ariza yo‘q — barakalla!': 'Просроченных обращений нет — отлично!',
  'O‘rtacha muddat (kun)': 'Средний срок (дн.)', 'O‘z vaqtida, %': 'В срок, %',
  'Murojaatlar xaritasi': 'Карта обращений', 'Har bir nuqta — fuqaro murojaati. Rang holatni bildiradi.': 'Каждая точка — обращение гражданина. Цвет показывает статус.', 'Ochiq arizalar': 'Открытые обращения',
  'Xarita kutubxonasi yuklanmadi. Internet aloqasini tekshiring.': 'Не удалось загрузить карту. Проверьте подключение к интернету.', 'Arizani ochish': 'Открыть обращение',
  'Tanlangan davr bo‘yicha umumiy ko‘rsatkichlar': 'Общие показатели за выбранный период', 'Hududlar hisoboti (CSV)': 'Отчёт по регионам (CSV)', 'Kelgan murojaatlar': 'Поступило обращений', 'kuniga o‘rtacha {n}': 'в среднем {n} в день', 'ta': 'шт.',
  'hal qilinganlar ichida': 'среди решённых', 'Qabul qilish tezligi': 'Скорость приёма', 'kelgandan qabul qilinguncha': 'от поступления до принятия', 'Hozir muddati o‘tgan': 'Сейчас просрочено', 'ochiq arizalar ichida': 'среди открытых', 'Rad etilgan': 'Отклонено', 'asossiz deb topilgan': 'признаны необоснованными',
  'Haftalar bo‘yicha dinamika': 'Динамика по неделям', 'Hududlar kesimida': 'По регионам', 'Jami': 'Всего', 'Muammo turlari': 'Типы проблем', 'Murojaatlar qaysi soatlarda keladi': 'В какие часы поступают обращения', 'Holatlar': 'Статусы', 'ta murojaat': 'обращений', 'jami': 'всего',
  'Murojaatlarni ko‘rib chiquvchi idoralar va avtomatik taqsimlash qoidalari': 'Ведомства, рассматривающие обращения, и правила автораспределения', 'Tashkilot qo‘shish': 'Добавить организацию',
  'Yangi ariza kelganda tizim toifa va hududga mos keladigan faol idorani topadi. Hududiy idora bo‘lmasa respublika idorasi tanlanadi, u ham bo‘lmasa ariza “Taqsimlanmagan” ro‘yxatiga tushadi.': 'При поступлении обращения система находит активное ведомство по категории и региону. Если территориального нет — республиканское, иначе обращение попадает в «Не распределено».',
  'Nomi': 'Название', 'Qabul qiladigan toifalar': 'Принимаемые категории', 'Rahbar': 'Руководитель', 'Faol': 'Активно', 'Nofaol': 'Неактивно',
  'Tashkilotni tahrirlash': 'Редактировать организацию', 'Yangi tashkilot': 'Новая организация', 'To‘liq nomi': 'Полное название', 'Qisqa nomi': 'Краткое название', 'Respublika miqyosida': 'Республиканского уровня', 'Telefon': 'Телефон', 'Faol (yangi arizalar shu idoraga tushadi)': 'Активна (новые обращения поступают сюда)',
  'Tashkilot nomini kiriting': 'Введите название организации', 'Kamida bitta toifani tanlang': 'Выберите хотя бы одну категорию', 'Saqlandi': 'Сохранено',
  'Portalga kirish huquqi berilgan barcha xodimlar': 'Все сотрудники с доступом к порталу', 'Idorangiz xodimlari va ularning ish yuklamasi': 'Сотрудники вашего ведомства и их нагрузка', 'Xodim qo‘shish': 'Добавить сотрудника',
  'Yangi xodim avval Supabase → Authentication → Users bo‘limida (ish emaili va parol bilan) yaratiladi. U birinchi marta kirgach, shu yerda unga idora va rol tanlang.': 'Новый сотрудник сначала создаётся в Supabase → Authentication → Users (рабочий email и пароль). Затем здесь назначьте ему ведомство и роль.',
  'F.I.Sh.': 'Ф.И.О.', 'Rol': 'Роль', '30 kunda hal qildi': 'Решил за 30 дней', 'Vazirlik': 'Министерство', 'Bloklangan': 'Заблокирован',
  'Xodimni tahrirlash': 'Редактировать сотрудника', 'Yangi xodim': 'Новый сотрудник', 'Ish emaili': 'Рабочий email', 'Lavozimi': 'Должность',
  'Vazirlik administratori va dispetcheri barcha idoralar arizalarini ko‘radi; idora rahbari va ijrochisi faqat o‘z idorasinikini.': 'Администратор и диспетчер министерства видят обращения всех ведомств; руководитель и исполнитель — только своего.',
  'Bloklash (portalga kira olmaydi)': 'Заблокировать (нет входа в портал)', 'F.I.Sh. kiriting': 'Введите Ф.И.О.', 'Email kiriting': 'Введите email',
  'Fuqarolarga tez va bir xil sifatda javob berish uchun tayyor matnlar': 'Готовые тексты для быстрых и единообразных ответов', 'Shablon qo‘shish': 'Добавить шаблон', 'Umumiy': 'Общий', 'Tahrirlash': 'Изменить', 'O‘chirish': 'Удалить', 'Shablon yo‘q': 'Шаблонов нет',
  'Shablonni tahrirlash': 'Редактировать шаблон', 'Yangi shablon': 'Новый шаблон', 'Sarlavha': 'Заголовок', 'Matn': 'Текст', 'Kim uchun': 'Для кого', 'Sarlavha va kamida 20 belgili matn kiriting': 'Введите заголовок и текст не короче 20 символов', 'Shablonni o‘chirish': 'Удалить шаблон', 'Bu shablon o‘chiriladi.': 'Шаблон будет удалён.',
  'Arizalar bo‘yicha har bir amal: kim, qachon va nima qildi': 'Каждое действие по обращениям: кто, когда и что сделал', 'Barcha amallar': 'Все действия', 'Barcha xodimlar': 'Все сотрудники', 'Yozuv yo‘q': 'Записей нет',
  '{a} / {n} ta yozuv ko‘rsatildi': 'Показано {a} из {n} записей', 'Yana ko‘rsatish': 'Показать ещё', 'Sana': 'Дата', 'Ariza': 'Обращение', 'Amal': 'Действие', 'Izoh': 'Комментарий',
  'Murojaatlarni qabul qilish va taqsimlash qoidalari': 'Правила приёма и распределения обращений', 'Qabul qilish': 'Приём', 'Fuqarolardan yangi murojaatlar qabul qilinadi': 'Принимаются новые обращения граждан',
  'Yangi arizani toifa va hudud bo‘yicha idoraga avtomatik yo‘naltirish': 'Автоматически направлять обращение по категории и региону', 'Fuqaro arizasini tahrirlashi mumkin bo‘lgan kunlar': 'Сколько дней гражданин может редактировать обращение', 'Bir fuqaroning kunlik ariza limiti (0 = cheklanmagan)': 'Дневной лимит обращений на гражданина (0 = без ограничений)',
  'Ko‘rib chiqish muddatlari (kun)': 'Сроки рассмотрения (дни)', 'Qonunchilikka ko‘ra murojaatlar 15 kun ichida ko‘rib chiqiladi. Shoshilinch toifalar uchun qisqaroq muddat belgilash mumkin.': 'По закону обращения рассматриваются в течение 15 дней. Для срочных категорий можно установить меньший срок.', 'Sozlamalar saqlandi': 'Настройки сохранены',
  'Ruxsat yo‘q': 'Нет доступа', 'Ariza fuqaro tomonidan bekor qilingan': 'Обращение отменено гражданином', 'Bu ariza sizga biriktirilmagan': 'Это обращение вам не назначено', 'Ijrochi shu idora xodimi bo‘lishi kerak': 'Исполнитель должен быть сотрудником этого ведомства',
  'Arizani yopishdan oldin fuqaroga javob yozing': 'Перед закрытием напишите ответ гражданину', 'Ariza topilmadi': 'Обращение не найдено', 'Tashkilot topilmadi yoki faol emas': 'Организация не найдена или неактивна', 'Ariza allaqachon shu tashkilotda': 'Обращение уже в этой организации',
  'Faqat administrator uchun': 'Только для администратора', 'O‘zingizni admin rolidan chiqara yoki bloklay olmaysiz': 'Нельзя снять с себя роль администратора или заблокировать себя', 'Izoh bo‘sh': 'Комментарий пуст',
  'Faqat rasm fayli yuklanadi': 'Можно загрузить только изображение', 'Fayl hajmi 15 MB dan oshmasligi kerak': 'Размер файла не более 15 МБ', 'Rasmni o‘qib bo‘lmadi': 'Не удалось прочитать изображение',
  'Yangi xodimni avval Supabase → Authentication → Users bo‘limida yarating, keyin bu yerda unga idora va rol tanlang.': 'Сначала создайте сотрудника в Supabase → Authentication → Users, затем назначьте ему ведомство и роль здесь.'
};

boot();
