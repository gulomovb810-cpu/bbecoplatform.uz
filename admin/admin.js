/* =====================================================================
   bbecoplatform.uz — Admin panel
   Ma'lumotlar manbai: Supabase (config.js). Kalitlar bo'lmasa — DEMO rejim.
   ===================================================================== */
'use strict';

// ---------------------------------------------------------------------
// Konstantalar (mobil ilova bilan bir xil)
// ---------------------------------------------------------------------
const STATUSES = [
  { t: 'Qabul qilindi',                 short: 'Qabul',       c: 'var(--s0)' },
  { t: 'Tekshirilmoqda',                short: 'Tekshiruv',   c: 'var(--s1)' },
  { t: 'Mas’ul tashkilotga yuborildi',  short: 'Tashkilotda', c: 'var(--s2)' },
  { t: 'Bartaraf etildi',               short: 'Bartaraf',    c: 'var(--s3)' },
  { t: 'Yakunlandi',                    short: 'Yakunlandi',  c: 'var(--s4)' }
];
const CANCELLED = { t: 'Bekor qilingan', c: 'var(--sx)' };
const CATEGORIES = [
  { k: 'Chiqindi', icon: '🗑️', color: '#B45309' },
  { k: 'Havo',     icon: '💨', color: '#64748B' },
  { k: 'Suv',      icon: '💧', color: '#2563EB' },
  { k: 'Daraxt',   icon: '🌳', color: '#16A34A' },
  { k: 'Tuproq',   icon: '🪨', color: '#A16207' },
  { k: 'Boshqa',   icon: '❗', color: '#9333EA' }
];
const REGIONS = [
  { code: 'tashkent_city',  uz: 'Toshkent shahri',               lat: 41.3111, lng: 69.2797 },
  { code: 'tashkent',       uz: 'Toshkent viloyati',             lat: 41.2000, lng: 69.9000 },
  { code: 'andijan',        uz: 'Andijon viloyati',              lat: 40.7821, lng: 72.3442 },
  { code: 'bukhara',        uz: 'Buxoro viloyati',               lat: 39.9000, lng: 64.2000 },
  { code: 'fergana',        uz: 'Farg‘ona viloyati',             lat: 40.3864, lng: 71.7864 },
  { code: 'jizzakh',        uz: 'Jizzax viloyati',               lat: 40.1158, lng: 67.8422 },
  { code: 'khorezm',        uz: 'Xorazm viloyati',               lat: 41.5500, lng: 60.6333 },
  { code: 'namangan',       uz: 'Namangan viloyati',             lat: 40.9983, lng: 71.6726 },
  { code: 'navoi',          uz: 'Navoiy viloyati',               lat: 40.7000, lng: 64.6000 },
  { code: 'kashkadarya',    uz: 'Qashqadaryo viloyati',          lat: 38.8600, lng: 65.7900 },
  { code: 'karakalpakstan', uz: 'Qoraqalpog‘iston Respublikasi', lat: 42.4600, lng: 59.6000 },
  { code: 'samarkand',      uz: 'Samarqand viloyati',            lat: 39.6542, lng: 66.9597 },
  { code: 'syrdarya',       uz: 'Sirdaryo viloyati',             lat: 40.4897, lng: 68.7842 },
  { code: 'surkhandarya',   uz: 'Surxondaryo viloyati',          lat: 37.9400, lng: 67.5700 }
];
const PRIORITIES = ['Oddiy', 'Muhim', 'Shoshilinch'];
const ROLES = { user: 'Foydalanuvchi', moderator: 'Moderator', admin: 'Admin' };
const PAGE_TITLES = {
  dashboard: ['Umumiy holat', 'bbecoplatform.uz — umumiy ko‘rsatkichlar'],
  reports:   ['📥 ECO REPORTS', 'Fuqarolardan kelgan barcha ekologik murojaatlar'],
  map:       ['🗺️ ECO MAP', 'Barcha arizalar joylashuvi'],
  orgs:      ['🏢 Tashkilotlar', 'Mas’ul tashkilotlar ro‘yxati'],
  users:     ['👥 Foydalanuvchilar', 'Mobil ilovada ro‘yxatdan o‘tgan foydalanuvchilar'],
  stats:     ['📊 Statistika', 'Viloyatlar va muammo turlari bo‘yicha tahlil'],
  sat:       ['🛰️ Sun’iy yo‘ldosh', 'Xabar qilinmagan noqonuniy chiqindixonalarni proaktiv aniqlash'],
  ledger:    ['💰 Shaffoflik', 'Kompensatsiya va jarimalar qaysi loyihalarga sarflanmoqda'],
  activity:  ['🧾 Faoliyat jurnali', 'Arizalar bo‘yicha barcha o‘zgarishlar tarixi'],
  settings:  ['⚙️ Sozlamalar', 'Ilova va panel sozlamalari']
};
const DEFAULT_SETTINGS = { accepting_reports: true, edit_days: 5, daily_limit: 10, auto_assign: false, announcement: { enabled: false, uz: '', ru: '' },
  anon_reports_enabled: true, whistle_pubkey: null, ai_enabled: true, ai_daily_limit: 20, rating_enabled: true, transparency_enabled: true };

const CFG = window.ECO_CONFIG || {};
const BUCKET = CFG.MEDIA_BUCKET || 'report-media';
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/YOUR-PROJECT/.test(CFG.SUPABASE_URL) && !/YOUR-ANON/.test(CFG.SUPABASE_ANON_KEY));
const sb = LIVE && window.supabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

// ---------------------------------------------------------------------
// Yordamchilar
// ---------------------------------------------------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const regionName = c => (REGIONS.find(r => r.code === c) || {}).uz || c || '—';
const catOf = k => CATEGORIES.find(c => c.k === k) || { k: k || '—', icon: '•', color: '#888' };
const fmtDate = d => d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtDT = d => d ? new Date(d).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const dayKey = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const daysBetween = (a, b) => (new Date(b) - new Date(a)) / 86400000;
const nf = n => Number(n || 0).toLocaleString('uz-UZ');
function ago(d) {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'hozirgina';
  if (s < 3600) return Math.floor(s / 60) + ' daq. oldin';
  if (s < 86400) return Math.floor(s / 3600) + ' soat oldin';
  if (s < 86400 * 30) return Math.floor(s / 86400) + ' kun oldin';
  return fmtDate(d);
}
function statusPill(r) {
  const s = r.cancelled ? CANCELLED : STATUSES[r.status] || STATUSES[0];
  return `<span class="pill" style="--c:${s.c}"><span class="dot"></span>${esc(s.t)}</span>`;
}
function catChip(k) { const c = catOf(k); return `<span class="nowrap">${c.icon} ${esc(c.k)}</span>`; }
function userLabel(u) {
  if (!u) return '<span class="muted">O‘chirilgan hisob</span>';
  if (u.is_anonymous) return '<span class="muted">👤 Mehmon</span>';
  return esc(u.full_name || u.phone || u.email || '—');
}
function contactOf(u) { if (!u) return '—'; return u.phone ? '+' + String(u.phone).replace(/^\+/, '') : (u.email || '—'); }
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function resolveColor(c) { const m = /^var\((--[\w-]+)\)$/.exec(c); return m ? cssVar(m[1]) : c; }
function toast(msg, type = '') {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4200);
}
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('eco_admin_' + k)); localStorage.setItem('eco_admin_' + k, JSON.stringify(v)); } catch (e) { return null; } }
function downloadCSV(name, rows) {
  const csv = rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------------------------------------------------------------------
// Holat
// ---------------------------------------------------------------------
const state = {
  me: null, reports: [], orgs: [], users: [], settings: { ...DEFAULT_SETTINGS },
  page: 'dashboard', newCount: 0, charts: {}, maps: {},
  rf: { q: '', status: '', category: '', region: '', org: '', period: '', user: '', sort: 'new', page: 1, per: 25, sel: new Set() },
  uf: { tab: 'all', q: '' },
  mf: { status: new Set([0, 1, 2, 3, 4]), cat: new Set(CATEGORIES.map(c => c.k)), cancelled: false },
  sf: { period: '30' },
  seenAt: store('seenAt') || 0
};
const isAdmin = () => state.me && state.me.role === 'admin';
const orgName = id => (state.orgs.find(o => o.id === id) || {}).short_name || (state.orgs.find(o => o.id === id) || {}).name || '—';
const orgFull = id => (state.orgs.find(o => o.id === id) || {}).name || null;

// =====================================================================
// MA'LUMOTLAR QATLAMI
// =====================================================================
const REPORT_COLS = 'id,case_no,user_id,description,category,region,address,lat,lng,location_text,media_path,media_type,status,priority,org_id,admin_note,cancelled,cancelled_at,edited_at,status_changed_at,resolved_at,created_at,updated_at,channel,is_anonymous_report,contact_cipher,caller_phone,audio_path,transboundary,countries,ai_category,ai_confidence,ai_summary,legal_refs,rejected,reject_reason,detection_id,profiles!reports_user_id_fkey(full_name,phone,email,is_anonymous)';
const normReport = r => { const { profiles, ...rest } = r; return { ...rest, user: profiles || null }; };

async function fetchAll(build) {
  const step = 1000; let from = 0, out = [];
  for (;;) {
    const { data, error } = await build().range(from, from + step - 1);
    if (error) throw error;
    out = out.concat(data || []);
    if (!data || data.length < step) return out;
    from += step;
  }
}

const liveApi = {
  async session() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    return this.staffProfile(session.user);
  },
  async staffProfile(user) {
    const { data, error } = await sb.from('profiles').select('id,full_name,email,role,blocked').eq('id', user.id).maybeSingle();
    if (error || !data || !['admin', 'moderator'].includes(data.role) || data.blocked) return null;
    return { ...data, email: data.email || user.email };
  },
  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'Email yoki parol noto‘g‘ri.' : error.message);
    const me = await this.staffProfile(data.user);
    if (!me) { await sb.auth.signOut(); throw new Error('Bu hisobda admin paneliga kirish huquqi yo‘q.'); }
    return me;
  },
  async signOut() { await sb.auth.signOut(); },
  async reports() { return (await fetchAll(() => sb.from('reports').select(REPORT_COLS).order('created_at', { ascending: false }))).map(normReport); },
  async report(id) {
    const { data, error } = await sb.from('reports').select(REPORT_COLS).eq('id', id).maybeSingle();
    if (error) throw error; return data ? normReport(data) : null;
  },
  async updateReports(ids, patch) {
    const { data, error } = await sb.from('reports').update(patch).in('id', ids).select(REPORT_COLS);
    if (error) throw error; return data.map(normReport);
  },
  async deleteReport(r) {
    if (r.media_path) await sb.storage.from(BUCKET).remove([r.media_path]);
    const { error } = await sb.from('reports').delete().eq('id', r.id); if (error) throw error;
  },
  async history(reportId) {
    const { data, error } = await sb.from('report_status_history')
      .select('id,event,status,note,created_at,actor,profiles!report_status_history_actor_fkey(full_name,role)')
      .eq('report_id', reportId).order('created_at');
    if (error) throw error; return data.map(h => ({ ...h, actorName: h.profiles && h.profiles.full_name, actorRole: h.profiles && h.profiles.role }));
  },
  async activity(limit = 300) {
    const { data, error } = await sb.from('report_status_history')
      .select('id,event,status,note,created_at,report_id,reports(case_no),profiles!report_status_history_actor_fkey(full_name,role)')
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data.map(h => ({ ...h, case_no: h.reports && h.reports.case_no, actorName: h.profiles && h.profiles.full_name, actorRole: h.profiles && h.profiles.role }));
  },
  async mediaUrl(path) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error; return data.signedUrl;
  },
  async orgs() { const { data, error } = await sb.from('organizations').select('*').order('name'); if (error) throw error; return data; },
  async saveOrg(o) {
    const q = o.id ? sb.from('organizations').update(o).eq('id', o.id) : sb.from('organizations').insert(o);
    const { data, error } = await q.select().single(); if (error) throw error; return data;
  },
  async deleteOrg(id) { const { error } = await sb.from('organizations').delete().eq('id', id); if (error) throw error; },
  async users() { return fetchAll(() => sb.from('profiles').select('*').order('created_at', { ascending: false })); },
  async updateUser(id, patch) { const { data, error } = await sb.from('profiles').update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
  async deleteUser(id) { const { error } = await sb.rpc('admin_delete_user', { p_user: id }); if (error) throw error; },
  async settings() {
    const { data, error } = await sb.from('app_settings').select('key,value'); if (error) throw error;
    const s = { ...DEFAULT_SETTINGS }; data.forEach(r => { s[r.key] = r.value; }); return s;
  },
  async saveSetting(key, value) {
    const { error } = await sb.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }); if (error) throw error;
  },
  subscribe(handlers) {
    const ch = sb.channel('admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, p => handlers.report(p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, p => handlers.profile(p))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detections' }, p => handlers.detection && handlers.detection(p))
      .subscribe(status => handlers.status(status));
    return () => sb.removeChannel(ch);
  }
};

// --------------------------- DEMO ------------------------------------
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const demoDB = (() => {
  const rnd = mulberry32(20260929), pick = a => a[Math.floor(rnd() * a.length)];
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = rnd() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const first = ['Aziz', 'Dilnoza', 'Jasur', 'Madina', 'Sardor', 'Nilufar', 'Bekzod', 'Malika', 'Otabek', 'Gulnora', 'Shoxrux', 'Zarina', 'Farrux', 'Sevara', 'Ulug‘bek', 'Kamola'];
  const last = ['Karimov', 'Rahimova', 'Toshmatov', 'Yusupova', 'Aliyev', 'Saidova', 'Ergashev', 'Nazarova', 'Qodirov', 'Mirzayeva'];
  const texts = {
    Chiqindi: ['Hovuz yoniga chiqindi tashlanmoqda, hid kelyapti', 'Ko‘cha chetida qurilish chiqindilari uyilib yotibdi', 'Konteynerlar 5 kundan beri bo‘shatilmagan', 'Ariq ichiga maishiy chiqindi tashlangan'],
    Havo: ['Zavod mo‘ridan kechasi qora tutun chiqmoqda', 'Barglar yoqilyapti, nafas olish qiyin', 'Asfalt zavodidan kuchli hid tarqalmoqda'],
    Suv: ['Kanalga oqova suv tashlanmoqda', 'Ichimlik suvi quvuri yorilib suv isrof bo‘lyapti', 'Daryo suvi rangi o‘zgargan, baliqlar o‘lgan'],
    Daraxt: ['Ruxsatsiz daraxtlar kesilmoqda', 'Bog‘dagi eski chinorlar quritilmoqda', 'Yangi ekilgan ko‘chatlar sug‘orilmayapti'],
    Tuproq: ['Dalaga kimyoviy o‘g‘it qoldiqlari tashlangan', 'Yer uchastkasidan tuproq noqonuniy qazib olinmoqda'],
    Boshqa: ['Parkda shovqin kechasi ham davom etmoqda', 'Qurilish maydonchasida chang bostirilmayapti']
  };
  const orgs = [
    { name: 'O‘zbekiston Respublikasi Ekologiya, atrof-muhitni muhofaza qilish va iqlim o‘zgarishi vazirligi', short_name: 'Ekologiya vazirligi', region: null, categories: CATEGORIES.map(c => c.k), phone: '+998 71 207-07-70', email: 'info@eco.gov.uz', head: '', address: 'Toshkent sh.' },
    { name: 'Toshkent shahar Ekologiya boshqarmasi', short_name: 'Toshkent sh. ekologiya', region: 'tashkent_city', categories: ['Havo', 'Suv', 'Daraxt', 'Tuproq', 'Boshqa'] },
    { name: '“Toshkent shahar obodonlashtirish” boshqarmasi', short_name: 'Obodonlashtirish', region: 'tashkent_city', categories: ['Chiqindi', 'Daraxt'] },
    { name: 'Chiqindilar bilan ishlash agentligi', short_name: 'Chiqindi agentligi', region: null, categories: ['Chiqindi'] },
    { name: 'Samarqand viloyati Ekologiya boshqarmasi', short_name: 'Samarqand ekologiya', region: 'samarkand', categories: CATEGORIES.map(c => c.k) },
    { name: 'Farg‘ona viloyati Ekologiya boshqarmasi', short_name: 'Farg‘ona ekologiya', region: 'fergana', categories: CATEGORIES.map(c => c.k) },
    { name: 'Buxoro viloyati Ekologiya boshqarmasi', short_name: 'Buxoro ekologiya', region: 'bukhara', categories: CATEGORIES.map(c => c.k) },
    { name: 'Suv xo‘jaligi vazirligi', short_name: 'Suv xo‘jaligi', region: null, categories: ['Suv'] }
  ].map((o, i) => ({ id: uuid(), active: true, phone: o.phone || '', email: o.email || '', head: o.head || '', address: o.address || '', created_at: new Date(Date.now() - 200 * 864e5).toISOString(), ...o }));
  const users = [];
  const now = Date.now();
  for (let i = 0; i < 64; i++) {
    const anon = rnd() < 0.25, created = now - rnd() * 120 * 864e5;
    users.push({
      id: uuid(), full_name: anon ? null : pick(first) + ' ' + pick(last),
      phone: !anon && rnd() < 0.7 ? '99890' + String(Math.floor(1e6 + rnd() * 8e6)) : null,
      email: null, is_anonymous: anon, role: 'user', blocked: rnd() < 0.04, admin_note: null,
      created_at: new Date(created).toISOString(), last_sign_in_at: new Date(created + rnd() * (now - created)).toISOString()
    });
    if (!anon && !users[i].phone) users[i].email = users[i].full_name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + i + '@gmail.com';
  }
  const me = { id: uuid(), full_name: 'Demo Admin', email: 'admin@bbecoplatform.uz', role: 'admin', blocked: false, is_anonymous: false, phone: null, created_at: new Date(now - 300 * 864e5).toISOString() };
  users.push(me);
  const weights = { tashkent_city: 9, tashkent: 4, samarkand: 4, fergana: 4, andijan: 3, namangan: 3, bukhara: 2, kashkadarya: 3, surkhandarya: 2, khorezm: 2, navoi: 1, jizzakh: 1, syrdarya: 1, karakalpakstan: 2 };
  const regionBag = Object.entries(weights).flatMap(([k, w]) => Array(w).fill(k));
  const catBag = ['Chiqindi', 'Chiqindi', 'Chiqindi', 'Chiqindi', 'Havo', 'Havo', 'Suv', 'Suv', 'Daraxt', 'Daraxt', 'Tuproq', 'Boshqa'];
  const reports = [], history = [];
  for (let i = 0; i < 180; i++) {
    const created = now - Math.pow(rnd(), 1.6) * 90 * 864e5;
    const age = (now - created) / 864e5;
    const region = pick(regionBag), reg = REGIONS.find(r => r.code === region), cat = pick(catBag);
    const u = pick(users.slice(0, 64));
    let status = age < 1 ? 0 : Math.min(4, Math.floor(rnd() * Math.min(5, age / 3 + 1)));
    const cancelled = rnd() < 0.05;
    const hasGeo = rnd() < 0.88;
    const org = status >= 2 ? (orgs.find(o => o.region === region && o.categories.includes(cat)) || orgs.find(o => !o.region && o.categories.includes(cat)) || orgs[0]) : null;
    const r = {
      id: uuid(), case_no: 'ECO-' + String(i + 1).padStart(6, '0'), user_id: u.id,
      description: pick(texts[cat]), category: cat, region,
      address: rnd() < 0.5 ? pick(['Mahalla guzari yonida', 'Bozor orqasida', 'Maktab ro‘parasida', 'Katta yo‘l bo‘yida', 'Ko‘prik yonida']) : null,
      lat: hasGeo ? reg.lat + (rnd() - 0.5) * (region === 'tashkent_city' ? 0.12 : 0.9) : null,
      lng: hasGeo ? reg.lng + (rnd() - 0.5) * (region === 'tashkent_city' ? 0.16 : 1.2) : null,
      location_text: hasGeo ? null : 'Qo‘lda tanlangan: ' + reg.uz,
      media_path: null, media_type: rnd() < 0.85 ? 'image' : 'video',
      status, priority: rnd() < 0.12 ? 2 : rnd() < 0.25 ? 1 : 0, org_id: org ? org.id : null,
      admin_note: status >= 3 ? 'Muammo joyida o‘rganildi va bartaraf etildi. Murojaatingiz uchun rahmat!' : null,
      cancelled, cancelled_at: cancelled ? new Date(created + 864e5).toISOString() : null,
      edited_at: rnd() < 0.08 ? new Date(created + 36e5).toISOString() : null,
      created_at: new Date(created).toISOString(), updated_at: new Date(created).toISOString(), status_changed_at: null, resolved_at: null
    };
    history.push({ id: history.length + 1, report_id: r.id, event: 'created', status: 0, created_at: r.created_at, actor: u.id });
    let t = created;
    for (let s = 1; s <= status; s++) {
      t += rnd() * 2.5 * 864e5; if (t > now) t = now - 6e5;
      history.push({ id: history.length + 1, report_id: r.id, event: 'status', status: s, created_at: new Date(t).toISOString(), actor: me.id });
      if (s === 2 && org) history.push({ id: history.length + 1, report_id: r.id, event: 'org', note: org.name, created_at: new Date(t).toISOString(), actor: me.id });
      if (s === 3) r.resolved_at = new Date(t).toISOString();
      r.status_changed_at = new Date(t).toISOString();
    }
    if (cancelled) history.push({ id: history.length + 1, report_id: r.id, event: 'cancelled', created_at: r.cancelled_at, actor: u.id });
    reports.push(r);
  }
  reports.sort((a, b) => a.created_at < b.created_at ? 1 : -1);
  return { reports, users, orgs, history, me, uuid, settings: { ...DEFAULT_SETTINGS } };
})();

const demoApi = {
  _withUser(r) { const u = demoDB.users.find(x => x.id === r.user_id); return { ...r, user: u ? { full_name: u.full_name, phone: u.phone, email: u.email, is_anonymous: u.is_anonymous } : null }; },
  async session() { return store('demo_session') ? demoDB.me : null; },
  async signIn() { store('demo_session', true); return demoDB.me; },
  async signOut() { store('demo_session', false); },
  async reports() { return demoDB.reports.map(r => this._withUser(r)); },
  async report(id) { const r = demoDB.reports.find(x => x.id === id); return r ? this._withUser(r) : null; },
  async updateReports(ids, patch) {
    return ids.map(id => {
      const r = demoDB.reports.find(x => x.id === id), now = new Date().toISOString();
      const add = (e, extra) => demoDB.history.push({ id: demoDB.history.length + 1, report_id: id, event: e, created_at: now, actor: demoDB.me.id, ...extra });
      if ('status' in patch && patch.status !== r.status) { add('status', { status: patch.status }); r.status_changed_at = now; if (patch.status >= 3 && r.status < 3) r.resolved_at = now; if (patch.status < 3) r.resolved_at = null; }
      if ('org_id' in patch && patch.org_id !== r.org_id) add('org', { note: orgFull(patch.org_id) || '—' });
      if ('admin_note' in patch && patch.admin_note !== r.admin_note && patch.admin_note) add('note', { note: patch.admin_note });
      if ('priority' in patch && patch.priority !== r.priority) add('priority', { status: patch.priority });
      Object.assign(r, patch, { updated_at: now });
      return this._withUser(r);
    });
  },
  async deleteReport(r) { demoDB.reports = demoDB.reports.filter(x => x.id !== r.id); },
  async history(id) { return demoDB.history.filter(h => h.report_id === id).sort((a, b) => a.created_at < b.created_at ? -1 : 1).map(h => this._actor(h)); },
  _actor(h) { const u = demoDB.users.find(x => x.id === h.actor); return { ...h, actorName: u && u.full_name, actorRole: u && u.role }; },
  async activity(limit = 300) {
    return demoDB.history.slice().sort((a, b) => a.created_at < b.created_at ? 1 : -1).slice(0, limit)
      .map(h => ({ ...this._actor(h), case_no: (demoDB.reports.find(r => r.id === h.report_id) || {}).case_no }));
  },
  async mediaUrl() { return null; },
  async orgs() { return demoDB.orgs.slice().sort((a, b) => a.name.localeCompare(b.name)); },
  async saveOrg(o) {
    if (o.id) { const x = demoDB.orgs.find(z => z.id === o.id); Object.assign(x, o); return x; }
    const n = { ...o, id: demoDB.uuid(), created_at: new Date().toISOString() }; demoDB.orgs.push(n); return n;
  },
  async deleteOrg(id) { demoDB.orgs = demoDB.orgs.filter(o => o.id !== id); demoDB.reports.forEach(r => { if (r.org_id === id) r.org_id = null; }); },
  async users() { return demoDB.users.slice(); },
  async updateUser(id, patch) { const u = demoDB.users.find(x => x.id === id); Object.assign(u, patch); return u; },
  async deleteUser(id) { demoDB.users = demoDB.users.filter(u => u.id !== id); demoDB.reports.forEach(r => { if (r.user_id === id) r.user_id = null; }); },
  async settings() { return { ...demoDB.settings }; },
  async saveSetting(k, v) { demoDB.settings[k] = v; },
  subscribe(h) { setTimeout(() => h.status('DEMO'), 50); return () => {}; }
};

const api = LIVE ? liveApi : demoApi;

// =====================================================================
// ISHGA TUSHIRISH, KIRISH, NAVIGATSIYA
// =====================================================================
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme(store('theme'));

async function boot() {
  $('#demoBanner').hidden = LIVE;
  if (!LIVE) $('#loginHint').innerHTML = '🧪 DEMO rejim: istalgan email/parol bilan kiring. Haqiqiy ma’lumotlar uchun <code>config.js</code> ni to‘ldiring.';
  if (LIVE && !sb) { toast('Supabase kutubxonasi yuklanmadi. Internetni tekshiring.', 'err'); }
  let me = null;
  try { me = await api.session(); } catch (e) { console.warn(e); }
  $('#boot').hidden = true;
  if (me) startApp(me); else showLogin();
}

function showLogin() {
  $('#shell').hidden = true; $('#loginView').hidden = false;
  $('#loginEmail').focus();
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('#loginBtn'), err = $('#loginError');
  err.textContent = ''; btn.disabled = true; btn.textContent = 'Tekshirilmoqda...';
  try { startApp(await api.signIn($('#loginEmail').value.trim(), $('#loginPass').value)); }
  catch (ex) { err.textContent = ex.message || 'Kirishda xatolik'; }
  finally { btn.disabled = false; btn.textContent = 'Kirish'; }
});

let unsubscribe = null;
async function startApp(me) {
  state.me = me;
  $('#loginView').hidden = true; $('#shell').hidden = false;
  $('#meBox').innerHTML = `<span class="avatar">${esc((me.full_name || me.email || 'A').trim()[0].toUpperCase())}</span><div><b>${esc(me.full_name || me.email)}</b><small>${esc(ROLES[me.role] || me.role)}</small></div>`;
  $('#boot').hidden = false;
  try { await loadAll(); } catch (e) { toast('Ma’lumotlarni yuklab bo‘lmadi: ' + e.message, 'err'); console.error(e); }
  $('#boot').hidden = true;
  if (unsubscribe) unsubscribe();
  unsubscribe = api.subscribe({ report: onReportChange, profile: onProfileChange, detection: onDetectionChange, status: onLiveStatus });
  route();
}

async function loadAll() {
  const [reports, orgs, users, settings] = await Promise.all([api.reports(), api.orgs(), api.users(), api.settings()]);
  Object.assign(state, { reports, orgs, users, settings });
  await v2Load();
  updateBadge();
}

$('#logoutBtn').addEventListener('click', async () => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  await api.signOut(); state.me = null; closeDrawer(); showLogin();
});
$('#refreshBtn').addEventListener('click', async () => {
  $('#refreshBtn').disabled = true;
  try { await loadAll(); render(); toast('Yangilandi', 'ok'); } catch (e) { toast(e.message, 'err'); }
  $('#refreshBtn').disabled = false;
});
$('#themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark'; store('theme', next); applyTheme(next); render();
});
$('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#scrim').classList.add('show'); });
$('#scrim').addEventListener('click', closeMenu);
function closeMenu() { $('#sidebar').classList.remove('open'); $('#scrim').classList.remove('show'); }
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#lightbox').hidden) closeLightbox(); else if (!$('#modalWrap').hidden) closeModal(); else closeDrawer(); } });

function route() {
  if (!state.me) return;
  const h = (location.hash || '#dashboard').slice(1).split('/');
  state.page = PAGE_TITLES[h[0]] ? h[0] : 'dashboard';
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.page === state.page));
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === state.page));
  $('#pageTitle').textContent = PAGE_TITLES[state.page][0];
  $('#pageSub').textContent = PAGE_TITLES[state.page][1];
  closeMenu();
  if (state.page === 'reports') { state.seenAt = Date.now(); store('seenAt', state.seenAt); updateBadge(); }
  render();
  if (h[0] === 'reports' && h[1]) openReport(h[1]);
}

function render() {
  const fn = { dashboard: renderDashboard, reports: renderReports, map: renderMap, sat: renderSat, ledger: renderLedgerAdmin, orgs: renderOrgs, users: renderUsers, stats: renderStats, activity: renderActivity, settings: renderSettings }[state.page];
  if (fn) fn($(`.page[data-page="${state.page}"]`));
}
const renderSoon = debounce(render, 400);

function updateBadge() {
  const n = state.reports.filter(r => !r.cancelled && r.status === 0 && new Date(r.created_at).getTime() > state.seenAt).length;
  const b = $('#badgeNew'); b.hidden = !n; b.textContent = n;
}

// ---------------- Realtime ----------------
function onLiveStatus(s) {
  const el = $('#liveDot');
  el.classList.toggle('on', s === 'SUBSCRIBED'); el.classList.toggle('demo', s === 'DEMO');
  $('#liveText').textContent = s === 'SUBSCRIBED' ? 'Jonli' : s === 'DEMO' ? 'Demo' : 'Ulanmoqda...';
  el.title = s === 'SUBSCRIBED' ? 'Realtime ulangan — yangi arizalar avtomatik ko‘rinadi' : String(s);
}
async function onReportChange(p) {
  if (p.eventType === 'DELETE') { state.reports = state.reports.filter(r => r.id !== p.old.id); }
  else {
    const r = await api.report(p.new.id).catch(() => null); if (!r) return;
    const i = state.reports.findIndex(x => x.id === r.id);
    if (i >= 0) state.reports[i] = r; else state.reports.unshift(r);
    if (p.eventType === 'INSERT') {
      toast(`📥 Yangi ariza: ${r.case_no} — ${catOf(r.category).icon} ${regionName(r.region)}`, 'ok');
      if (r.user_id && !state.users.some(u => u.id === r.user_id)) api.users().then(u => { state.users = u; });
    }
  }
  updateBadge();
  if (drawerReport && drawerReport.id === (p.new || p.old).id && p.eventType !== 'DELETE') refreshDrawer();
  renderSoon();
}
function onProfileChange(p) {
  if (p.eventType === 'DELETE') state.users = state.users.filter(u => u.id !== p.old.id);
  else { const i = state.users.findIndex(u => u.id === p.new.id); if (i >= 0) state.users[i] = p.new; else state.users.unshift(p.new); }
  if (['users', 'dashboard'].includes(state.page)) renderSoon();
}

// =====================================================================
// FILTR YORDAMCHILARI
// =====================================================================
function periodStart(p) {
  if (!p || p === 'all') return 0;
  if (p === 'today') { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  return Date.now() - Number(p) * 864e5;
}
const regionOptions = (sel, all = 'Barcha viloyatlar') => `<option value="">${all}</option>` + REGIONS.map(r => `<option value="${r.code}" ${sel === r.code ? 'selected' : ''}>${esc(r.uz)}</option>`).join('');
const catOptions = (sel, all = 'Barcha turlar') => `<option value="">${all}</option>` + CATEGORIES.map(c => `<option value="${c.k}" ${sel === c.k ? 'selected' : ''}>${c.icon} ${c.k}</option>`).join('');
const orgOptions = (sel, all = 'Barcha tashkilotlar') => `<option value="">${all}</option><option value="none" ${sel === 'none' ? 'selected' : ''}>— Biriktirilmagan</option>` + state.orgs.map(o => `<option value="${o.id}" ${sel === o.id ? 'selected' : ''}>${esc(o.short_name || o.name)}</option>`).join('');
const statusOptions = (sel) => `<option value="">Barcha holatlar</option><option value="open" ${sel === 'open' ? 'selected' : ''}>⏳ Jarayondagilar (0–2)</option>` +
  STATUSES.map((s, i) => `<option value="${i}" ${String(sel) === String(i) ? 'selected' : ''}>${esc(s.t)}</option>`).join('') +
  `<option value="stale" ${sel === 'stale' ? 'selected' : ''}>⚠️ 3 kundan beri “Qabul qilindi”</option><option value="cancelled" ${sel === 'cancelled' ? 'selected' : ''}>✖ Bekor qilinganlar</option>`;
const periodOptions = (sel, withAll = true) => [['', 'Butun davr'], ['today', 'Bugun'], ['7', '7 kun'], ['30', '30 kun'], ['90', '90 kun'], ['365', '1 yil']]
  .filter(x => withAll || x[0]).map(([v, t]) => `<option value="${v}" ${sel === v ? 'selected' : ''}>${t}</option>`).join('');

function filterReports(f) {
  const q = (f.q || '').trim().toLowerCase(), since = periodStart(f.period);
  return state.reports.filter(r => {
    if (f.status === 'cancelled') { if (!r.cancelled) return false; }
    else if (f.status === 'open') { if (r.cancelled || r.status > 2) return false; }
    else if (f.status === 'stale') { if (r.cancelled || r.status !== 0 || daysBetween(r.created_at, Date.now()) < 3) return false; }
    else if (f.status !== '' && f.status != null) { if (r.cancelled || r.status !== Number(f.status)) return false; }
    if (f.category && r.category !== f.category) return false;
    if (f.region && r.region !== f.region) return false;
    if (f.org === 'none' ? r.org_id : (f.org && r.org_id !== f.org)) return false;
    if (f.user && r.user_id !== f.user) return false;
    if (!v2Filter(r, f)) return false;
    if (since && new Date(r.created_at).getTime() < since) return false;
    if (q) {
      const hay = [r.case_no, r.description, r.address, r.location_text, regionName(r.region), r.user && r.user.full_name, r.user && r.user.phone, r.user && r.user.email, r.caller_phone].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function destroyChart(key) { if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; } }
function makeChart(key, canvas, cfg) {
  destroyChart(key);
  if (!window.Chart || !canvas) return;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = cssVar('--ink-3');
  Chart.defaults.borderColor = cssVar('--line');
  state.charts[key] = new Chart(canvas, cfg);
}
function barsHTML(items, color) {
  const max = Math.max(1, ...items.map(i => i.v));
  return `<div class="bars">${items.map(i => `<div class="bar-row" ${i.onclick ? `style="cursor:pointer" onclick="${i.onclick}"` : ''}>
    <span class="lbl" title="${esc(i.label)}">${i.html || esc(i.label)}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${(i.v / max * 100).toFixed(1)}%; background:${i.color || color || 'var(--accent)'}"></span></span>
    <span class="v">${nf(i.v)}</span></div>`).join('')}</div>`;
}
function goReports(patch) { Object.assign(state.rf, { q: '', status: '', category: '', region: '', org: '', period: '', user: '', channel: '', flag: '', page: 1 }, patch); location.hash = '#reports'; if (state.page === 'reports') render(); }
window.goReports = goReports;

// =====================================================================
// 1. UMUMIY HOLAT
// =====================================================================
function renderDashboard(el) {
  const R = state.reports, active = R.filter(r => !r.cancelled);
  const today = periodStart('today');
  const cnt = f => active.filter(f).length;
  const resolved = active.filter(r => r.resolved_at);
  const avgDays = resolved.length ? resolved.reduce((s, r) => s + daysBetween(r.created_at, r.resolved_at), 0) / resolved.length : 0;
  const registered = state.users.filter(u => !u.is_anonymous && u.role === 'user').length;
  const guests = state.users.filter(u => u.is_anonymous).length;
  const stale = cnt(r => r.status === 0 && daysBetween(r.created_at, Date.now()) >= 3);
  const noOrg = cnt(r => r.status >= 1 && r.status <= 2 && !r.org_id);
  const urgent = cnt(r => r.priority === 2 && r.status < 3);

  const kpi = (label, val, sub, color, click) => `<div class="card kpi ${click ? 'clickable' : ''}" ${click ? `onclick="${click}"` : ''}>
    <div class="k-label">${color ? `<span class="dot" style="background:${color}"></span>` : ''}${label}</div><div class="k-val">${val}</div><div class="k-sub">${sub || '&nbsp;'}</div></div>`;

  const byRegion = REGIONS.map(r => ({ label: r.uz, v: active.filter(x => x.region === r.code).length, onclick: `goReports({region:'${r.code}'})` })).sort((a, b) => b.v - a.v).slice(0, 8);
  const byCat = CATEGORIES.map(c => ({ label: c.k, html: `${c.icon} ${c.k}`, v: active.filter(x => x.category === c.k).length, color: c.color, onclick: `goReports({category:'${c.k}'})` })).sort((a, b) => b.v - a.v);
  const latest = R.slice(0, 8);

  el.innerHTML = `
  <div class="grid g-kpi">
    ${kpi('Jami arizalar', nf(R.length), `Bugun: +${nf(R.filter(r => new Date(r.created_at) >= today).length)}`, null, "goReports({})")}
    ${kpi('Yangi (qabul qilindi)', nf(cnt(r => r.status === 0)), 'Ko‘rib chiqilishi kerak', STATUSES[0].c, "goReports({status:'0'})")}
    ${kpi('Jarayonda', nf(cnt(r => r.status === 1 || r.status === 2)), 'Tekshiruv + tashkilotda', STATUSES[1].c, "goReports({status:'open'})")}
    ${kpi('Hal qilingan', nf(cnt(r => r.status >= 3)), active.length ? Math.round(cnt(r => r.status >= 3) / active.length * 100) + '% arizalar' : '', STATUSES[3].c, "goReports({status:'3'})")}
    ${kpi('O‘rtacha hal qilish', avgDays ? avgDays.toFixed(1) + ' kun' : '—', 'Qabuldan bartarafgacha')}
    ${kpi('Foydalanuvchilar', nf(registered), `+ ${nf(guests)} mehmon`, null, "location.hash='#users'")}
  </div>

  <div class="alert-row mt">
    ${stale ? `<div class="alert" onclick="goReports({status:'stale'})">⚠️ <b>${stale}</b> ta ariza 3 kundan beri ko‘rib chiqilmagan</div>` : ''}
    ${noOrg ? `<div class="alert" onclick="goReports({status:'open', org:'none'})">🏢 <b>${noOrg}</b> ta jarayondagi ariza tashkilotga biriktirilmagan</div>` : ''}
    ${urgent ? `<div class="alert" onclick="goReports({status:'open'}); state.rf.sort='prio'">🔥 <b>${urgent}</b> ta shoshilinch ariza</div>` : ''}
    ${!stale && !noOrg && !urgent ? `<div class="alert ok">✅ Kechikkan yoki biriktirilmagan arizalar yo‘q</div>` : ''}
    ${state.settings.accepting_reports === false ? `<div class="alert" onclick="location.hash='#settings'">⛔ Arizalarni qabul qilish to‘xtatilgan</div>` : ''}
    ${v2Alerts()}
  </div>
  ${v2DashboardRow()}

  <div class="grid g-3 mt">
    <div class="card"><div class="card-h"><h3>So‘nggi 30 kun dinamikasi</h3><span class="muted small">kelgan / hal qilingan</span></div>
      <div class="card-b"><div class="chart-box"><canvas id="chTrend"></canvas></div></div></div>
    <div class="card"><div class="card-h"><h3>Holatlar</h3></div><div class="card-b"><div class="chart-box"><canvas id="chStatus"></canvas></div></div></div>
  </div>

  <div class="grid g-2 mt">
    <div class="card"><div class="card-h"><h3>Viloyatlar (top 8)</h3><a href="#stats" class="small">Batafsil →</a></div><div class="card-b">${barsHTML(byRegion)}</div></div>
    <div class="card"><div class="card-h"><h3>Muammo turlari</h3><a href="#stats" class="small">Batafsil →</a></div><div class="card-b">${barsHTML(byCat)}</div></div>
  </div>

  <div class="card mt"><div class="card-h"><h3>So‘nggi arizalar</h3><a href="#reports" class="small">Barchasi →</a></div>
    <div class="card-b" style="padding:8px 0 0">${reportTable(latest, { compact: true })}</div></div>`;

  // Trend chart
  const days = []; for (let i = 29; i >= 0; i--) days.push(dayKey(Date.now() - i * 864e5));
  const inc = Object.fromEntries(days.map(d => [d, 0])), res = Object.fromEntries(days.map(d => [d, 0]));
  R.forEach(r => { const k = dayKey(r.created_at); if (k in inc) inc[k]++; if (r.resolved_at) { const k2 = dayKey(r.resolved_at); if (k2 in res) res[k2]++; } });
  makeChart('trend', $('#chTrend'), {
    type: 'bar',
    data: { labels: days.map(d => d.slice(8) + '.' + d.slice(5, 7)), datasets: [
      { label: 'Kelgan', data: days.map(d => inc[d]), backgroundColor: cssVar('--s0'), borderRadius: 4 },
      { label: 'Hal qilingan', data: days.map(d => res[d]), backgroundColor: cssVar('--s3'), borderRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
  const sCounts = STATUSES.map((_, i) => cnt(r => r.status === i)).concat(R.filter(r => r.cancelled).length);
  makeChart('status', $('#chStatus'), {
    type: 'doughnut',
    data: { labels: STATUSES.map(s => s.t).concat(CANCELLED.t), datasets: [{ data: sCounts, backgroundColor: STATUSES.map(s => resolveColor(s.c)).concat(resolveColor(CANCELLED.c)), borderColor: cssVar('--surface'), borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
  });
}

function reportTable(rows, opts = {}) {
  if (!rows.length) return `<div class="empty">Arizalar topilmadi</div>`;
  const sel = state.rf.sel;
  return `<div class="table-wrap"><table class="tbl"><thead><tr>
    ${opts.compact ? '' : `<th style="width:32px"><input type="checkbox" id="selAll" ${rows.every(r => sel.has(r.id)) ? 'checked' : ''}></th>`}
    <th>№</th><th>Sana</th><th>Tur</th><th>Viloyat</th><th>Tavsif</th>${opts.compact ? '' : '<th>Fuqaro</th><th>Tashkilot</th><th title="AI tahlili: taxmin qilingan tur va ishonch">AI</th>'}<th>Holat</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="row-click" data-id="${r.id}">
      ${opts.compact ? '' : `<td onclick="event.stopPropagation()"><input type="checkbox" class="selOne" value="${r.id}" ${sel.has(r.id) ? 'checked' : ''}></td>`}
      <td class="nowrap">${channelIcon(r)} <span class="case-no">${esc(r.case_no)}</span>${r.transboundary ? ' <span title="Transchegaraviy">🌐</span>' : ''}${r.priority ? ` <span class="prio-${r.priority}" title="${PRIORITIES[r.priority]}">${r.priority === 2 ? '🔥' : '▲'}</span>` : ''}</td>
      <td class="nowrap" title="${fmtDT(r.created_at)}">${fmtDate(r.created_at)}<div class="muted small">${ago(r.created_at)}</div></td>
      <td>${catChip(r.category)}</td>
      <td class="nowrap">${esc(regionName(r.region))}</td>
      <td class="desc" title="${esc(r.description)}">${r.media_path || r.media_type ? (r.media_type === 'video' ? '🎬 ' : '📷 ') : ''}${r.audio_path ? '🎙️ ' : ''}${esc(r.description)}</td>
      ${opts.compact ? '' : `<td class="nowrap">${reporterLabel(r)}</td><td class="nowrap">${r.org_id ? esc(orgName(r.org_id)) : '<span class="muted">—</span>'}</td><td class="nowrap">${aiCell(r)}</td>`}
      <td>${statusPill(r)}${r.rejected ? ' <span class="pill" style="--c:var(--danger)">Asossiz</span>' : ''}</td></tr>`).join('')}
    </tbody></table></div>`;
}
document.addEventListener('click', e => {
  const tr = e.target.closest('tr.row-click[data-id]');
  if (tr && !e.target.closest('input,button,a,select')) openReport(tr.dataset.id);
});

// =====================================================================
// 2. ECO REPORTS
// =====================================================================
function renderReports(el) {
  const f = state.rf;
  let rows = filterReports(f);
  const sorters = {
    new: (a, b) => a.created_at < b.created_at ? 1 : -1,
    old: (a, b) => a.created_at > b.created_at ? 1 : -1,
    prio: (a, b) => (b.priority - a.priority) || (a.created_at > b.created_at ? 1 : -1),
    upd: (a, b) => (a.updated_at || a.created_at) < (b.updated_at || b.created_at) ? 1 : -1
  };
  rows.sort(sorters[f.sort] || sorters.new);
  const total = rows.length, pages = Math.max(1, Math.ceil(total / f.per));
  if (f.page > pages) f.page = pages;
  const pageRows = rows.slice((f.page - 1) * f.per, f.page * f.per);
  const userName = f.user ? (state.users.find(u => u.id === f.user) || {}).full_name || 'Foydalanuvchi' : '';
  // tanlanganlardan ko'rinmaydiganlarini olib tashlaymiz
  const visibleIds = new Set(rows.map(r => r.id)); [...f.sel].forEach(id => { if (!visibleIds.has(id)) f.sel.delete(id); });

  el.innerHTML = `
  <div class="toolbar">
    <div class="grow"><input type="search" id="fQ" placeholder="🔍 Raqam, tavsif, manzil, fuqaro ismi yoki telefoni..." value="${esc(f.q)}"></div>
    <select id="fStatus">${statusOptions(f.status)}</select>
    <select id="fCat">${catOptions(f.category)}</select>
    <select id="fRegion">${regionOptions(f.region)}</select>
    <select id="fOrg">${orgOptions(f.org)}</select>
    <select id="fPeriod">${periodOptions(f.period)}</select>
    <select id="fChannel">${channelOptions(f.channel)}</select>
    <select id="fFlag">${flagOptions(f.flag)}</select>
    <select id="fSort"><option value="new">Avval yangilari</option><option value="old">Avval eskilari</option><option value="prio">Muhimligi bo‘yicha</option><option value="upd">Oxirgi o‘zgargan</option></select>
    <button class="btn" id="fReset">Tozalash</button>
    <button class="btn" id="fExport">⬇ CSV</button>
    <button class="btn btn-primary" id="fOperator" title="Telefon, SMS yoki shaxsan kelgan murojaatni kiritish">📞 Murojaat qabul qilish</button>
  </div>
  ${f.user ? `<div class="bulk">👤 Faqat <b>${esc(userName)}</b> arizalari <button class="btn btn-sm" onclick="goReports({})">✕ Olib tashlash</button></div>` : ''}
  ${f.sel.size ? `<div class="bulk"><b>${f.sel.size}</b> ta tanlandi:
      <select id="bStatus"><option value="">Holatni o‘zgartirish...</option>${STATUSES.map((s, i) => `<option value="${i}">${esc(s.t)}</option>`).join('')}</select>
      <select id="bOrg"><option value="">Tashkilotga yo‘naltirish...</option>${state.orgs.filter(o => o.active).map(o => `<option value="${o.id}">${esc(o.short_name || o.name)}</option>`).join('')}</select>
      <button class="btn btn-primary btn-sm" id="bApply">Qo‘llash</button><button class="btn btn-ghost btn-sm" id="bClear">Bekor qilish</button></div>` : ''}
  <div class="card">
    ${reportTable(pageRows)}
    <div class="pager"><span class="muted">Jami: <b>${nf(total)}</b> ta ariza${total !== state.reports.length ? ` (${nf(state.reports.length)} dan)` : ''}</span>
      <span class="pg-btns">
        <select id="fPer">${[25, 50, 100].map(n => `<option ${f.per === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn btn-sm" id="pgPrev" ${f.page <= 1 ? 'disabled' : ''}>‹</button>
        <span style="align-self:center">${f.page} / ${pages}</span>
        <button class="btn btn-sm" id="pgNext" ${f.page >= pages ? 'disabled' : ''}>›</button></span></div>
  </div>`;

  $('#fSort').value = f.sort;
  const set = (k, v) => { f[k] = v; f.page = 1; renderReports(el); };
  $('#fQ').addEventListener('input', debounce(e => { f.q = e.target.value; f.page = 1; renderReports(el); const i = $('#fQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300));
  $('#fStatus').onchange = e => set('status', e.target.value);
  $('#fCat').onchange = e => set('category', e.target.value);
  $('#fRegion').onchange = e => set('region', e.target.value);
  $('#fOrg').onchange = e => set('org', e.target.value);
  $('#fPeriod').onchange = e => set('period', e.target.value);
  $('#fChannel').onchange = e => set('channel', e.target.value);
  $('#fFlag').onchange = e => set('flag', e.target.value);
  $('#fOperator').onclick = () => operatorModal();
  $('#fSort').onchange = e => set('sort', e.target.value);
  $('#fPer').onchange = e => set('per', Number(e.target.value));
  $('#fReset').onclick = () => goReports({});
  $('#pgPrev').onclick = () => { f.page--; renderReports(el); };
  $('#pgNext').onclick = () => { f.page++; renderReports(el); };
  $('#fExport').onclick = () => exportReports(rows);
  const selAll = $('#selAll');
  if (selAll) selAll.onchange = e => { pageRows.forEach(r => e.target.checked ? f.sel.add(r.id) : f.sel.delete(r.id)); renderReports(el); };
  $$('.selOne', el).forEach(cb => cb.onchange = () => { cb.checked ? f.sel.add(cb.value) : f.sel.delete(cb.value); renderReports(el); });
  if (f.sel.size) {
    $('#bClear').onclick = () => { f.sel.clear(); renderReports(el); };
    $('#bApply').onclick = async () => {
      const patch = {};
      if ($('#bStatus').value !== '') patch.status = Number($('#bStatus').value);
      if ($('#bOrg').value) { patch.org_id = $('#bOrg').value; if (!('status' in patch)) patch.status = 2; }
      if (!Object.keys(patch).length) return toast('Amalni tanlang');
      const ids = [...f.sel].filter(id => { const r = state.reports.find(x => x.id === id); return r && !r.cancelled; });
      try { mergeReports(await api.updateReports(ids, patch)); f.sel.clear(); toast(`${ids.length} ta ariza yangilandi`, 'ok'); renderReports(el); }
      catch (e) { toast(e.message, 'err'); }
    };
  }
}
function mergeReports(list) { list.forEach(r => { const i = state.reports.findIndex(x => x.id === r.id); if (i >= 0) state.reports[i] = r; }); updateBadge(); }
function exportReports(rows) {
  downloadCSV(`eco-reports-${dayKey(Date.now())}.csv`, [
    ['Raqam', 'Sana', 'Kanal', 'Kategoriya', 'Viloyat', 'Manzil', 'Kenglik', 'Uzunlik', 'Tavsif', 'Holat', 'Bekor qilingan', 'Asossiz', 'Muhimlik', 'Tashkilot', 'Javob', 'Fuqaro', 'Kontakt', 'Hal qilingan sana', 'AI turi', 'AI ishonch %', 'Transchegaraviy', 'Huquqiy asos'],
    ...rows.map(r => [r.case_no, fmtDT(r.created_at), (CHANNELS[r.channel] || {}).t || r.channel || '', r.category, regionName(r.region), r.address || r.location_text || '', r.lat ?? '', r.lng ?? '', r.description,
      STATUSES[r.status].t, r.cancelled ? 'ha' : '', r.rejected ? 'ha' : '', PRIORITIES[r.priority || 0], orgFull(r.org_id) || '', r.admin_note || '',
      r.is_anonymous_report ? 'Maxfiy' : r.user ? (r.user.is_anonymous ? 'Mehmon' : r.user.full_name || '') : (r.caller_phone ? 'Qo‘ng‘iroq/SMS' : 'O‘chirilgan'),
      r.caller_phone || contactOf(r.user), r.resolved_at ? fmtDT(r.resolved_at) : '', r.ai_category || '', r.ai_confidence != null ? Math.round(r.ai_confidence * 100) : '',
      r.transboundary ? (r.countries || []).join(' ') || 'ha' : '', (r.legal_refs || []).map(legalLabel).join('; ')])
  ]);
}

// ---------------- Ariza tafsilotlari (drawer) ----------------
let drawerReport = null;
async function openReport(id) {
  let r = state.reports.find(x => x.id === id || x.case_no === id);
  if (!r) { try { r = await api.report(id); } catch (e) { /* noop */ } }
  if (!r) return toast('Ariza topilmadi', 'err');
  drawerReport = r;
  $('#drawerWrap').hidden = false;
  document.body.style.overflow = 'hidden';
  refreshDrawer();
}
window.openReport = openReport;
function closeDrawer() {
  $('#drawerWrap').hidden = true; document.body.style.overflow = ''; drawerReport = null;
  if (state.maps.mini) { state.maps.mini.remove(); delete state.maps.mini; }
  if (/^#reports\//.test(location.hash)) history.replaceState(null, '', '#reports');
}
$('#drawerWrap').addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeDrawer(); });

async function refreshDrawer() {
  const r = state.reports.find(x => x.id === drawerReport.id) || drawerReport; drawerReport = r;
  const u = r.user, uFull = state.users.find(x => x.id === r.user_id);
  const editable = !r.cancelled;
  const hasGeo = r.lat != null && r.lng != null;
  $('#drawer').innerHTML = `
  <div class="drawer-h"><h2>${channelIcon(r)} <span class="case-no" style="font-size:15px">${esc(r.case_no)}</span></h2>${r.rejected ? '<span class="pill" style="--c:var(--danger)">Asossiz</span>' : ''}${statusPill(r)}<button class="icon-btn" data-close2 aria-label="Yopish">✕</button></div>
  <div class="drawer-b">
    <div class="media-box" id="dMedia">${r.media_path ? '<div class="spinner"></div>' : `<span>${LIVE ? '📭 Foto/video biriktirilmagan' : '🧪 Demo: foto Supabase Storage ulanganda ko‘rinadi'}</span>`}</div>

    <div class="card"><div class="card-b">
      <div style="font-size:15px; white-space:pre-wrap">${esc(r.description)}</div>
      <dl class="meta mt">
        <dt>Muammo turi</dt><dd>${catChip(r.category)}</dd>
        <dt>Viloyat</dt><dd>${esc(regionName(r.region))}</dd>
        <dt>Manzil / mo‘ljal</dt><dd>${esc(r.address || '—')}</dd>
        <dt>Joylashuv</dt><dd>${hasGeo ? `${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)} · <a href="https://www.google.com/maps?q=${r.lat},${r.lng}" target="_blank" rel="noopener">Google Maps ↗</a> · <a href="https://yandex.uz/maps/?pt=${r.lng},${r.lat}&z=16&l=map" target="_blank" rel="noopener">Yandex ↗</a>` : esc(r.location_text || '—')}</dd>
        <dt>Yuborilgan</dt><dd>${fmtDT(r.created_at)} <span class="muted">(${ago(r.created_at)})</span></dd>
        ${r.edited_at ? `<dt>Tahrirlangan</dt><dd>${fmtDT(r.edited_at)}</dd>` : ''}
        ${r.resolved_at ? `<dt>Hal qilingan</dt><dd>${fmtDT(r.resolved_at)} <span class="muted">(${daysBetween(r.created_at, r.resolved_at).toFixed(1)} kunda)</span></dd>` : ''}
        ${r.cancelled ? `<dt>Bekor qilingan</dt><dd>${fmtDT(r.cancelled_at)} — fuqaro tomonidan</dd>` : ''}
      </dl>
      ${hasGeo ? '<div class="mini-map mt" id="miniMap"></div>' : ''}
    </div></div>

    <div id="dV2"></div>

    ${r.is_anonymous_report || (!r.user_id && r.caller_phone) ? '' : `<div class="card"><div class="card-h"><h3>👤 Fuqaro</h3>${r.user_id ? `<button class="btn btn-sm" onclick="goReports({user:'${r.user_id}'}); closeDrawer()">Barcha arizalari (${state.reports.filter(x => x.user_id === r.user_id).length})</button>` : ''}</div>
      <div class="card-b"><dl class="meta">
        <dt>Ism</dt><dd>${userLabel(u)}</dd>
        <dt>Kontakt</dt><dd>${u && !u.is_anonymous ? (u.phone ? `<a href="tel:+${esc(String(u.phone).replace(/^\+/, ''))}">${esc(contactOf(u))}</a>` : u.email ? `<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>` : '—') : '—'}</dd>
        ${uFull && uFull.blocked ? '<dt>Holat</dt><dd><span class="pill" style="--c:var(--danger)">Bloklangan</span></dd>' : ''}
      </dl></div></div>`}

    <div class="card"><div class="card-h"><h3>🛠 Boshqarish</h3>${r.cancelled ? '<span class="muted small">Bekor qilingan ariza — faqat ko‘rish</span>' : ''}</div><div class="card-b">
      <div class="field"><span>Holat</span><div class="stepper" id="dStepper">${STATUSES.map((s, i) => `<button type="button" data-s="${i}" style="--c:${s.c}" class="${r.status === i ? 'on' : ''}" ${editable ? '' : 'disabled'}>${i + 1}. ${esc(s.short)}</button>`).join('')}</div></div>
      <div class="row">
        <label class="field"><span>Mas’ul tashkilot</span><select id="dOrg" ${editable ? '' : 'disabled'}><option value="">— Biriktirilmagan —</option>${suggestOrgs(r).map(o => `<option value="${o.id}" ${r.org_id === o.id ? 'selected' : ''}>${o._match ? '★ ' : ''}${esc(o.short_name || o.name)}</option>`).join('')}</select></label>
        <label class="field" style="flex:0 1 160px"><span>Muhimlik</span><select id="dPrio" ${editable ? '' : 'disabled'}>${PRIORITIES.map((p, i) => `<option value="${i}" ${(r.priority || 0) === i ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>Fuqaroga javob (ilovada “Mas’ul tashkilot javobi” bo‘limida ko‘rinadi)</span>
        <textarea id="dNote" placeholder="Masalan: Muammo joyida o‘rganildi, chiqindilar olib ketildi." ${editable ? '' : 'disabled'}>${esc(r.admin_note || '')}</textarea></label>
      <div class="row" style="align-items:center">
        <div class="muted small" style="flex:1 1 200px">${r.updated_at ? 'Oxirgi o‘zgarish: ' + fmtDT(r.updated_at) : ''}</div>
        <div style="flex:0 0 auto; display:flex; gap:8px">
          ${isAdmin() ? '<button class="btn btn-danger" id="dDelete">O‘chirish</button>' : ''}
          <button class="btn btn-primary" id="dSave" ${editable ? '' : 'disabled'}>Saqlash</button></div>
      </div>
    </div></div>

    <div class="card"><div class="card-h"><h3>🕘 Tarix</h3></div><div class="card-b"><ul class="timeline" id="dHist"><li class="muted">Yuklanmoqda...</li></ul></div></div>
  </div>`;
  $('#drawer [data-close2]').onclick = closeDrawer;
  v2Drawer(r);

  let chosen = r.status;
  $$('#dStepper button').forEach(b => b.onclick = () => { chosen = Number(b.dataset.s); $$('#dStepper button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#dOrg').onchange = e => { if (e.target.value && chosen < 2) { chosen = 2; $$('#dStepper button').forEach(x => x.classList.toggle('on', Number(x.dataset.s) === 2)); } };
  $('#dSave').onclick = async () => {
    const patch = {};
    if (chosen !== r.status) patch.status = chosen;
    const org = $('#dOrg').value || null; if (org !== (r.org_id || null)) patch.org_id = org;
    const pr = Number($('#dPrio').value); if (pr !== (r.priority || 0)) patch.priority = pr;
    const note = $('#dNote').value.trim() || null; if (note !== (r.admin_note || null)) patch.admin_note = note;
    if (!Object.keys(patch).length) return toast('O‘zgarish yo‘q');
    if (patch.status >= 3 && !(note || r.admin_note)) { if (!confirm('Fuqaroga javob matni yozilmagan. Baribir saqlaysizmi?')) return; }
    $('#dSave').disabled = true;
    try { mergeReports(await api.updateReports([r.id], patch)); toast('Saqlandi — fuqaro ilovasida darhol ko‘rinadi', 'ok'); refreshDrawer(); render(); }
    catch (e) { toast(e.message, 'err'); $('#dSave').disabled = false; }
  };
  const del = $('#dDelete');
  if (del) del.onclick = async () => {
    if (!confirm(`${r.case_no} arizasini butunlay o‘chirasizmi? Foto ham o‘chiriladi. Bu amalni qaytarib bo‘lmaydi.`)) return;
    try { await api.deleteReport(r); state.reports = state.reports.filter(x => x.id !== r.id); closeDrawer(); render(); toast('Ariza o‘chirildi', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  };

  // media
  if (r.media_path) {
    api.mediaUrl(r.media_path).then(url => {
      const box = $('#dMedia'); if (!box || drawerReport.id !== r.id) return;
      if (!url) { box.innerHTML = '<span>Faylni ochib bo‘lmadi</span>'; return; }
      box.innerHTML = r.media_type === 'video' ? `<video src="${esc(url)}" controls playsinline></video>` : `<img src="${esc(url)}" alt="Ariza fotosi">`;
      const img = $('img', box); if (img) img.onclick = () => openLightbox(url, 'image');
      box.insertAdjacentHTML('beforeend', '');
    }).catch(() => { const box = $('#dMedia'); if (box) box.innerHTML = '<span>⚠️ Faylni yuklab bo‘lmadi (Storage ruxsatlarini tekshiring)</span>'; });
  }
  // mini map
  if (hasGeo && window.L) {
    if (state.maps.mini) { state.maps.mini.remove(); }
    const m = L.map('miniMap', { zoomControl: true, attributionControl: false }).setView([r.lat, r.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
    L.circleMarker([r.lat, r.lng], markerStyle(r)).addTo(m);
    state.maps.mini = m; setTimeout(() => m.invalidateSize(), 150);
  }
  // history
  try {
    const hist = await api.history(r.id);
    const box = $('#dHist'); if (!box || drawerReport.id !== r.id) return;
    box.innerHTML = hist.length ? hist.map(h => `<li style="--c:${histColor(h)}">${histText(h)}<time>${fmtDT(h.created_at)}${h.actorName ? ' · ' + esc(h.actorName) : ''}</time></li>`).join('') : '<li class="muted">Tarix yo‘q</li>';
  } catch (e) { $('#dHist').innerHTML = `<li class="muted">${esc(e.message)}</li>`; }
}
function suggestOrgs(r) {
  return state.orgs.filter(o => o.active || o.id === r.org_id).map(o => ({ ...o, _match: o.categories && o.categories.includes(r.category) && (!o.region || o.region === r.region) }))
    .sort((a, b) => (b._match - a._match) || ((b.region === r.region) - (a.region === r.region)) || (a.short_name || a.name).localeCompare(b.short_name || b.name));
}
function histColor(h) { return h.event === 'status' ? STATUSES[h.status].c : h.event === 'cancelled' ? 'var(--sx)' : h.event === 'created' ? 'var(--s0)' : 'var(--accent)'; }
function histText(h) {
  switch (h.event) {
    case 'created': return '📥 Ariza qabul qilindi';
    case 'status': return `Holat: <b>${esc(STATUSES[h.status] ? STATUSES[h.status].t : h.status)}</b>`;
    case 'org': return `🏢 Tashkilotga yo‘naltirildi: <b>${esc(h.note)}</b>`;
    case 'note': return `💬 Javob yozildi: <span class="muted">“${esc(h.note)}”</span>`;
    case 'priority': return `Muhimlik: <b>${PRIORITIES[h.status] || h.status}</b>`;
    case 'edited': return '✏️ Fuqaro arizani tahrirladi';
    case 'cancelled': return '✖ Fuqaro arizani bekor qildi';
    case 'rejected': return `⚠️ ${esc(h.note || 'Asossiz deb topildi')}`;
    case 'transboundary': return `🌐 Transchegaraviy: <b>${esc(h.note || '')}</b>`;
    case 'signal': return `📤 Qo‘shni davlatga signal: ${esc(h.note || '')}`;
    case 'ai': return `🤖 ${esc(h.note || 'AI tahlili')}`;
    default: return esc(h.event);
  }
}
function openLightbox(url, type) {
  const lb = $('#lightbox');
  lb.innerHTML = type === 'video' ? `<video src="${esc(url)}" controls autoplay></video>` : `<img src="${esc(url)}" alt="">`;
  lb.hidden = false; lb.onclick = e => { if (e.target === lb || e.target.tagName === 'IMG') closeLightbox(); };
}
function closeLightbox() { const lb = $('#lightbox'); lb.hidden = true; lb.innerHTML = ''; }

// =====================================================================
// 3. ECO MAP
// =====================================================================
function markerStyle(r) {
  const c = resolveColor(r.cancelled ? CANCELLED.c : STATUSES[r.status].c);
  return { radius: r.priority === 2 ? 9 : 7, color: '#fff', weight: 2, fillColor: c, fillOpacity: .95 };
}
function renderMap(el) {
  const mf = state.mf;
  if (!el.dataset.built) {
    el.innerHTML = `
      <div class="toolbar">
        <div class="tabs" id="mStatus">${STATUSES.map((s, i) => `<button data-v="${i}"><span class="dot" style="background:${s.c}"></span> ${esc(s.short)}</button>`).join('')}</div>
        <div class="tabs" id="mCat">${CATEGORIES.map(c => `<button data-v="${c.k}">${c.icon} ${c.k}</button>`).join('')}</div>
        <select id="mPeriod">${periodOptions(mf.period || '')}</select>
        <label class="checks"><label><input type="checkbox" id="mCancelled"> Bekor qilinganlar</label>
          <label title="Qo‘shni davlatlar bilan bog‘liq hodisalar"><input type="checkbox" id="mTb"> 🌐 Faqat transchegaraviy</label>
          <label title="Sun’iy yo‘ldosh / ML aniqlashlari"><input type="checkbox" id="mDet" checked> 🛰️ Aniqlashlar</label></label>
        <span class="muted small" id="mCount"></span>
      </div>
      <div class="map-wrap"><div id="bigMap"></div>
        <div class="map-legend">${STATUSES.map(s => `<div><span class="dot" style="background:${s.c}"></span>${esc(s.t)}</div>`).join('')}
          <div><span class="dot" style="background:transparent; border:2px dashed var(--ink-3)"></span>Taxminiy (viloyat markazi)</div>
          <div><span class="dot" style="background:transparent; border:2px solid #E11D48; border-radius:3px"></span>🛰️ Sun’iy yo‘ldosh aniqlashi</div></div></div>`;
    el.dataset.built = '1';
    $$('#mStatus button').forEach(b => b.onclick = () => { const v = Number(b.dataset.v); mf.status.has(v) ? mf.status.delete(v) : mf.status.add(v); drawMarkers(); });
    $$('#mCat button').forEach(b => b.onclick = () => { const v = b.dataset.v; mf.cat.has(v) ? mf.cat.delete(v) : mf.cat.add(v); drawMarkers(); });
    $('#mPeriod').onchange = e => { mf.period = e.target.value; drawMarkers(); };
    $('#mCancelled').onchange = e => { mf.cancelled = e.target.checked; drawMarkers(); };
    $('#mTb').onchange = e => { mf.tb = e.target.checked; drawMarkers(); };
    $('#mDet').onchange = e => { mf.det = e.target.checked; drawMarkers(); };
  }
  if (!window.L) { $('#bigMap').innerHTML = '<div class="empty">Xarita kutubxonasi yuklanmadi</div>'; return; }
  if (!state.maps.big) {
    const m = L.map('bigMap', { preferCanvas: true }).setView([41.3, 64.5], 6);
    addBaseLayers(m);
    state.maps.big = m;
    state.maps.detLayer = L.layerGroup().addTo(m);
    state.maps.layer = L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 }) : L.layerGroup();
    m.addLayer(state.maps.layer);
  }
  setTimeout(() => state.maps.big.invalidateSize(), 60);
  drawMarkers();
}
function drawMarkers() {
  const mf = state.mf, layer = state.maps.layer; if (!layer) return;
  $$('#mStatus button').forEach(b => b.classList.toggle('on', mf.status.has(Number(b.dataset.v))));
  $$('#mCat button').forEach(b => b.classList.toggle('on', mf.cat.has(b.dataset.v)));
  layer.clearLayers();
  const since = periodStart(mf.period);
  const list = state.reports.filter(r => (mf.cancelled || !r.cancelled) && mf.status.has(r.status) && mf.cat.has(r.category) && (!since || new Date(r.created_at) >= since) && (!mf.tb || r.transboundary));
  let approx = 0;
  const markers = list.map(r => {
    let ll, st = markerStyle(r);
    if (r.lat != null && r.lng != null) ll = [r.lat, r.lng];
    else {
      const reg = REGIONS.find(x => x.code === r.region); if (!reg) return null;
      approx++; const h = parseInt(r.id.replace(/\D/g, '').slice(-6) || '1', 10);
      ll = [reg.lat + ((h % 100) / 100 - .5) * .25, reg.lng + ((Math.floor(h / 100) % 100) / 100 - .5) * .3];
      st = { ...st, dashArray: '3 3', color: cssVar('--ink-3'), fillOpacity: .55 };
    }
    return L.circleMarker(ll, st).bindPopup(`<b class="case-no">${esc(r.case_no)}</b> · ${catChip(r.category)}<br>${esc(r.description.slice(0, 120))}${r.description.length > 120 ? '…' : ''}
      <br><span style="color:${resolveColor(r.cancelled ? CANCELLED.c : STATUSES[r.status].c)}; font-weight:600">${esc(r.cancelled ? CANCELLED.t : STATUSES[r.status].t)}</span> · ${fmtDate(r.created_at)}
      <br><a href="#" onclick="openReport('${r.id}'); return false;">Batafsil ochish →</a>`);
  }).filter(Boolean);
  if (layer.addLayers) layer.addLayers(markers); else markers.forEach(m => layer.addLayer(m));
  const dets = drawDetections(state.maps.detLayer, mf.det !== false);
  $('#mCount').textContent = `${nf(markers.length)} ta nuqta${approx ? ` (${approx} tasi taxminiy)` : ''}${dets ? ` · 🛰️ ${dets} ta aniqlash` : ''}`;
}

// =====================================================================
// 4. TASHKILOTLAR
// =====================================================================
function renderOrgs(el) {
  const stat = id => { const rs = state.reports.filter(r => r.org_id === id && !r.cancelled); const done = rs.filter(r => r.status >= 3);
    const avg = done.filter(r => r.resolved_at).map(r => daysBetween(r.created_at, r.resolved_at));
    return { total: rs.length, open: rs.length - done.length, done: done.length, avg: avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null }; };
  el.innerHTML = `
    <div class="toolbar"><div class="grow muted">Jami: <b>${state.orgs.length}</b> ta tashkilot. ★ belgisi ariza sahifasida mos tashkilotni ko‘rsatadi (viloyat + muammo turi).</div>
      ${isAdmin() ? '<button class="btn btn-primary" id="orgAdd">＋ Tashkilot qo‘shish</button>' : ''}</div>
    <div class="card">${state.orgs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Tashkilot</th><th>Hudud</th><th>Yo‘nalishlar</th><th>Aloqa</th><th class="num">Biriktirilgan</th><th class="num">Jarayonda</th><th class="num">Hal qilingan</th><th class="num">O‘rt. muddat</th><th></th></tr></thead><tbody>
      ${state.orgs.map(o => { const s = stat(o.id); return `<tr>
        <td><b>${esc(o.short_name || o.name)}</b>${o.short_name ? `<div class="muted small">${esc(o.name)}</div>` : ''}${o.active ? '' : ' <span class="pill" style="--c:var(--sx)">Nofaol</span>'}</td>
        <td class="nowrap">${o.country && o.country !== 'UZ' ? esc(COUNTRIES[o.country] || o.country) : o.region ? esc(regionName(o.region)) : '🇺🇿 Respublika'}</td>
        <td>${(o.categories || []).map(c => `<span class="chip">${catOf(c).icon} ${esc(c)}</span>`).join('')}</td>
        <td class="small">${o.head ? esc(o.head) + '<br>' : ''}${o.phone ? esc(o.phone) + '<br>' : ''}${o.email ? `<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ''}</td>
        <td class="num"><a href="#" onclick="goReports({org:'${o.id}'}); return false;">${s.total}</a></td><td class="num">${s.open}</td><td class="num">${s.done}</td>
        <td class="num nowrap">${s.avg != null ? s.avg.toFixed(1) + ' kun' : '—'}</td>
        <td class="nowrap">${isAdmin() ? `<button class="btn btn-sm" data-edit="${o.id}">Tahrirlash</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty">Tashkilotlar hali qo‘shilmagan</div>'}</div>`;
  const add = $('#orgAdd'); if (add) add.onclick = () => orgModal();
  $$('[data-edit]', el).forEach(b => b.onclick = () => orgModal(state.orgs.find(o => o.id === b.dataset.edit)));
}
function orgModal(o = {}) {
  openModal(o.id ? 'Tashkilotni tahrirlash' : 'Yangi tashkilot', `
    <label class="field"><span>To‘liq nomi *</span><input id="oName" value="${esc(o.name || '')}" required></label>
    <div class="row"><label class="field"><span>Qisqa nomi</span><input id="oShort" value="${esc(o.short_name || '')}"></label>
      <label class="field"><span>Hudud</span><select id="oRegion">${regionOptions(o.region || '', '🇺🇿 Respublika miqyosida')}</select></label></div>
    <label class="field"><span>Davlat (qo‘shni davlat organi bo‘lsa — transchegaraviy signallar shu tashkilotga yuboriladi)</span>
      <select id="oCountry">${Object.entries(COUNTRIES).map(([k, v]) => `<option value="${k}" ${(o.country || 'UZ') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <div class="field"><span>Qaysi muammolar bo‘yicha mas’ul</span><div class="checks">${CATEGORIES.map(c => `<label><input type="checkbox" value="${c.k}" ${(o.categories || []).includes(c.k) ? 'checked' : ''}> ${c.icon} ${c.k}</label>`).join('')}</div></div>
    <div class="row"><label class="field"><span>Rahbar / mas’ul shaxs</span><input id="oHead" value="${esc(o.head || '')}"></label>
      <label class="field"><span>Telefon</span><input id="oPhone" value="${esc(o.phone || '')}"></label></div>
    <div class="row"><label class="field"><span>Email</span><input id="oEmail" type="email" value="${esc(o.email || '')}"></label>
      <label class="field"><span>Manzil</span><input id="oAddr" value="${esc(o.address || '')}"></label></div>
    <label class="checks"><label><input type="checkbox" id="oActive" ${o.active !== false ? 'checked' : ''}> Faol (arizalar yo‘naltirilishi mumkin)</label></label>
    <div class="form-error" id="oErr"></div>`,
  [o.id ? { label: 'O‘chirish', cls: 'btn-danger', fn: async () => {
      const n = state.reports.filter(r => r.org_id === o.id).length;
      if (!confirm(`“${o.short_name || o.name}” o‘chirilsinmi?${n ? ` ${n} ta arizadan biriktiruv olib tashlanadi.` : ''}`)) return false;
      await api.deleteOrg(o.id); state.orgs = state.orgs.filter(x => x.id !== o.id); state.reports.forEach(r => { if (r.org_id === o.id) r.org_id = null; });
      toast('Tashkilot o‘chirildi', 'ok'); render(); } } : null,
   { label: 'Saqlash', cls: 'btn-primary', fn: async () => {
      const data = { name: $('#oName').value.trim(), short_name: $('#oShort').value.trim() || null, region: $('#oRegion').value || null, country: $('#oCountry').value || 'UZ',
        categories: $$('#modalBody .checks input[type=checkbox][value]:checked').map(i => i.value), head: $('#oHead').value.trim() || null,
        phone: $('#oPhone').value.trim() || null, email: $('#oEmail').value.trim() || null, address: $('#oAddr').value.trim() || null, active: $('#oActive').checked };
      if (!data.name) { $('#oErr').textContent = 'Nomini kiriting'; return false; }
      if (o.id) data.id = o.id;
      const saved = await api.saveOrg(data);
      const i = state.orgs.findIndex(x => x.id === saved.id); if (i >= 0) state.orgs[i] = saved; else state.orgs.push(saved);
      state.orgs.sort((a, b) => a.name.localeCompare(b.name)); toast('Saqlandi', 'ok'); render(); } }].filter(Boolean));
}

// =====================================================================
// 5. FOYDALANUVCHILAR
// =====================================================================
function renderUsers(el) {
  const uf = state.uf, q = uf.q.trim().toLowerCase();
  const counts = {}; state.reports.forEach(r => { if (r.user_id) counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
  const tabs = {
    all: ['Barchasi', () => true],
    registered: ['Ro‘yxatdan o‘tgan', u => !u.is_anonymous],
    guests: ['Mehmonlar', u => u.is_anonymous],
    active: ['Ariza yuborgan', u => counts[u.id] > 0],
    blocked: ['Bloklangan', u => u.blocked],
    staff: ['Adminlar', u => u.role !== 'user']
  };
  const list = state.users.filter(tabs[uf.tab][1]).filter(u => !q || [u.full_name, u.phone, u.email].join(' ').toLowerCase().includes(q));
  const week = state.users.filter(u => new Date(u.created_at) > Date.now() - 7 * 864e5 && !u.is_anonymous).length;
  el.innerHTML = `
    <div class="grid g-kpi">
      <div class="card kpi"><div class="k-label">Ro‘yxatdan o‘tganlar</div><div class="k-val">${nf(state.users.filter(u => !u.is_anonymous).length)}</div><div class="k-sub">So‘nggi 7 kunda: +${week}</div></div>
      <div class="card kpi"><div class="k-label">Mehmon (anonim) sessiyalar</div><div class="k-val">${nf(state.users.filter(u => u.is_anonymous).length)}</div><div class="k-sub">Ro‘yxatdan o‘tmasdan yuborganlar</div></div>
      <div class="card kpi"><div class="k-label">Kamida 1 ta ariza yuborgan</div><div class="k-val">${nf(Object.keys(counts).length)}</div><div class="k-sub">faol fuqarolar</div></div>
      <div class="card kpi"><div class="k-label">Bloklangan</div><div class="k-val">${nf(state.users.filter(u => u.blocked).length)}</div><div class="k-sub">ariza yubora olmaydi</div></div>
    </div>
    <div class="toolbar mt">
      <div class="tabs" id="uTabs">${Object.entries(tabs).map(([k, [t, fn]]) => `<button data-t="${k}" class="${uf.tab === k ? 'on' : ''}">${t}<em>${state.users.filter(fn).length}</em></button>`).join('')}</div>
      <div class="grow"><input type="search" id="uQ" placeholder="🔍 Ism, telefon yoki email..." value="${esc(uf.q)}"></div>
      <button class="btn" id="uExport">⬇ CSV</button>
    </div>
    <div class="card">${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Foydalanuvchi</th><th>Kontakt</th><th>Turi</th><th>Ro‘yxatdan o‘tgan</th><th>So‘nggi kirish</th><th class="num">Arizalar</th><th>Rol</th><th></th></tr></thead><tbody>
      ${list.slice(0, 500).map(u => `<tr>
        <td><div style="display:flex; gap:8px; align-items:center"><span class="avatar" style="background:${u.is_anonymous ? 'var(--sx)' : 'var(--brand-2)'}">${esc((u.full_name || (u.is_anonymous ? '?' : 'U'))[0].toUpperCase())}</span>
          <div><b>${esc(u.full_name || (u.is_anonymous ? 'Mehmon' : '—'))}</b>${u.blocked ? ' <span class="pill" style="--c:var(--danger)">Bloklangan</span>' : ''}${u.id === state.me.id ? ' <span class="chip">Siz</span>' : ''}</div></div></td>
        <td class="nowrap">${u.is_anonymous ? '<span class="muted">—</span>' : esc(contactOf(u))}</td>
        <td>${u.is_anonymous ? '<span class="chip">Mehmon</span>' : u.phone ? '<span class="chip">📱 Telefon</span>' : '<span class="chip">✉️ Email</span>'}</td>
        <td class="nowrap">${fmtDate(u.created_at)}</td>
        <td class="nowrap muted">${u.last_sign_in_at ? ago(u.last_sign_in_at) : '—'}</td>
        <td class="num">${counts[u.id] ? `<a href="#" onclick="goReports({user:'${u.id}'}); return false;">${counts[u.id]}</a>` : '0'}</td>
        <td>${u.role === 'user' ? '<span class="muted">Foydalanuvchi</span>' : `<span class="pill" style="--c:var(--s2)">${ROLES[u.role]}</span>`}</td>
        <td class="nowrap">${u.id !== state.me.id && isAdmin() ? `<button class="btn btn-sm" data-u="${u.id}">Boshqarish</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>${list.length > 500 ? `<div class="pager muted">Birinchi 500 tasi ko‘rsatildi — qidiruvdan foydalaning.</div>` : ''}` : '<div class="empty">Foydalanuvchilar topilmadi</div>'}</div>`;
  $$('#uTabs button').forEach(b => b.onclick = () => { uf.tab = b.dataset.t; renderUsers(el); });
  $('#uQ').addEventListener('input', debounce(e => { uf.q = e.target.value; renderUsers(el); const i = $('#uQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300));
  $('#uExport').onclick = () => downloadCSV(`foydalanuvchilar-${dayKey(Date.now())}.csv`, [['Ism', 'Telefon', 'Email', 'Turi', 'Ro‘yxatdan o‘tgan', 'So‘nggi kirish', 'Arizalar', 'Rol', 'Bloklangan'],
    ...list.map(u => [u.full_name || '', u.phone ? '+' + u.phone : '', u.email || '', u.is_anonymous ? 'Mehmon' : 'Ro‘yxatdan o‘tgan', fmtDT(u.created_at), fmtDT(u.last_sign_in_at), counts[u.id] || 0, ROLES[u.role], u.blocked ? 'ha' : ''])]);
  $$('[data-u]', el).forEach(b => b.onclick = () => userModal(state.users.find(u => u.id === b.dataset.u)));
}
function userModal(u) {
  const n = state.reports.filter(r => r.user_id === u.id).length;
  openModal(u.full_name || 'Foydalanuvchi', `
    <dl class="meta"><dt>Kontakt</dt><dd>${esc(contactOf(u))}</dd><dt>Ro‘yxatdan o‘tgan</dt><dd>${fmtDT(u.created_at)}</dd><dt>Arizalar</dt><dd>${n} ta</dd><dt>ID</dt><dd class="small muted">${esc(u.id)}</dd></dl>
    <div class="set-list mt">
      <div class="set-item"><div><b>Bloklash</b><p>Bloklangan foydalanuvchi yangi ariza yubora olmaydi</p></div><label class="switch"><input type="checkbox" id="uBlocked" ${u.blocked ? 'checked' : ''}><i></i></label></div>
      <div class="set-item"><div><b>Rol</b><p>Moderator — arizalarni boshqaradi; Admin — hammasini</p></div>
        <select id="uRole">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.role === k ? 'selected' : ''} ${u.is_anonymous && k !== 'user' ? 'disabled' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <label class="field mt"><span>Ichki izoh (faqat adminlar ko‘radi)</span><textarea id="uNote">${esc(u.admin_note || '')}</textarea></label>
    <div class="form-error" id="uErr"></div>`,
  [{ label: 'Hisobni o‘chirish', cls: 'btn-danger', fn: async () => {
      if (!confirm('Foydalanuvchi hisobi o‘chirilsinmi? Uning arizalari statistikada anonim holda qoladi.')) return false;
      await api.deleteUser(u.id); state.users = state.users.filter(x => x.id !== u.id); state.reports.forEach(r => { if (r.user_id === u.id) { r.user_id = null; r.user = null; } });
      toast('Hisob o‘chirildi', 'ok'); render(); } },
   { label: 'Arizalari', cls: '', fn: () => { goReports({ user: u.id }); } },
   { label: 'Saqlash', cls: 'btn-primary', fn: async () => {
      const saved = await api.updateUser(u.id, { blocked: $('#uBlocked').checked, role: $('#uRole').value, admin_note: $('#uNote').value.trim() || null });
      Object.assign(u, saved); toast('Saqlandi', 'ok'); render(); } }]);
}

// =====================================================================
// 6. STATISTIKA
// =====================================================================
function renderStats(el) {
  const sf = state.sf, since = periodStart(sf.period);
  const R = state.reports.filter(r => !r.cancelled && (!since || new Date(r.created_at) >= since) && (!sf.region || r.region === sf.region));
  const matrix = REGIONS.map(reg => ({ reg, row: CATEGORIES.map(c => R.filter(r => r.region === reg.code && r.category === c.k).length) }))
    .map(x => ({ ...x, total: x.row.reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total);
  const colTotals = CATEGORIES.map((_, i) => matrix.reduce((s, x) => s + x.row[i], 0));
  const maxCell = Math.max(1, ...matrix.flatMap(x => x.row));
  const resolved = R.filter(r => r.resolved_at);
  const avg = resolved.length ? resolved.reduce((s, r) => s + daysBetween(r.created_at, r.resolved_at), 0) / resolved.length : 0;
  const topCat = CATEGORIES.map((c, i) => [c, colTotals[i]]).sort((a, b) => b[1] - a[1])[0];
  const topReg = matrix[0];

  el.innerHTML = `
    <div class="toolbar">
      <select id="sPeriod">${periodOptions(sf.period)}</select>
      <select id="sRegion">${regionOptions(sf.region || '')}</select>
      <span class="grow"></span>
      <button class="btn" id="sExport">⬇ Jadvalni CSV</button>
    </div>
    <div class="grid g-kpi">
      <div class="card kpi"><div class="k-label">Arizalar (tanlangan davr)</div><div class="k-val">${nf(R.length)}</div><div class="k-sub">bekor qilinganlarsiz</div></div>
      <div class="card kpi"><div class="k-label">Eng ko‘p muammo</div><div class="k-val" style="font-size:22px">${topCat && topCat[1] ? topCat[0].icon + ' ' + topCat[0].k : '—'}</div><div class="k-sub">${topCat && topCat[1] ? nf(topCat[1]) + ' ta · ' + Math.round(topCat[1] / Math.max(1, R.length) * 100) + '%' : ''}</div></div>
      <div class="card kpi"><div class="k-label">Eng faol hudud</div><div class="k-val" style="font-size:20px">${topReg && topReg.total ? esc(topReg.reg.uz) : '—'}</div><div class="k-sub">${topReg && topReg.total ? nf(topReg.total) + ' ta ariza' : ''}</div></div>
      <div class="card kpi"><div class="k-label">Hal qilinganlar</div><div class="k-val">${R.length ? Math.round(R.filter(r => r.status >= 3).length / R.length * 100) : 0}%</div><div class="k-sub">o‘rtacha ${avg ? avg.toFixed(1) : '—'} kunda</div></div>
    </div>

    <div class="card mt"><div class="card-h"><h3>Viloyatlar bo‘yicha — muammo turlari kesimida</h3></div>
      <div class="card-b"><div class="chart-box tall"><canvas id="chRegCat"></canvas></div></div></div>

    <div class="card mt"><div class="card-h"><h3>Viloyat × muammo turi jadvali</h3><span class="muted small">Katakchani bosing — tegishli arizalar ochiladi</span></div>
      <div class="card-b" style="padding:8px 0 0"><div class="table-wrap"><table class="tbl heat"><thead><tr><th>Viloyat</th>${CATEGORIES.map(c => `<th>${c.icon} ${c.k}</th>`).join('')}<th>Jami</th><th>Hal qilingan</th></tr></thead><tbody>
      ${matrix.map(x => `<tr><td class="nowrap"><b>${esc(x.reg.uz)}</b></td>${x.row.map((v, i) => `<td class="h" style="background:color-mix(in srgb, ${CATEGORIES[i].color} ${Math.round(v / maxCell * 55)}%, transparent); cursor:${v ? 'pointer' : 'default'}" ${v ? `onclick="goReports({region:'${x.reg.code}', category:'${CATEGORIES[i].k}', period:'${sf.period}'})"` : ''}>${v || '<span class="muted">·</span>'}</td>`).join('')}
        <td class="h">${x.total}</td><td>${x.total ? Math.round(R.filter(r => r.region === x.reg.code && r.status >= 3).length / x.total * 100) + '%' : '—'}</td></tr>`).join('')}
      <tr><td><b>Jami</b></td>${colTotals.map(v => `<td class="h">${v}</td>`).join('')}<td class="h">${R.length}</td><td>${R.length ? Math.round(R.filter(r => r.status >= 3).length / R.length * 100) + '%' : '—'}</td></tr>
      </tbody></table></div></div></div>

    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><h3>Muammo turlari ulushi</h3></div><div class="card-b"><div class="chart-box"><canvas id="chCat"></canvas></div></div></div>
      <div class="card"><div class="card-h"><h3>Holatlar bo‘yicha</h3></div><div class="card-b">${barsHTML(STATUSES.map((s, i) => ({ label: s.t, v: R.filter(r => r.status === i).length, color: s.c })))}</div></div>
    </div>

    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><h3>Kunlik oqim</h3></div><div class="card-b"><div class="chart-box"><canvas id="chDaily"></canvas></div></div></div>
      <div class="card"><div class="card-h"><h3>Hafta kunlari va soatlar</h3><span class="muted small">qachon ko‘p murojaat qilinadi</span></div><div class="card-b"><div class="chart-box"><canvas id="chHour"></canvas></div></div></div>
    </div>

    ${v2StatsHTML(R)}

    <div class="card mt"><div class="card-h"><h3>Tashkilotlar samaradorligi</h3></div><div class="card-b" style="padding:8px 0 0">
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Tashkilot</th><th class="num">Biriktirilgan</th><th class="num">Hal qilingan</th><th class="num">%</th><th class="num">O‘rt. muddat</th></tr></thead><tbody>
      ${state.orgs.map(o => { const rs = R.filter(r => r.org_id === o.id), d = rs.filter(r => r.status >= 3), t = d.filter(r => r.resolved_at).map(r => daysBetween(r.created_at, r.resolved_at));
        return { o, n: rs.length, d: d.length, avg: t.length ? t.reduce((a, b) => a + b, 0) / t.length : null }; }).filter(x => x.n).sort((a, b) => b.n - a.n)
        .map(x => `<tr><td>${esc(x.o.short_name || x.o.name)}</td><td class="num">${x.n}</td><td class="num">${x.d}</td><td class="num">${Math.round(x.d / x.n * 100)}%</td><td class="num">${x.avg != null ? x.avg.toFixed(1) + ' kun' : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Ma’lumot yo‘q</td></tr>'}
      </tbody></table></div></div></div>`;

  $('#sPeriod').onchange = e => { sf.period = e.target.value; renderStats(el); };
  $('#sRegion').onchange = e => { sf.region = e.target.value; renderStats(el); };
  v2StatsCharts(R);
  $('#sExport').onclick = () => downloadCSV(`statistika-${dayKey(Date.now())}.csv`, [['Viloyat', ...CATEGORIES.map(c => c.k), 'Jami'], ...matrix.map(x => [x.reg.uz, ...x.row, x.total]), ['Jami', ...colTotals, R.length]]);

  const regs = matrix.filter(x => x.total);
  makeChart('regcat', $('#chRegCat'), {
    type: 'bar',
    data: { labels: regs.map(x => x.reg.uz.replace(' viloyati', '').replace(' Respublikasi', '')), datasets: CATEGORIES.map((c, i) => ({ label: c.icon + ' ' + c.k, data: regs.map(x => x.row[i]), backgroundColor: c.color, borderRadius: 3 })) },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: true, grid: { display: false } } } }
  });
  makeChart('cat', $('#chCat'), {
    type: 'doughnut', data: { labels: CATEGORIES.map(c => c.icon + ' ' + c.k), datasets: [{ data: colTotals, backgroundColor: CATEGORIES.map(c => c.color), borderColor: cssVar('--surface'), borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right' } } }
  });
  const nDays = sf.period && sf.period !== 'today' ? Math.min(Number(sf.period), 365) : sf.period === 'today' ? 1 : 90;
  const days = []; for (let i = nDays - 1; i >= 0; i--) days.push(dayKey(Date.now() - i * 864e5));
  const byDay = Object.fromEntries(days.map(d => [d, 0])); R.forEach(r => { const k = dayKey(r.created_at); if (k in byDay) byDay[k]++; });
  makeChart('daily', $('#chDaily'), {
    type: 'line', data: { labels: days.map(d => d.slice(8) + '.' + d.slice(5, 7)), datasets: [{ label: 'Arizalar', data: days.map(d => byDay[d]), borderColor: cssVar('--accent'), backgroundColor: 'transparent', tension: .3, pointRadius: 0, borderWidth: 2 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
  const wd = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], byWd = Array(7).fill(0), byH = Array(24).fill(0);
  R.forEach(r => { const d = new Date(r.created_at); byWd[(d.getDay() + 6) % 7]++; byH[d.getHours()]++; });
  makeChart('hour', $('#chHour'), {
    type: 'bar', data: { labels: byH.map((_, h) => String(h).padStart(2, '0')), datasets: [{ label: 'Soat bo‘yicha', data: byH, backgroundColor: cssVar('--s0'), borderRadius: 3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Hafta kunlari: ' + wd.map((w, i) => `${w} ${byWd[i]}`).join(' · '), color: cssVar('--ink-3'), font: { weight: 500 } } },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}

// =====================================================================
// 7. FAOLIYAT JURNALI
// =====================================================================
async function renderActivity(el) {
  el.innerHTML = '<div class="card"><div class="empty"><div class="spinner" style="margin:auto"></div></div></div>';
  let list = [];
  try { list = await api.activity(300); } catch (e) { el.innerHTML = `<div class="card"><div class="empty">${esc(e.message)}</div></div>`; return; }
  if (state.page !== 'activity') return;
  el.innerHTML = `<div class="card">${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Vaqt</th><th>Ariza</th><th>Hodisa</th><th>Kim</th></tr></thead><tbody>
    ${list.map(h => `<tr class="row-click" data-id="${h.report_id}"><td class="nowrap" title="${fmtDT(h.created_at)}">${ago(h.created_at)}</td><td class="nowrap"><span class="case-no">${esc(h.case_no || '—')}</span></td>
      <td>${histText(h)}</td><td class="nowrap">${h.actorRole && h.actorRole !== 'user' ? `<span class="pill" style="--c:var(--s2)">${esc(h.actorName || ROLES[h.actorRole])}</span>` : `<span class="muted">${h.event === 'created' || h.event === 'edited' || h.event === 'cancelled' ? 'Fuqaro' : esc(h.actorName || 'Tizim')}</span>`}</td></tr>`).join('')}
    </tbody></table></div><div class="pager muted">So‘nggi ${list.length} ta hodisa</div>` : '<div class="empty">Hozircha hodisalar yo‘q</div>'}</div>`;
}

// =====================================================================
// 8. SOZLAMALAR
// =====================================================================
function renderSettings(el) {
  const s = state.settings, ro = !isAdmin(), an = s.announcement || { enabled: false, uz: '', ru: '' };
  el.innerHTML = `
  ${ro ? '<div class="demo-banner" style="margin:0 0 16px">Sozlamalarni faqat <b>admin</b> o‘zgartira oladi.</div>' : ''}
  <div class="grid g-2">
    <div class="card"><div class="card-h"><h3>📱 Mobil ilova</h3></div><div class="card-b"><div class="set-list">
      <div class="set-item"><div><b>Arizalarni qabul qilish</b><p>O‘chirilsa, ilova yangi ariza yuborishda “vaqtincha to‘xtatilgan” xabarini ko‘rsatadi</p></div>
        <label class="switch"><input type="checkbox" data-set="accepting_reports" ${s.accepting_reports !== false ? 'checked' : ''} ${ro ? 'disabled' : ''}><i></i></label></div>
      <div class="set-item"><div><b>Tahrirlash muddati (kun)</b><p>Fuqaro yuborgan arizasini necha kun ichida tahrirlay oladi</p></div>
        <input type="number" min="0" max="60" data-set="edit_days" value="${Number(s.edit_days) || 5}" ${ro ? 'disabled' : ''}></div>
      <div class="set-item"><div><b>Kunlik limit</b><p>Bir foydalanuvchi 24 soatda yubora oladigan arizalar soni (0 — cheklovsiz)</p></div>
        <input type="number" min="0" max="500" data-set="daily_limit" value="${Number(s.daily_limit) || 0}" ${ro ? 'disabled' : ''}></div>
      <div class="set-item"><div><b>Avtomatik yo‘naltirish</b><p>Yangi ariza viloyat va muammo turiga mos faol tashkilotga avtomatik biriktiriladi</p></div>
        <label class="switch"><input type="checkbox" data-set="auto_assign" ${s.auto_assign === true ? 'checked' : ''} ${ro ? 'disabled' : ''}><i></i></label></div>
    </div></div></div>

    <div class="card"><div class="card-h"><h3>📢 Ilovadagi e’lon</h3></div><div class="card-b">
      <div class="set-item" style="padding-top:0"><div><b>E’lonni ko‘rsatish</b><p>Ilova bosh sahifasida banner sifatida chiqadi</p></div>
        <label class="switch"><input type="checkbox" id="anOn" ${an.enabled ? 'checked' : ''} ${ro ? 'disabled' : ''}><i></i></label></div>
      <label class="field"><span>O‘zbekcha matn</span><textarea id="anUz" ${ro ? 'disabled' : ''} placeholder="Masalan: 5-iyun — Butunjahon atrof-muhit kuni! Hasharga qo‘shiling.">${esc(an.uz || '')}</textarea></label>
      <label class="field"><span>Ruscha matn</span><textarea id="anRu" ${ro ? 'disabled' : ''}>${esc(an.ru || '')}</textarea></label>
      <button class="btn btn-primary" id="anSave" ${ro ? 'disabled' : ''}>E’lonni saqlash</button>
    </div></div>

    ${v2SettingsHTML(ro)}

    <div class="card"><div class="card-h"><h3>🔌 Supabase ulanishi</h3></div><div class="card-b"><dl class="meta">
      <dt>Rejim</dt><dd>${LIVE ? '<span class="pill" style="--c:var(--s3)"><span class="dot"></span>Ulangan</span>' : '<span class="pill" style="--c:var(--warn)"><span class="dot"></span>DEMO</span>'}</dd>
      <dt>Project URL</dt><dd class="small">${LIVE ? esc(CFG.SUPABASE_URL) : '<code>config.js</code> da ko‘rsatilmagan'}</dd>
      <dt>Storage bucket</dt><dd><code>${esc(BUCKET)}</code></dd>
      <dt>Realtime</dt><dd>${esc($('#liveText').textContent)}</dd>
      <dt>Ma’lumotlar</dt><dd>${nf(state.reports.length)} ariza · ${nf(state.users.length)} foydalanuvchi · ${nf(state.orgs.length)} tashkilot</dd>
    </dl><p class="small muted mt">Sozlash tartibi: <code>docs/SUPABASE_SETUP.md</code>. Jadval tuzilmasi: <code>supabase/schema.sql</code>.</p></div></div>

    <div class="card"><div class="card-h"><h3>👤 Mening hisobim</h3></div><div class="card-b"><dl class="meta">
      <dt>Ism</dt><dd>${esc(state.me.full_name || '—')}</dd><dt>Email</dt><dd>${esc(state.me.email || '—')}</dd><dt>Rol</dt><dd>${esc(ROLES[state.me.role])}</dd></dl>
      <div class="set-item mt"><div><b>Mavzu</b><p>Panel ko‘rinishi</p></div>
        <select id="themeSel"><option value="">Tizim bo‘yicha</option><option value="light">☀️ Yorug‘</option><option value="dark">🌙 Qorong‘i</option></select></div>
      <p class="small muted">Yangi admin/moderator qo‘shish: “Foydalanuvchilar” bo‘limida hisobni tanlab, rolini o‘zgartiring.</p>
    </div></div>
  </div>`;
  $('#themeSel').value = store('theme') || '';
  $('#themeSel').onchange = e => { store('theme', e.target.value); applyTheme(e.target.value); render(); };
  if (ro) return;
  v2BindSettings(el);
  $$('[data-set]', el).forEach(inp => inp.onchange = async () => {
    const k = inp.dataset.set, v = inp.type === 'checkbox' ? inp.checked : Math.max(0, parseInt(inp.value, 10) || 0);
    try { await api.saveSetting(k, v); state.settings[k] = v; toast('Sozlama saqlandi', 'ok'); }
    catch (e) { toast(e.message, 'err'); renderSettings(el); }
  });
  const saveAn = async () => {
    const v = { enabled: $('#anOn').checked, uz: $('#anUz').value.trim(), ru: $('#anRu').value.trim() };
    try { await api.saveSetting('announcement', v); state.settings.announcement = v; toast('E’lon saqlandi', 'ok'); } catch (e) { toast(e.message, 'err'); }
  };
  $('#anSave').onclick = saveAn; $('#anOn').onchange = saveAn;
}

// =====================================================================
// MODAL
// =====================================================================
function openModal(title, body, actions = []) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  const foot = $('#modalFoot'); foot.innerHTML = '';
  actions.forEach((a, i) => {
    const b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.label;
    if (i === 0 && actions.length > 2) b.style.marginRight = 'auto';
    b.onclick = async () => {
      b.disabled = true;
      try { const res = await a.fn(); if (res !== false) closeModal(); }
      catch (e) { toast(e.message, 'err'); }
      b.disabled = false;
    };
    foot.appendChild(b);
  });
  $('#modalWrap').hidden = false;
  const first = $('#modalBody input, #modalBody select, #modalBody textarea'); if (first) first.focus();
}
function closeModal() { $('#modalWrap').hidden = true; }
$('#modalWrap').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
window.closeDrawer = closeDrawer;
window.state = state;

// admin-v2.js ham yuklanib bo'lgach ishga tushadi
window.addEventListener('DOMContentLoaded', boot);
