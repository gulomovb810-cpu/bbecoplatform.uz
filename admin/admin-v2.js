/* =====================================================================
   bbecoplatform.uz — Admin panel v2 imkoniyatlari
   🛰️ Sun'iy yo'ldosh aniqlashlari  💰 Shaffoflik  📞 Operator qabuli
   🕶️ Maxfiy murojaat (shifrlangan aloqani yuridik ochish)  🎙️ Ovozli
   🤖 AI tahlili  ⚖️ Huquqiy asos  🌐 Transchegaraviy signal  🏆 Reyting
   admin.js dan keyin yuklanadi; uning global funksiyalari va `state`idan foydalanadi.
   ===================================================================== */
'use strict';

const CHANNELS = {
  app:       { i: '📱', t: 'Mobil ilova' },
  voice:     { i: '🎙️', t: 'Ovozli murojaat' },
  anonymous: { i: '🕶️', t: 'Maxfiy murojaat' },
  phone:     { i: '📞', t: 'Telefon qo‘ng‘irog‘i' },
  sms:       { i: '✉️', t: 'SMS / USSD' },
  operator:  { i: '👤', t: 'Operator (shaxsan)' },
  satellite: { i: '🛰️', t: 'Sun’iy yo‘ldosh' }
};
const COUNTRIES = { UZ: '🇺🇿 O‘zbekiston', KZ: '🇰🇿 Qozog‘iston', KG: '🇰🇬 Qirg‘iziston', TJ: '🇹🇯 Tojikiston', TM: '🇹🇲 Turkmaniston', AF: '🇦🇫 Afg‘oniston' };
const COUNTRY_RU = { KZ: 'Республика Казахстан', KG: 'Кыргызская Республика', TJ: 'Республика Таджикистан', TM: 'Туркменистан', AF: 'Афганистан' };
const DET_STATUS = { new: ['Yangi', 'var(--s0)'], confirmed: ['Tasdiqlangan', 'var(--s1)'], converted: ['Arizaga aylantirildi', 'var(--s3)'], dismissed: ['Rad etildi', 'var(--sx)'] };
const PROJ_STATUS = { proposed: 'Taklif', approved: 'Tasdiqlangan', in_progress: 'Amalga oshirilmoqda', done: 'Yakunlangan', cancelled: 'Bekor qilingan' };
const FUND_SRC = { compensation: 'Kompensatsiya to‘lovlari', fine: 'Jarimalar', budget: 'Davlat byudjeti', grant: 'Grantlar', other: 'Boshqa' };
const LAW_353 = { '4': 'Fuqarolarning huquq va majburiyatlari', '7': 'Atmosfera havosi sifati normativlari', '8': 'Doimiy manbalarning zararli ta’sir normativlari',
  '13': 'Zararli ta’sirni cheklash, to‘xtatib turish yoki tugatish', '21': 'Chiqindilarni joylashtirish yoki ko‘mishga doir talablar',
  '25': 'Kompensatsiya to‘lovlari', '29': 'Qonunchilikni buzganlik uchun javobgarlik' };
const OTHER_LAWS = { chiqindi: '“Chiqindilar to‘g‘risida”gi Qonun', suv: '“Suv va suvdan foydalanish to‘g‘risida”gi Qonun',
  osimlik: '“O‘simlik dunyosini muhofaza qilish va undan foydalanish to‘g‘risida”gi Qonun', yer: 'Yer kodeksi', tabiat: '“Tabiatni muhofaza qilish to‘g‘risida”gi Qonun' };

Object.assign(state, { detections: [], funds: [], projects: [], suggestions: [], sf2: { status: 'new', source: '' } });
state.mf.det = true;

// ---------------------------------------------------------------------
// Kichik yordamchilar (admin.js dan chaqiriladi)
// ---------------------------------------------------------------------
function channelIcon(r) { const c = CHANNELS[r.channel] || CHANNELS.app; return `<span title="${esc(c.t)}">${c.i}</span>`; }
function reporterLabel(r) {
  if (r.is_anonymous_report) return '<span class="muted">🕶️ Maxfiy</span>';
  if (!r.user_id && r.caller_phone) return `<span class="muted">${CHANNELS[r.channel] ? CHANNELS[r.channel].i : '📞'} ${esc(r.caller_phone)}</span>`;
  if (!r.user_id && r.channel === 'satellite') return '<span class="muted">🛰️ Avtomatik</span>';
  return userLabel(r.user);
}
function aiMismatch(r) { return r.ai_category && r.ai_confidence >= 0.6 && r.ai_category !== r.category; }
function aiCell(r) {
  if (!r.ai_category) return '<span class="muted">—</span>';
  const p = Math.round((r.ai_confidence || 0) * 100);
  return `<span title="AI: ${esc(r.ai_category)} · ${p}%${r.ai_summary ? ' — ' + esc(r.ai_summary) : ''}">${catOf(r.ai_category).icon} ${p}%${aiMismatch(r) ? ' <b style="color:var(--warn)">≠</b>' : ''}</span>`;
}
function legalLabel(ref) {
  if (ref.startsWith('353-I:')) { const n = ref.slice(6); return `Atmosfera havosi qonuni, ${n}-modda${LAW_353[n] ? ' (' + LAW_353[n] + ')' : ''}`; }
  if (ref.startsWith('law:')) return OTHER_LAWS[ref.slice(4)] || ref;
  return ref;
}
const channelOptions = sel => `<option value="">Barcha kanallar</option>` + Object.entries(CHANNELS).map(([k, c]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${c.i} ${c.t}</option>`).join('');
const FLAGS = { tb: '🌐 Transchegaraviy', rejected: '⚠️ Asossiz deb topilgan', ai_mismatch: '🤖 AI turi mos kelmagan', audio: '🎙️ Ovozli yozuvi bor', legal: '⚖️ Huquqiy asosi bor', no_media: '📭 Fotosiz' };
const flagOptions = sel => `<option value="">Barcha belgilar</option>` + Object.entries(FLAGS).map(([k, t]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${t}</option>`).join('');
function v2Filter(r, f) {
  if (f.channel && (r.channel || 'app') !== f.channel) return false;
  switch (f.flag) {
    case 'tb': return !!r.transboundary;
    case 'rejected': return !!r.rejected;
    case 'ai_mismatch': return aiMismatch(r);
    case 'audio': return !!r.audio_path;
    case 'legal': return (r.legal_refs || []).length > 0;
    case 'no_media': return !r.media_path;
    default: return true;
  }
}
function fmtMoney(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toLocaleString('uz-UZ', { maximumFractionDigits: 2 }) + ' mlrd so‘m';
  if (n >= 1e6) return (n / 1e6).toLocaleString('uz-UZ', { maximumFractionDigits: 1 }) + ' mln so‘m';
  return n.toLocaleString('uz-UZ') + ' so‘m';
}
function distM(a, b) { const k = 111320; return Math.hypot((a.lat - b.lat) * k, (a.lng - b.lng) * k * Math.cos(a.lat * Math.PI / 180)); }

// Xarita asoslari: OSM, sun'iy yo'ldosh (Esri) va Sentinel-2 bulutsiz mozaika (EOX)
function addBaseLayers(m, def) {
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' });
  const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: 'Tasvirlar &copy; Esri, Maxar, Earthstar Geographics' });
  const s2 = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg',
    { maxZoom: 17, attribution: 'Sentinel-2 cloudless 2021 — s2maps.eu, EOX IT Services (Copernicus Sentinel ma’lumotlari)' });
  (def === 'sat' ? esri : osm).addTo(m);
  L.control.layers({ 'Xarita (OSM)': osm, 'Sun’iy yo‘ldosh (Esri)': esri, 'Sentinel-2 (EOX, 2021)': s2 }, null, { position: 'topright' }).addTo(m);
}

// =====================================================================
// MA'LUMOTLAR QATLAMI (v2)
// =====================================================================
Object.assign(liveApi, {
  async detections() { const { data, error } = await sb.from('detections').select('*').order('created_at', { ascending: false }).limit(2000); if (error) throw error; return data; },
  async saveDetection(id, patch) { const { data, error } = await sb.from('detections').update(patch).eq('id', id).select().single(); if (error) throw error; return data; },
  async insertDetections(rows) { const { data, error } = await sb.from('detections').insert(rows).select(); if (error) throw error; return data; },
  async createReport(row) { const { data, error } = await sb.from('reports').insert(row).select(REPORT_COLS).single(); if (error) throw error; return normReport(data); },
  async funds() { const { data, error } = await sb.from('eco_funds').select('*').order('year', { ascending: false }); if (error) throw error; return data; },
  async saveFund(f) { const q = f.id ? sb.from('eco_funds').update(f).eq('id', f.id) : sb.from('eco_funds').insert(f); const { data, error } = await q.select().single(); if (error) throw error; return data; },
  async deleteFund(id) { const { error } = await sb.from('eco_funds').delete().eq('id', id); if (error) throw error; },
  async projects() { const { data, error } = await sb.from('eco_projects').select('*').order('created_at', { ascending: false }); if (error) throw error; return data; },
  async saveProject(p) { const q = p.id ? sb.from('eco_projects').update(p).eq('id', p.id) : sb.from('eco_projects').insert(p); const { data, error } = await q.select().single(); if (error) throw error; return data; },
  async deleteProject(id) { const { error } = await sb.from('eco_projects').delete().eq('id', id); if (error) throw error; },
  async suggestions() { const { data, error } = await sb.from('project_suggestions').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(500); if (error) throw error; return data; },
  async updateSuggestion(id, status) { const { error } = await sb.from('project_suggestions').update({ status }).eq('id', id); if (error) throw error; },
  async signals(reportId) { const { data, error } = await sb.from('transboundary_signals').select('*').eq('report_id', reportId).order('created_at'); if (error) throw error; return data; },
  async addSignal(sig) {
    const { error } = await sb.from('transboundary_signals').insert({ ...sig, sent_by: state.me.id }); if (error) throw error;
    await sb.from('report_status_history').insert({ report_id: sig.report_id, event: 'signal', note: sig.country, actor: state.me.id });
  },
  async logUnlock(reportId, reason) {
    const { error } = await sb.from('report_status_history').insert({ report_id: reportId, event: 'unlock', note: reason.slice(0, 500), actor: state.me.id });
    if (error) throw error;
  }
});

// --- Demo ma'lumotlar ---
(function seedDemo() {
  const rnd = mulberry32(777), pick = a => a[Math.floor(rnd() * a.length)], now = Date.now();
  const legal = { Havo: ['353-I:4', '353-I:7', '353-I:8', '353-I:13', '353-I:29'], Chiqindi: ['353-I:21', '353-I:4', 'law:chiqindi'], Suv: ['law:suv', 'law:tabiat'],
    Daraxt: ['law:osimlik', 'law:tabiat'], Tuproq: ['law:yer', 'law:tabiat'], Boshqa: ['law:tabiat'] };
  demoDB.reports.forEach((r, i) => {
    const x = rnd();
    r.channel = x < 0.62 ? 'app' : x < 0.74 ? 'voice' : x < 0.82 ? 'anonymous' : x < 0.9 ? 'phone' : x < 0.95 ? 'sms' : 'operator';
    r.legal_refs = r.channel === 'app' || r.channel === 'voice' || r.channel === 'anonymous' ? legal[r.category] : [];
    if (r.channel === 'voice') r.audio_path = 'demo/voice.webm';
    if (r.channel === 'anonymous') { r.is_anonymous_report = true; r.user_id = null; r.contact_cipher = rnd() < 0.4 ? 'DEMO' : null; }
    if (r.channel === 'phone' || r.channel === 'sms' || r.channel === 'operator') { r.user_id = null; r.caller_phone = '+99890' + String(Math.floor(1e6 + rnd() * 8e6)); r.legal_refs = []; }
    if ((r.channel === 'app' || r.channel === 'voice') && rnd() < 0.8) {
      const ok = rnd() < 0.86; r.ai_category = ok ? r.category : pick(CATEGORIES.map(c => c.k)); r.ai_confidence = Math.round((0.62 + rnd() * 0.36) * 100) / 100;
      r.ai_summary = 'Rasmda ' + r.category.toLowerCase() + ' bilan bog‘liq muammo ko‘rinmoqda.';
    }
    if (['karakalpakstan', 'khorezm', 'surkhandarya', 'fergana', 'andijan', 'namangan'].includes(r.region) && (r.category === 'Suv' || r.category === 'Havo') && rnd() < 0.5) {
      r.transboundary = true;
      r.countries = { karakalpakstan: ['KZ', 'TM'], khorezm: ['TM'], surkhandarya: ['TJ', 'AF'], fergana: ['KG', 'TJ'], andijan: ['KG'], namangan: ['KG'] }[r.region];
    } else { r.transboundary = false; r.countries = []; }
    r.rejected = rnd() < 0.04; r.reject_reason = r.rejected ? 'Foto boshqa joyga tegishli' : null;
  });
  const dump = [[41.206, 69.354, 'tashkent_city'], [41.382, 69.139, 'tashkent'], [39.705, 66.894, 'samarkand'], [40.43, 71.71, 'fergana'], [40.084, 65.42, 'navoi'],
    [42.49, 59.56, 'karakalpakstan'], [41.56, 60.69, 'khorezm'], [38.83, 65.84, 'kashkadarya'], [40.77, 72.39, 'andijan'], [39.73, 64.46, 'bukhara'], [41.02, 71.61, 'namangan'], [37.28, 67.33, 'surkhandarya']];
  demoDB.detections = dump.map(([lat, lng, region], i) => ({
    id: demoDB.uuid(), source: i % 4 === 3 ? 'hotspot' : 'sentinel-2', model: i % 4 === 3 ? null : 'unet-dumpsite-v1', lat: lat + (rnd() - 0.5) * 0.02, lng: lng + (rnd() - 0.5) * 0.02,
    radius_m: Math.round(40 + rnd() * 160), area_m2: Math.round(1500 + rnd() * 22000), confidence: Math.round((0.7 + rnd() * 0.29) * 100) / 100, region, category: 'Chiqindi',
    image_url: null, captured_at: new Date(now - rnd() * 40 * 864e5).toISOString().slice(0, 10), status: i < 7 ? 'new' : i < 9 ? 'confirmed' : i < 11 ? 'converted' : 'dismissed',
    report_id: null, notes: i % 4 === 3 ? '4 ta murojaat 1 km radiusda (60 kun)' : null, created_at: new Date(now - rnd() * 20 * 864e5).toISOString()
  }));
  const y = new Date().getFullYear();
  demoDB.funds = [['tashkent_city', 'compensation', 18.4e9], ['tashkent_city', 'fine', 2.35e9], ['samarkand', 'compensation', 4.1e9], ['fergana', 'compensation', 3.6e9],
    ['navoi', 'compensation', 9.8e9], ['karakalpakstan', 'grant', 5.2e9], ['bukhara', 'fine', 0.8e9]]
    .map(([region, source, amount], i) => ({ id: demoDB.uuid(), region, year: y, quarter: 1 + (i % 3), source, amount, note: null, doc_url: null, created_at: new Date().toISOString() }));
  demoDB.projects = [
    ['tashkent_city', 'Chilonzor tumanida 3 000 tup daraxt ekish', 'Daraxt', 2.4e9, 1.65e9, 'in_progress', 214],
    ['tashkent_city', 'Havo sifati monitoring stansiyalari (12 ta)', 'Havo', 3.1e9, 3.1e9, 'done', 388],
    ['navoi', 'Sanoat zonasi atrofida yashil himoya belbog‘i', 'Daraxt', 4.2e9, 0.9e9, 'approved', 97],
    ['karakalpakstan', 'Orolbo‘yida saksovul ekish', 'Tuproq', 5e9, 2.75e9, 'in_progress', 512],
    ['samarkand', 'Noqonuniy chiqindixonalarni tugatish va rekultivatsiya', 'Chiqindi', 1.8e9, 0.4e9, 'in_progress', 143]
  ].map(([region, title, category, budget, spent, status, vote_count]) => ({ id: demoDB.uuid(), region, title, category, budget, spent, status, vote_count, description: '', created_at: new Date().toISOString() }));
  demoDB.suggestions = [['tashkent_city', 'Sergeli tumanidagi ariq bo‘yida ko‘kalamzorlashtirish va chiqindi konteynerlari o‘rnatish kerak.'],
    ['samarkand', 'Kattaqo‘rg‘on suv omboridagi qirg‘oqni tozalash aksiyasiga mablag‘ ajratilsin.'],
    ['fergana', 'Maktablar yonida havo sifati datchiklari o‘rnatish taklif qilinadi.']]
    .map(([region, text], i) => ({ id: demoDB.uuid(), region, text, status: i ? 'new' : 'accepted', profiles: { full_name: pick(demoDB.users.filter(u => u.full_name)).full_name }, created_at: new Date(now - i * 864e5 * 2).toISOString() }));
})();

Object.assign(demoApi, {
  async detections() { return demoDB.detections.slice(); },
  async saveDetection(id, patch) { const d = demoDB.detections.find(x => x.id === id); Object.assign(d, patch); return { ...d }; },
  async insertDetections(rows) { const out = rows.map(r => ({ id: demoDB.uuid(), status: 'new', created_at: new Date().toISOString(), category: 'Chiqindi', ...r })); demoDB.detections.unshift(...out); return out; },
  async createReport(row) {
    const r = { id: demoDB.uuid(), case_no: 'ECO-' + String(demoDB.reports.length + 1001).padStart(6, '0'), status: 0, priority: 0, cancelled: false, rejected: false,
      transboundary: false, countries: [], legal_refs: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row };
    if (r.status >= 3) r.resolved_at = r.created_at;
    demoDB.reports.unshift(r);
    demoDB.history.push({ id: demoDB.history.length + 1, report_id: r.id, event: 'created', status: r.status, created_at: r.created_at, actor: demoDB.me.id });
    return this._withUser(r);
  },
  async funds() { return demoDB.funds.slice(); },
  async saveFund(f) { if (f.id) { Object.assign(demoDB.funds.find(x => x.id === f.id), f); return f; } const n = { ...f, id: demoDB.uuid() }; demoDB.funds.push(n); return n; },
  async deleteFund(id) { demoDB.funds = demoDB.funds.filter(x => x.id !== id); },
  async projects() { return demoDB.projects.slice(); },
  async saveProject(p) { if (p.id) { const x = demoDB.projects.find(z => z.id === p.id); Object.assign(x, p); return x; } const n = { vote_count: 0, ...p, id: demoDB.uuid() }; demoDB.projects.unshift(n); return n; },
  async deleteProject(id) { demoDB.projects = demoDB.projects.filter(x => x.id !== id); },
  async suggestions() { return demoDB.suggestions.slice(); },
  async updateSuggestion(id, status) { demoDB.suggestions.find(x => x.id === id).status = status; },
  async signals(reportId) { return (demoDB.signals || []).filter(s => s.report_id === reportId); },
  async addSignal(sig) {
    (demoDB.signals = demoDB.signals || []).push({ ...sig, id: demoDB.uuid(), created_at: new Date().toISOString() });
    demoDB.history.push({ id: demoDB.history.length + 1, report_id: sig.report_id, event: 'signal', note: sig.country, created_at: new Date().toISOString(), actor: demoDB.me.id });
  },
  async logUnlock(reportId, reason) { demoDB.history.push({ id: demoDB.history.length + 1, report_id: reportId, event: 'unlock', note: reason, created_at: new Date().toISOString(), actor: demoDB.me.id }); }
});

async function v2Load() {
  const safe = p => p.catch(e => { console.warn(e); return []; });
  const [detections, funds, projects, suggestions] = await Promise.all([safe(api.detections()), safe(api.funds()), safe(api.projects()), safe(api.suggestions())]);
  Object.assign(state, { detections, funds, projects, suggestions });
  v2Badges();
}
function v2Badges() {
  const n = state.detections.filter(d => d.status === 'new').length, b = $('#badgeSat'); b.hidden = !n; b.textContent = n;
  const s = state.suggestions.filter(x => x.status === 'new').length, b2 = $('#badgeSug'); b2.hidden = !s; b2.textContent = s;
}
function onDetectionChange(p) {
  if (p.eventType === 'DELETE') state.detections = state.detections.filter(d => d.id !== p.old.id);
  else {
    const i = state.detections.findIndex(d => d.id === p.new.id);
    if (i >= 0) state.detections[i] = p.new; else { state.detections.unshift(p.new); toast(`🛰️ Yangi aniqlash: ${regionName(p.new.region)} · ${Math.round((p.new.confidence || 0) * 100)}%`, 'ok'); }
  }
  v2Badges(); if (['sat', 'map', 'dashboard'].includes(state.page)) renderSoon();
}

// =====================================================================
// UMUMIY HOLAT: qo'shimcha ko'rsatkichlar
// =====================================================================
function v2Alerts() {
  const newDet = state.detections.filter(d => d.status === 'new').length;
  const mism = state.reports.filter(r => !r.cancelled && r.status === 0 && aiMismatch(r)).length;
  const sug = state.suggestions.filter(s => s.status === 'new').length;
  return (newDet ? `<div class="alert" onclick="location.hash='#sat'">🛰️ <b>${newDet}</b> ta yangi sun’iy yo‘ldosh aniqlashi ko‘rib chiqilmagan</div>` : '') +
    (mism ? `<div class="alert" onclick="goReports({status:'0', flag:'ai_mismatch'})">🤖 <b>${mism}</b> ta yangi arizada AI turi fuqaro tanlovidan farq qiladi</div>` : '') +
    (sug ? `<div class="alert" onclick="location.hash='#ledger'">💡 <b>${sug}</b> ta yangi loyiha taklifi</div>` : '');
}
function v2DashboardRow() {
  const A = state.reports.filter(r => !r.cancelled);
  const c = f => A.filter(f).length;
  const tile = (icon, label, v, click) => `<div class="card kpi clickable mini-kpi" onclick="${click}"><div class="k-label">${icon} ${label}</div><div class="k-val">${nf(v)}</div></div>`;
  return `<div class="grid g-kpi mt">
    ${tile('🕶️', 'Maxfiy murojaatlar', c(r => r.is_anonymous_report), "goReports({channel:'anonymous'})")}
    ${tile('🎙️', 'Ovozli / qo‘ng‘iroq / SMS', c(r => ['voice', 'phone', 'sms'].includes(r.channel)), "goReports({flag:'audio'})")}
    ${tile('🛰️', 'Sun’iy yo‘ldosh aniqlashlari', state.detections.filter(d => d.status !== 'dismissed').length, "location.hash='#sat'")}
    ${tile('🌐', 'Transchegaraviy', c(r => r.transboundary), "goReports({flag:'tb'})")}
    ${tile('⚠️', 'Asossiz deb topilgan', c(r => r.rejected), "goReports({flag:'rejected'})")}
  </div>`;
}

// =====================================================================
// ARIZA PANELI: kanal, AI, huquqiy asos, maxfiy aloqa, belgilar
// =====================================================================
function v2Drawer(r) {
  const box = $('#dV2'); if (!box) return;
  const ch = CHANNELS[r.channel] || CHANNELS.app, editable = !r.cancelled;
  const aiP = Math.round((r.ai_confidence || 0) * 100);
  box.innerHTML = `
    <div class="card"><div class="card-h"><h3>${ch.i} ${esc(ch.t)}</h3>${r.detection_id ? '<span class="chip">🛰️ Aniqlashdan yaratilgan</span>' : ''}</div><div class="card-b">
      ${r.is_anonymous_report ? `<div class="v2-note">🕶️ <b>Maxfiy murojaat.</b> Shaxs ma’lumotlari saqlanmagan, fuqaro holatni maxsus kod orqali kuzatadi. Foto metama’lumotlari yuborishdan oldin o‘chirilgan.
        ${r.contact_cipher ? `<div class="mt"><button class="btn btn-sm" id="dUnlock">🔐 Shifrlangan aloqani ochish (yuridik protokol)</button></div>` : '<div class="muted small mt">Fuqaro aloqa ma’lumoti qoldirmagan.</div>'}</div>` : ''}
      ${r.caller_phone ? `<dl class="meta"><dt>Murojaatchi</dt><dd><a href="tel:${esc(r.caller_phone)}">${esc(r.caller_phone)}</a></dd></dl>` : ''}
      ${r.audio_path ? `<div class="field mt"><span>🎙️ Ovozli xabar</span><div id="dAudio" class="muted small">Yuklanmoqda…</div></div>` : ''}
      ${!r.is_anonymous_report && !r.caller_phone && !r.audio_path ? '<div class="muted small">Ariza mobil ilova orqali yuborilgan.</div>' : ''}
    </div></div>

    ${r.ai_category ? `<div class="card"><div class="card-h"><h3>🤖 AI tahlili</h3>${aiMismatch(r) ? '<span class="pill" style="--c:var(--warn)">Fuqaro tanlovidan farq qiladi</span>' : '<span class="pill" style="--c:var(--s3)">Mos</span>'}</div><div class="card-b">
      <div class="ai-line"><b>${catChip(r.ai_category)}</b><span>${aiP}% ishonch</span></div>
      <div class="bar-track" style="margin:8px 0"><span class="bar-fill" style="width:${aiP}%"></span></div>
      ${r.ai_summary ? `<p class="small" style="margin:0">${esc(r.ai_summary)}</p>` : ''}
      ${aiMismatch(r) && editable ? `<button class="btn btn-sm mt" id="dAiApply">Turini AI tavsiyasiga o‘zgartirish (${esc(r.ai_category)})</button>` : ''}
      <p class="muted small mt">AI faqat yordamchi baho beradi; yakuniy qaror xodimniki.</p>
    </div></div>` : ''}

    ${(r.legal_refs || []).length ? `<div class="card"><div class="card-h"><h3>⚖️ Huquqiy asos</h3></div><div class="card-b">
      <ul class="legal-list">${r.legal_refs.map(x => `<li>${esc(legalLabel(x))}</li>`).join('')}</ul>
      <p class="muted small">Fuqaro ilovada kategoriya tanlaganda avtomatik biriktirilgan.</p></div></div>` : ''}

    <div class="card"><div class="card-h"><h3>🏷 Belgilar</h3></div><div class="card-b">
      <div class="set-item" style="padding-top:0"><div><b>⚠️ Asossiz / soxta murojaat</b><p>Reytingda hisoblanmaydi, fuqaroga “asossiz deb topildi” deb ko‘rsatiladi</p></div>
        <label class="switch"><input type="checkbox" id="dRej" ${r.rejected ? 'checked' : ''} ${editable ? '' : 'disabled'}><i></i></label></div>
      <label class="field" id="dRejReasonWrap" ${r.rejected ? '' : 'hidden'}><span>Sababi</span><input id="dRejReason" value="${esc(r.reject_reason || '')}" placeholder="Masalan: foto boshqa joyga tegishli" ${editable ? '' : 'disabled'}></label>
      <div class="set-item"><div><b>🌐 Transchegaraviy hodisa</b><p>Umumiy daryo, chang-tuz bo‘roni, chegaraoldi ifloslanish</p></div>
        <label class="switch"><input type="checkbox" id="dTb" ${r.transboundary ? 'checked' : ''} ${editable ? '' : 'disabled'}><i></i></label></div>
      <div class="checks" id="dTbCountries" ${r.transboundary ? '' : 'hidden'}>${Object.entries(COUNTRIES).filter(([k]) => k !== 'UZ').map(([k, v]) => `<label><input type="checkbox" value="${k}" ${(r.countries || []).includes(k) ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${v}</label>`).join('')}</div>
      <div class="row mt" style="align-items:center">
        ${r.transboundary ? '<button class="btn btn-sm" id="dSignal">📤 Qo‘shni davlatga signal</button>' : '<span></span>'}
        <div style="flex:0 0 auto"><button class="btn btn-sm btn-primary" id="dFlagsSave" ${editable ? '' : 'disabled'}>Belgilarni saqlash</button></div>
      </div>
    </div></div>`;

  if (r.audio_path) {
    api.mediaUrl(r.audio_path).then(url => { const el = $('#dAudio'); if (el) el.innerHTML = url ? `<audio controls src="${esc(url)}" style="width:100%"></audio>` : '🧪 Demo: ovozli yozuv Supabase Storage ulanganda eshitiladi'; })
      .catch(() => { const el = $('#dAudio'); if (el) el.textContent = 'Faylni yuklab bo‘lmadi'; });
  }
  const rej = $('#dRej'), tb = $('#dTb');
  if (rej) rej.onchange = () => { $('#dRejReasonWrap').hidden = !rej.checked; };
  if (tb) tb.onchange = () => { $('#dTbCountries').hidden = !tb.checked; };
  const ai = $('#dAiApply');
  if (ai) ai.onclick = async () => { try { mergeReports(await api.updateReports([r.id], { category: r.ai_category })); toast('Turi o‘zgartirildi', 'ok'); refreshDrawer(); render(); } catch (e) { toast(e.message, 'err'); } };
  const fs = $('#dFlagsSave');
  if (fs) fs.onclick = async () => {
    const patch = {};
    if (rej.checked !== !!r.rejected) patch.rejected = rej.checked;
    const reason = rej.checked ? ($('#dRejReason').value.trim() || null) : null;
    if (reason !== (r.reject_reason || null)) patch.reject_reason = reason;
    const countries = tb.checked ? $$('#dTbCountries input:checked').map(i => i.value) : [];
    if (tb.checked !== !!r.transboundary) patch.transboundary = tb.checked;
    if (countries.join() !== (r.countries || []).join()) patch.countries = countries;
    if (!Object.keys(patch).length) return toast('O‘zgarish yo‘q');
    try { mergeReports(await api.updateReports([r.id], patch)); toast('Saqlandi', 'ok'); refreshDrawer(); render(); } catch (e) { toast(e.message, 'err'); }
  };
  const sg = $('#dSignal'); if (sg) sg.onclick = () => signalModal(r);
  const ul = $('#dUnlock'); if (ul) ul.onclick = () => unlockModal(r);
}

// ---------- Maxfiy aloqani yuridik ochish ----------
function unlockModal(r) {
  openModal('🔐 Shifrlangan aloqani ochish', `
    <div class="v2-note">Bu amal faqat <b>qonuniy tekshiruv zarur bo‘lganda</b> bajariladi va faoliyat jurnaliga (kim, qachon, sababi) yoziladi.
      Yopiq kalit brauzerdan tashqariga chiqmaydi va saqlanmaydi.</div>
    <label class="field mt"><span>Asos (tekshiruv raqami, qaror, so‘rov) *</span><textarea id="ulReason" placeholder="Masalan: Prokuratura so‘rovi №… , sana …"></textarea></label>
    <label class="field"><span>Yopiq kalit fayli (whistle-private-key.json) *</span><input type="file" id="ulKey" accept=".json,application/json"></label>
    <div class="form-error" id="ulErr"></div><div id="ulOut"></div>`,
  [{ label: 'Ochish', cls: 'btn-primary', fn: async () => {
    const reason = $('#ulReason').value.trim(), file = $('#ulKey').files[0], err = $('#ulErr');
    err.textContent = '';
    if (reason.length < 10) { err.textContent = 'Asosni batafsil yozing'; return false; }
    if (!file) { err.textContent = 'Yopiq kalit faylini tanlang'; return false; }
    if (r.contact_cipher === 'DEMO') { await api.logUnlock(r.id, reason); $('#ulOut').innerHTML = '<div class="v2-note">🧪 Demo: <b>+998 90 000 00 00</b></div>'; return false; }
    try {
      const jwk = JSON.parse(await file.text());
      const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
      const bytes = Uint8Array.from(atob(r.contact_cipher), c => c.charCodeAt(0));
      const plain = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, bytes));
      await api.logUnlock(r.id, reason);
      $('#ulOut').innerHTML = `<div class="v2-note">Aloqa: <b>${esc(plain)}</b></div>`;
    } catch (e) { err.textContent = 'Ochib bo‘lmadi: kalit mos emas yoki fayl buzilgan.'; }
    return false;
  } }]);
}

// ---------- Transchegaraviy signal ----------
async function signalModal(r) {
  const countries = (r.countries || []).length ? r.countries : ['KZ'];
  const loc = r.lat != null ? `${Number(r.lat).toFixed(5)}, ${Number(r.lng).toFixed(5)} (https://www.google.com/maps?q=${r.lat},${r.lng})` : (r.location_text || '—');
  const tmpl = (lang) => lang === 'en'
    ? `Notification of a transboundary environmental incident\n\nReference: ${r.case_no}\nReported: ${fmtDT(r.created_at)}\nCategory: ${r.category}\nRegion (Uzbekistan): ${regionName(r.region)}\nLocation: ${loc}\n\nDescription:\n${r.description}\n\nCurrent status: ${STATUSES[r.status].t}\nSender: bbecoplatform.uz — environmental reporting platform (Republic of Uzbekistan).\nWe kindly ask you to review the information and inform us of any measures taken.`
    : `Уведомление о трансграничном экологическом инциденте\n\nНомер обращения: ${r.case_no}\nДата: ${fmtDT(r.created_at)}\nКатегория: ${r.category}\nРегион (Узбекистан): ${regionName(r.region)}\nМестоположение: ${loc}\n\nОписание:\n${r.description}\n\nТекущий статус: ${STATUSES[r.status].t}\nОтправитель: платформа экологических обращений bbecoplatform.uz (Республика Узбекистан).\nПросим рассмотреть информацию и сообщить о принятых мерах.`;
  const prev = await api.signals(r.id).catch(() => []);
  const partnerOpts = c => state.orgs.filter(o => o.country === c).map(o => `<option value="${o.id}">${esc(o.short_name || o.name)}${o.email ? ' — ' + esc(o.email) : ''}</option>`).join('');
  openModal('📤 Qo‘shni davlatga signal', `
    <div class="row"><label class="field"><span>Davlat</span><select id="sgCountry">${countries.map(c => `<option value="${c}">${COUNTRIES[c] || c}</option>`).join('')}</select></label>
      <label class="field"><span>Til</span><select id="sgLang"><option value="ru">Русский</option><option value="en">English</option></select></label></div>
    <label class="field"><span>Hamkor tashkilot (Tashkilotlar bo‘limida “Davlat” maydoni bilan qo‘shiladi)</span><select id="sgOrg"></select></label>
    <label class="field"><span>Xabar matni</span><textarea id="sgText" style="min-height:220px"></textarea></label>
    ${prev.length ? `<div class="muted small">Avval yuborilgan: ${prev.map(p => `${esc(COUNTRIES[p.country] || p.country)} · ${fmtDT(p.created_at)}`).join('; ')}</div>` : ''}`,
  [{ label: '📋 Nusxalash', cls: '', fn: () => { navigator.clipboard.writeText($('#sgText').value).then(() => toast('Nusxalandi', 'ok')); return false; } },
   { label: '✉️ Email ochish', cls: '', fn: () => {
      const o = state.orgs.find(x => x.id === $('#sgOrg').value);
      location.href = `mailto:${encodeURIComponent(o && o.email || '')}?subject=${encodeURIComponent('Transboundary environmental incident ' + r.case_no)}&body=${encodeURIComponent($('#sgText').value)}`;
      return false; } },
   { label: 'Yuborildi deb belgilash', cls: 'btn-primary', fn: async () => {
      await api.addSignal({ report_id: r.id, country: $('#sgCountry').value, org_id: $('#sgOrg').value || null, message: $('#sgText').value });
      toast('Signal jurnalga yozildi', 'ok'); refreshDrawer(); } }]);
  const upd = () => {
    const c = $('#sgCountry').value, opts = partnerOpts(c);
    $('#sgOrg').innerHTML = `<option value="">— tanlanmagan —</option>${opts}`;
    $('#sgText').value = tmpl($('#sgLang').value).replace('Уведомление', `${COUNTRY_RU[c] ? COUNTRY_RU[c] + '\n' : ''}Уведомление`);
  };
  $('#sgCountry').onchange = upd; $('#sgLang').onchange = upd; upd();
}

// ---------- Operator qabuli (telefon / SMS / shaxsan) ----------
function operatorModal() {
  openModal('📞 Murojaatni qabul qilish', `
    <p class="muted small" style="margin-top:0">Internetdan foydalana olmaydigan fuqarolar (qishloq, keksa aholi) qo‘ng‘iroq, SMS yoki shaxsan kelganda operator shu forma orqali kiritadi.
      SMS/IVR shlyuzi ulansa, <code>inbound-report</code> funksiyasi arizani avtomatik yaratadi.</p>
    <div class="row"><label class="field"><span>Kanal</span><select id="opCh"><option value="phone">📞 Telefon</option><option value="sms">✉️ SMS / USSD</option><option value="operator">👤 Shaxsan</option></select></label>
      <label class="field"><span>Murojaatchi telefoni</span><input id="opPhone" placeholder="+998 90 123 45 67"></label></div>
    <label class="field"><span>Muammo tavsifi *</span><textarea id="opDesc" placeholder="Fuqaro aytgan gaplarni yozing"></textarea></label>
    <div class="row"><label class="field"><span>Turi *</span><select id="opCat">${CATEGORIES.map(c => `<option value="${c.k}">${c.icon} ${c.k}</option>`).join('')}</select></label>
      <label class="field"><span>Viloyat *</span><select id="opRegion">${regionOptions('', '— tanlang —')}</select></label></div>
    <label class="field"><span>Manzil / mo‘ljal</span><input id="opAddr" placeholder="Tuman, mahalla, mo‘ljal"></label>
    <div class="row"><label class="field"><span>Kenglik (ixtiyoriy)</span><input id="opLat" type="number" step="any"></label><label class="field"><span>Uzunlik</span><input id="opLng" type="number" step="any"></label>
      <label class="field"><span>Muhimlik</span><select id="opPrio">${PRIORITIES.map((p, i) => `<option value="${i}">${p}</option>`).join('')}</select></label></div>
    <div class="form-error" id="opErr"></div>`,
  [{ label: 'Arizani yaratish', cls: 'btn-primary', fn: async () => {
    const desc = $('#opDesc').value.trim(), region = $('#opRegion').value;
    if (desc.length < 5) { $('#opErr').textContent = 'Tavsifni yozing'; return false; }
    if (!region) { $('#opErr').textContent = 'Viloyatni tanlang'; return false; }
    const lat = parseFloat($('#opLat').value), lng = parseFloat($('#opLng').value), geo = Number.isFinite(lat) && Number.isFinite(lng);
    const r = await api.createReport({ user_id: null, channel: $('#opCh').value, caller_phone: $('#opPhone').value.trim() || null, description: desc,
      category: $('#opCat').value, region, address: $('#opAddr').value.trim() || null, lat: geo ? lat : null, lng: geo ? lng : null,
      location_text: geo ? null : 'Operator orqali qabul qilingan', priority: Number($('#opPrio').value) });
    state.reports.unshift(r); toast(`Ariza yaratildi: ${r.case_no}`, 'ok'); render(); setTimeout(() => openReport(r.id), 50);
  } }]);
}

// =====================================================================
// 🛰️ SUN'IY YO'LDOSH
// =====================================================================
function renderSat(el) {
  const f = state.sf2;
  const list = state.detections.filter(d => (!f.status || d.status === f.status) && (!f.source || d.source === f.source)).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const cnt = s => state.detections.filter(d => d.status === s).length;
  if (!el.dataset.built) {
    el.innerHTML = `
      <div class="toolbar">
        <div class="tabs" id="satTabs"></div>
        <select id="satSrc"><option value="">Barcha manbalar</option><option value="sentinel-2">Sentinel-2 + ML</option><option value="planet">Planet</option><option value="pleiades">Pléiades</option><option value="hotspot">Murojaatlar klasteri</option><option value="manual">Qo‘lda</option></select>
        <span class="grow"></span>
        <button class="btn" id="satHot" title="Bir hududda ko‘p murojaat to‘plangan joylarni nomzod sifatida belgilash">🔥 Klaster tahlili</button>
        <label class="btn" title="GeoJSON (Point) yoki CSV: lat,lng,confidence,area_m2,captured_at,image_url">⬆ Import<input type="file" id="satFile" accept=".geojson,.json,.csv" hidden></label>
      </div>
      <div class="sat-grid"><div class="map-wrap"><div id="satMap"></div></div><div class="card sat-list" id="satList"></div></div>
      <p class="muted small mt">Aniqlashlar ML pipeline’dan <code>ingest-detections</code> funksiyasi orqali avtomatik keladi (yo‘riqnoma: <code>docs/SATELLITE.md</code>).
        Sentinel-2 mozaikasi (EOX s2cloudless) CC BY-NC-SA 4.0 litsenziyasida — tijoriy bo‘lmagan foydalanish uchun.</p>`;
    el.dataset.built = '1';
    $('#satSrc').onchange = e => { f.source = e.target.value; renderSat(el); };
    $('#satHot').onclick = hotspotAnalysis;
    $('#satFile').onchange = importDetections;
  }
  $('#satTabs').innerHTML = [['new', 'Yangi'], ['confirmed', 'Tasdiqlangan'], ['converted', 'Arizaga aylangan'], ['dismissed', 'Rad etilgan'], ['', 'Barchasi']]
    .map(([k, t]) => `<button data-s="${k}" class="${f.status === k ? 'on' : ''}">${t}<em>${k ? cnt(k) : state.detections.length}</em></button>`).join('');
  $$('#satTabs button').forEach(b => b.onclick = () => { f.status = b.dataset.s; renderSat(el); });
  $('#satList').innerHTML = list.length ? list.map(d => {
    const st = DET_STATUS[d.status] || DET_STATUS.new, p = Math.round((d.confidence || 0) * 100);
    return `<div class="det-item" data-det="${d.id}">
      <div class="det-h"><b>${esc(regionName(d.region))}</b><span class="pill" style="--c:${st[1]}">${st[0]}</span></div>
      <div class="det-meta"><span class="det-conf" style="--p:${p}%">${p}%</span> ${d.source === 'hotspot' ? '🔥 Klaster' : '🛰️ ' + esc(d.source)}${d.model ? ' · ' + esc(d.model) : ''}${d.area_m2 ? ' · ~' + nf(d.area_m2) + ' m²' : ''}${d.captured_at ? ' · ' + esc(d.captured_at) : ''}</div>
      ${d.notes ? `<div class="muted small">${esc(d.notes)}</div>` : ''}
      ${d.image_url ? `<img class="det-img" src="${esc(d.image_url)}" alt="" loading="lazy">` : ''}
      <div class="det-actions"><button class="btn btn-sm" data-act="fly">📍 Ko‘rish</button>
        ${d.status === 'new' || d.status === 'confirmed' ? `<button class="btn btn-sm btn-primary" data-act="convert">✅ Arizaga aylantirish</button><button class="btn btn-sm btn-ghost" data-act="dismiss">✖ Rad etish</button>` : ''}
        ${d.report_id ? `<button class="btn btn-sm" data-act="report">📥 Ariza</button>` : ''}</div>
    </div>`;
  }).join('') : '<div class="empty">Bu filtrda aniqlashlar yo‘q</div>';
  $$('#satList [data-act]').forEach(b => b.onclick = () => detAction(b.closest('[data-det]').dataset.det, b.dataset.act));

  if (!window.L) return;
  if (!state.maps.sat) {
    const m = L.map('satMap', { preferCanvas: true }).setView([41.3, 64.5], 6);
    addBaseLayers(m, 'sat');
    state.maps.sat = m; state.maps.satLayer = L.layerGroup().addTo(m);
  }
  setTimeout(() => state.maps.sat.invalidateSize(), 60);
  drawDetections(state.maps.satLayer, true, list);
}
function drawDetections(layer, show, list) {
  if (!layer) return 0;
  layer.clearLayers();
  if (!show) return 0;
  const items = (list || state.detections).filter(d => d.status !== 'dismissed' || list);
  items.forEach(d => {
    const p = Math.round((d.confidence || 0) * 100), color = d.status === 'converted' ? '#16A34A' : d.status === 'dismissed' ? '#9CA3AF' : '#E11D48';
    L.circle([d.lat, d.lng], { radius: Math.max(60, d.radius_m || 80), color, weight: 2, fillColor: color, fillOpacity: .18 }).addTo(layer);
    L.circleMarker([d.lat, d.lng], { radius: 6, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(layer)
      .bindPopup(`<b>🛰️ ${esc(regionName(d.region))}</b><br>Ishonch: <b>${p}%</b>${d.area_m2 ? ' · ~' + nf(d.area_m2) + ' m²' : ''}<br>${esc((DET_STATUS[d.status] || [])[0] || '')}${d.captured_at ? ' · ' + esc(d.captured_at) : ''}
        <br><a href="#" onclick="location.hash='#sat'; setTimeout(()=>detAction('${d.id}','fly'),300); return false;">Ko‘rib chiqish →</a>`);
  });
  return items.length;
}
window.detAction = detAction;
async function detAction(id, act) {
  const d = state.detections.find(x => x.id === id); if (!d) return;
  const upd = async patch => { const n = await api.saveDetection(id, { ...patch, reviewed_by: state.me.id, reviewed_at: new Date().toISOString() }); Object.assign(d, n); v2Badges(); render(); };
  try {
    if (act === 'fly' && state.maps.sat) { state.maps.sat.flyTo([d.lat, d.lng], 17); $$('.det-item').forEach(x => x.classList.toggle('sel', x.dataset.det === id)); }
    if (act === 'report' && d.report_id) openReport(d.report_id);
    if (act === 'dismiss') { const why = prompt('Rad etish sababi (masalan: qurilish maydoni, rasmiy poligon):', ''); if (why === null) return; await upd({ status: 'dismissed', notes: why || d.notes }); toast('Rad etildi', 'ok'); }
    if (act === 'convert') {
      const p = Math.round((d.confidence || 0) * 100);
      const r = await api.createReport({ user_id: null, channel: 'satellite', detection_id: d.id, category: d.category || 'Chiqindi', region: d.region, lat: d.lat, lng: d.lng,
        description: `🛰️ Sun’iy yo‘ldosh tasviri tahlilida ehtimoliy noqonuniy chiqindixona aniqlandi (ishonch ${p}%${d.area_m2 ? ', maydon ~' + nf(d.area_m2) + ' m²' : ''}${d.captured_at ? ', tasvir sanasi ' + d.captured_at : ''}). Joyida tekshirish talab etiladi.`,
        status: 1, priority: p >= 90 ? 1 : 0, ai_category: d.category || 'Chiqindi', ai_confidence: d.confidence, ai_summary: 'ML modeli: ' + (d.model || d.source) });
      state.reports.unshift(r);
      await upd({ status: 'converted', report_id: r.id });
      toast(`Ariza yaratildi: ${r.case_no}`, 'ok'); openReport(r.id);
    }
  } catch (e) { toast(e.message, 'err'); }
}
async function hotspotAnalysis() {
  const since = Date.now() - 60 * 864e5;
  const pts = state.reports.filter(r => !r.cancelled && !r.rejected && r.lat != null && new Date(r.created_at) >= since);
  const used = new Set(), cands = [];
  pts.forEach(p => {
    if (used.has(p.id)) return;
    const near = pts.filter(q => !used.has(q.id) && distM(p, q) <= 1000);
    if (near.length >= 3) {
      near.forEach(q => used.add(q.id));
      const lat = near.reduce((s, q) => s + q.lat, 0) / near.length, lng = near.reduce((s, q) => s + q.lng, 0) / near.length;
      const top = Object.entries(near.reduce((m, q) => (m[q.category] = (m[q.category] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0][0];
      if (!state.detections.some(d => d.status !== 'dismissed' && distM(d, { lat, lng }) < 500))
        cands.push({ source: 'hotspot', lat, lng, radius_m: 500, confidence: Math.min(0.95, 0.5 + near.length * 0.08), region: near[0].region, category: top,
          notes: `${near.length} ta murojaat 1 km radiusda (so‘nggi 60 kun): ${near.map(q => q.case_no).slice(0, 6).join(', ')}` });
    }
  });
  if (!cands.length) return toast('Yangi klaster topilmadi (≥3 murojaat / 1 km / 60 kun)');
  try { const rows = await api.insertDetections(cands); state.detections.unshift(...rows); v2Badges(); render(); toast(`${rows.length} ta klaster nomzodi qo‘shildi`, 'ok'); }
  catch (e) { toast(e.message, 'err'); }
}
async function importDetections(e) {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  let rows = [];
  try {
    const text = await file.text();
    if (/\.csv$/i.test(file.name)) {
      const [head, ...lines] = text.trim().split(/\r?\n/); const cols = head.split(',').map(s => s.trim().toLowerCase());
      rows = lines.map(l => { const v = l.split(','); const o = {}; cols.forEach((c, i) => { o[c] = (v[i] || '').trim(); }); return o; });
    } else {
      const j = JSON.parse(text);
      rows = (j.features || []).filter(f => f.geometry && f.geometry.type === 'Point').map(f => ({ lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], ...(f.properties || {}) }));
    }
    const clean = rows.map(o => {
      const lat = Number(o.lat), lng = Number(o.lng); let c = o.confidence === undefined || o.confidence === '' ? null : Number(o.confidence); if (c != null && c > 1) c /= 100;
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, confidence: c, area_m2: o.area_m2 ? Number(o.area_m2) : null, radius_m: o.radius_m ? Number(o.radius_m) : null,
        captured_at: o.captured_at || null, image_url: o.image_url || null, source: o.source || 'sentinel-2', model: o.model || null, region: guessRegionAdmin(lat, lng), category: o.category || 'Chiqindi' } : null;
    }).filter(Boolean);
    if (!clean.length) return toast('Faylda koordinatali nuqtalar topilmadi', 'err');
    const out = await api.insertDetections(clean); state.detections.unshift(...out); v2Badges(); render(); toast(`${out.length} ta aniqlash import qilindi`, 'ok');
  } catch (err) { toast('Import xatosi: ' + err.message, 'err'); }
}
function guessRegionAdmin(lat, lng) {
  if (Math.hypot(lat - 41.3111, (lng - 69.2797) * 0.75) < 0.16) return 'tashkent_city';
  let best = null, bd = 1e9; REGIONS.forEach(r => { if (r.code === 'tashkent_city') return; const d = Math.hypot(lat - r.lat, (lng - r.lng) * 0.75); if (d < bd) { bd = d; best = r.code; } });
  return best;
}

// =====================================================================
// 💰 SHAFFOFLIK
// =====================================================================
function renderLedgerAdmin(el) {
  const ro = !isAdmin();
  const F = state.funds, Pj = state.projects.filter(p => p.status !== 'cancelled');
  const sum = (a, k) => a.reduce((s, x) => s + Number(x[k] || 0), 0);
  const regs = [...new Set(F.map(f => f.region || '').concat(Pj.map(p => p.region || '')))];
  const byReg = regs.map(code => { const f = F.filter(x => (x.region || '') === code), p = Pj.filter(x => (x.region || '') === code);
    return { code, collected: sum(f, 'amount'), allocated: sum(p, 'budget'), spent: sum(p, 'spent'), n: p.length }; }).sort((a, b) => b.collected - a.collected);
  const newSug = state.suggestions.filter(s => s.status === 'new').length;
  el.innerHTML = `
    ${ro ? '<div class="demo-banner" style="margin:0 0 16px">Ma’lumot kiritishni faqat <b>admin</b> bajaradi.</div>' : ''}
    <div class="grid g-kpi">
      <div class="card kpi"><div class="k-label">Yig‘ilgan mablag‘</div><div class="k-val" style="font-size:22px">${fmtMoney(sum(F, 'amount'))}</div><div class="k-sub">kompensatsiya, jarima, grant</div></div>
      <div class="card kpi"><div class="k-label">Loyihalarga ajratilgan</div><div class="k-val" style="font-size:22px">${fmtMoney(sum(Pj, 'budget'))}</div><div class="k-sub">${Pj.length} ta loyiha</div></div>
      <div class="card kpi"><div class="k-label">Sarflangan</div><div class="k-val" style="font-size:22px">${fmtMoney(sum(Pj, 'spent'))}</div><div class="k-sub">${sum(Pj, 'budget') ? Math.round(sum(Pj, 'spent') / sum(Pj, 'budget') * 100) : 0}% byudjetdan</div></div>
      <div class="card kpi"><div class="k-label">Fuqarolar ovozlari</div><div class="k-val">${nf(sum(state.projects, 'vote_count'))}</div><div class="k-sub">${newSug} ta yangi taklif</div></div>
    </div>
    <p class="muted small mt">Bu ma’lumotlar mobil ilovadagi “💰 Shaffoflik” bo‘limida hammaga ochiq ko‘rinadi. Qonuniy asos: Atmosfera havosini muhofaza qilish to‘g‘risidagi Qonun, 25-modda.</p>

    <div class="card mt"><div class="card-h"><h3>Hududlar kesimida</h3></div><div class="card-b" style="padding:8px 0 0"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Hudud</th><th class="num">Yig‘ilgan</th><th class="num">Ajratilgan</th><th class="num">Sarflangan</th><th>Yo‘naltirilgan ulush</th></tr></thead><tbody>
      ${byReg.map(x => { const p = x.collected ? Math.min(100, Math.round(x.allocated / x.collected * 100)) : 0;
        return `<tr><td>${esc(x.code ? regionName(x.code) : 'Respublika')}</td><td class="num">${fmtMoney(x.collected)}</td><td class="num">${fmtMoney(x.allocated)}</td><td class="num">${fmtMoney(x.spent)}</td>
        <td style="min-width:160px"><div class="bar-track"><span class="bar-fill" style="width:${p}%; background:${p < 30 ? 'var(--warn)' : 'var(--accent)'}"></span></div><span class="small muted">${p}%</span></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Ma’lumot yo‘q</td></tr>'}
      </tbody></table></div></div></div>

    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><h3>Tushumlar</h3>${ro ? '' : '<button class="btn btn-sm btn-primary" id="fundAdd">＋ Tushum</button>'}</div><div class="card-b" style="padding:8px 0 0"><div class="table-wrap"><table class="tbl">
        <thead><tr><th>Hudud</th><th>Davr</th><th>Manba</th><th class="num">Summa</th><th></th></tr></thead><tbody>
        ${F.map(f => `<tr><td>${esc(f.region ? regionName(f.region) : 'Respublika')}</td><td class="nowrap">${f.year}${f.quarter ? ' · ' + f.quarter + '-chorak' : ''}</td><td>${esc(FUND_SRC[f.source] || f.source)}${f.doc_url ? ` <a href="${esc(f.doc_url)}" target="_blank" rel="noopener">↗</a>` : ''}</td>
          <td class="num nowrap">${fmtMoney(f.amount)}</td><td>${ro ? '' : `<button class="btn btn-sm btn-ghost" data-fund="${f.id}">✎</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Tushumlar kiritilmagan</td></tr>'}
        </tbody></table></div></div></div>
      <div class="card"><div class="card-h"><h3>Fuqarolar takliflari</h3></div><div class="card-b">
        ${state.suggestions.length ? state.suggestions.map(s => `<div class="sug-item"><div class="small muted">${esc(s.region ? regionName(s.region) : 'Hudud ko‘rsatilmagan')} · ${fmtDate(s.created_at)} · ${esc((s.profiles && s.profiles.full_name) || 'Fuqaro')}</div>
          <div>${esc(s.text)}</div><div class="row" style="align-items:center; margin-top:6px"><span class="pill" style="flex:0 0 auto; --c:${s.status === 'new' ? 'var(--s0)' : s.status === 'accepted' ? 'var(--s3)' : 'var(--sx)'}">${s.status === 'new' ? 'Yangi' : s.status === 'accepted' ? 'Qabul qilingan' : 'Rad etilgan'}</span>
          ${s.status === 'new' ? `<span style="flex:0 0 auto"><button class="btn btn-sm" data-sug="${s.id}" data-st="accepted">✓ Qabul</button> <button class="btn btn-sm btn-ghost" data-sug="${s.id}" data-st="rejected">✕</button></span>` : ''}</div></div>`).join('') : '<div class="empty">Takliflar yo‘q</div>'}
      </div></div>
    </div>

    <div class="card mt"><div class="card-h"><h3>Loyihalar</h3>${ro ? '' : '<button class="btn btn-sm btn-primary" id="projAdd">＋ Loyiha</button>'}</div><div class="card-b" style="padding:8px 0 0"><div class="table-wrap"><table class="tbl">
      <thead><tr><th>Loyiha</th><th>Hudud</th><th>Holat</th><th class="num">Byudjet</th><th class="num">Sarflangan</th><th class="num">👍</th><th></th></tr></thead><tbody>
      ${state.projects.map(p => `<tr><td><b>${esc(p.title)}</b>${p.category ? ` <span class="chip">${catOf(p.category).icon} ${esc(p.category)}</span>` : ''}</td><td class="nowrap">${esc(p.region ? regionName(p.region) : 'Respublika')}</td>
        <td><span class="chip">${esc(PROJ_STATUS[p.status] || p.status)}</span></td><td class="num nowrap">${fmtMoney(p.budget)}</td><td class="num nowrap">${fmtMoney(p.spent)}</td><td class="num">${nf(p.vote_count)}</td>
        <td>${ro ? '' : `<button class="btn btn-sm" data-proj="${p.id}">Tahrirlash</button>`}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Loyihalar yo‘q</td></tr>'}
      </tbody></table></div></div></div>`;
  if (ro) return;
  $('#fundAdd').onclick = () => fundModal();
  $('#projAdd').onclick = () => projectModal();
  $$('[data-fund]', el).forEach(b => b.onclick = () => fundModal(state.funds.find(f => f.id === b.dataset.fund)));
  $$('[data-proj]', el).forEach(b => b.onclick = () => projectModal(state.projects.find(p => p.id === b.dataset.proj)));
  $$('[data-sug]', el).forEach(b => b.onclick = async () => {
    try { await api.updateSuggestion(b.dataset.sug, b.dataset.st); state.suggestions.find(s => s.id === b.dataset.sug).status = b.dataset.st; v2Badges(); render(); } catch (e) { toast(e.message, 'err'); }
  });
}
function fundModal(f = {}) {
  openModal(f.id ? 'Tushumni tahrirlash' : 'Yangi tushum', `
    <div class="row"><label class="field"><span>Hudud</span><select id="fdReg">${regionOptions(f.region || '', 'Respublika')}</select></label>
      <label class="field"><span>Manba</span><select id="fdSrc">${Object.entries(FUND_SRC).map(([k, v]) => `<option value="${k}" ${f.source === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row"><label class="field"><span>Yil *</span><input id="fdYear" type="number" value="${f.year || new Date().getFullYear()}"></label>
      <label class="field"><span>Chorak</span><select id="fdQ"><option value="">—</option>${[1, 2, 3, 4].map(q => `<option ${f.quarter === q ? 'selected' : ''}>${q}</option>`).join('')}</select></label>
      <label class="field"><span>Summa (so‘m) *</span><input id="fdAmt" type="number" min="0" value="${f.amount || ''}"></label></div>
    <label class="field"><span>Asos hujjat havolasi</span><input id="fdDoc" value="${esc(f.doc_url || '')}" placeholder="https://"></label>
    <label class="field"><span>Izoh</span><input id="fdNote" value="${esc(f.note || '')}"></label><div class="form-error" id="fdErr"></div>`,
  [f.id ? { label: 'O‘chirish', cls: 'btn-danger', fn: async () => { if (!confirm('O‘chirilsinmi?')) return false; await api.deleteFund(f.id); state.funds = state.funds.filter(x => x.id !== f.id); render(); } } : null,
   { label: 'Saqlash', cls: 'btn-primary', fn: async () => {
    const amount = Math.round(Number($('#fdAmt').value)), year = Number($('#fdYear').value);
    if (!(amount >= 0) || !year) { $('#fdErr').textContent = 'Yil va summani kiriting'; return false; }
    const data = { region: $('#fdReg').value || null, source: $('#fdSrc').value, year, quarter: $('#fdQ').value ? Number($('#fdQ').value) : null, amount, doc_url: $('#fdDoc').value.trim() || null, note: $('#fdNote').value.trim() || null };
    if (f.id) data.id = f.id;
    const saved = await api.saveFund(data); const i = state.funds.findIndex(x => x.id === saved.id); if (i >= 0) state.funds[i] = { ...state.funds[i], ...saved }; else state.funds.unshift(saved);
    toast('Saqlandi', 'ok'); render(); } }].filter(Boolean));
}
function projectModal(p = {}) {
  openModal(p.id ? 'Loyihani tahrirlash' : 'Yangi loyiha', `
    <label class="field"><span>Nomi *</span><input id="pjTitle" value="${esc(p.title || '')}"></label>
    <label class="field"><span>Tavsif</span><textarea id="pjDesc">${esc(p.description || '')}</textarea></label>
    <div class="row"><label class="field"><span>Hudud</span><select id="pjReg">${regionOptions(p.region || '', 'Respublika')}</select></label>
      <label class="field"><span>Yo‘nalish</span><select id="pjCat"><option value="">—</option>${CATEGORIES.map(c => `<option value="${c.k}" ${p.category === c.k ? 'selected' : ''}>${c.icon} ${c.k}</option>`).join('')}</select></label>
      <label class="field"><span>Holat</span><select id="pjSt">${Object.entries(PROJ_STATUS).map(([k, v]) => `<option value="${k}" ${(p.status || 'proposed') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    <div class="row"><label class="field"><span>Byudjet (so‘m)</span><input id="pjBud" type="number" min="0" value="${p.budget || 0}"></label>
      <label class="field"><span>Sarflangan (so‘m)</span><input id="pjSp" type="number" min="0" value="${p.spent || 0}"></label></div>
    <div class="row"><label class="field"><span>Boshlanish</span><input id="pjStart" type="date" value="${esc(p.start_date || '')}"></label>
      <label class="field"><span>Tugash</span><input id="pjEnd" type="date" value="${esc(p.end_date || '')}"></label>
      <label class="field"><span>Ijrochi tashkilot</span><select id="pjOrg"><option value="">—</option>${state.orgs.map(o => `<option value="${o.id}" ${p.org_id === o.id ? 'selected' : ''}>${esc(o.short_name || o.name)}</option>`).join('')}</select></label></div>
    <label class="field"><span>Hujjat havolasi (shartnoma, hisobot)</span><input id="pjDoc" value="${esc(p.doc_url || '')}" placeholder="https://"></label><div class="form-error" id="pjErr"></div>`,
  [p.id ? { label: 'O‘chirish', cls: 'btn-danger', fn: async () => { if (!confirm('Loyiha o‘chirilsinmi?')) return false; await api.deleteProject(p.id); state.projects = state.projects.filter(x => x.id !== p.id); render(); } } : null,
   { label: 'Saqlash', cls: 'btn-primary', fn: async () => {
    const title = $('#pjTitle').value.trim(); if (!title) { $('#pjErr').textContent = 'Nomini kiriting'; return false; }
    const data = { title, description: $('#pjDesc').value.trim() || null, region: $('#pjReg').value || null, category: $('#pjCat').value || null, status: $('#pjSt').value,
      budget: Math.round(Number($('#pjBud').value) || 0), spent: Math.round(Number($('#pjSp').value) || 0), start_date: $('#pjStart').value || null, end_date: $('#pjEnd').value || null,
      org_id: $('#pjOrg').value || null, doc_url: $('#pjDoc').value.trim() || null };
    if (p.id) data.id = p.id;
    const saved = await api.saveProject(data); const i = state.projects.findIndex(x => x.id === saved.id); if (i >= 0) state.projects[i] = { ...state.projects[i], ...saved }; else state.projects.unshift(saved);
    toast('Saqlandi', 'ok'); render(); } }].filter(Boolean));
}

// =====================================================================
// STATISTIKA: kanallar, AI aniqligi, transchegaraviy, reyting
// =====================================================================
function v2StatsHTML(R) {
  const withAi = R.filter(r => r.ai_category), agree = withAi.filter(r => r.ai_category === r.category).length;
  const avgConf = withAi.length ? withAi.reduce((s, r) => s + (r.ai_confidence || 0), 0) / withAi.length : 0;
  const tbc = {}; R.filter(r => r.transboundary).forEach(r => (r.countries.length ? r.countries : ['?']).forEach(c => { tbc[c] = (tbc[c] || 0) + 1; }));
  // Faol fuqarolar: faqat real natija (hal qilingan = 10, ishga olingan = 2)
  const pts = {}; R.filter(r => r.user_id && !r.rejected).forEach(r => { const u = pts[r.user_id] = pts[r.user_id] || { p: 0, done: 0 }; if (r.status >= 3) { u.p += 10; u.done++; } else if (r.status >= 1) u.p += 2; });
  const top = Object.entries(pts).filter(([, v]) => v.p > 0).sort((a, b) => b[1].p - a[1].p).slice(0, 10);
  const rejRate = state.reports.length ? Math.round(state.reports.filter(r => r.rejected).length / state.reports.length * 100) : 0;
  return `
    <div class="grid g-2 mt">
      <div class="card"><div class="card-h"><h3>Murojaat kanallari</h3><span class="muted small">internetsiz kanallar qamrovi</span></div><div class="card-b"><div class="chart-box"><canvas id="chChannel"></canvas></div></div></div>
      <div class="card"><div class="card-h"><h3>🤖 AI tahlili sifati</h3></div><div class="card-b">
        <div class="grid g-kpi" style="grid-template-columns:repeat(3,1fr)">
          <div><div class="k-label">AI tahlil qilgan</div><div class="k-val" style="font-size:24px">${nf(withAi.length)}</div></div>
          <div><div class="k-label">Yakuniy tur bilan mos</div><div class="k-val" style="font-size:24px">${withAi.length ? Math.round(agree / withAi.length * 100) : 0}%</div></div>
          <div><div class="k-label">O‘rtacha ishonch</div><div class="k-val" style="font-size:24px">${Math.round(avgConf * 100)}%</div></div></div>
        <p class="muted small">Moslik — AI taxmini va xodim tasdiqlagan yakuniy tur bir xil bo‘lgan arizalar ulushi. Asossiz deb topilganlar: ${rejRate}%.</p>
        <h4 class="mt" style="font-size:13px">🌐 Transchegaraviy hodisalar</h4>
        ${Object.keys(tbc).length ? barsHTML(Object.entries(tbc).map(([c, v]) => ({ label: COUNTRIES[c] || c, v, onclick: "goReports({flag:'tb'})" })), 'var(--s2)') : '<p class="muted small">Tanlangan davrda yo‘q</p>'}
      </div></div>
    </div>
    <div class="card mt"><div class="card-h"><h3>🏆 Faol fuqarolar (real natija bo‘yicha)</h3><span class="muted small">hal qilingan — 10 ball, ishga olingan — 2 ball; asossizlar hisoblanmaydi</span></div>
      <div class="card-b" style="padding:8px 0 0"><div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>Fuqaro</th><th class="num">Hal qilingan</th><th class="num">Ball</th><th>Ilovada reytingda</th></tr></thead><tbody>
      ${top.map(([id, v], i) => { const u = state.users.find(x => x.id === id) || {}; return `<tr><td>${i + 1}</td><td>${esc(u.full_name || '—')}</td><td class="num">${v.done}</td><td class="num"><b>${v.p}</b></td><td>${u.show_in_rating ? '✅ ko‘rinadi' : '<span class="muted">yashirin</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Ma’lumot yo‘q</td></tr>'}
      </tbody></table></div></div></div>`;
}
function v2StatsCharts(R) {
  const keys = Object.keys(CHANNELS), colors = ['#2563EB', '#7C3AED', '#111827', '#D97706', '#0F766E', '#DB2777', '#E11D48'];
  makeChart('channel', $('#chChannel'), {
    type: 'doughnut',
    data: { labels: keys.map(k => CHANNELS[k].i + ' ' + CHANNELS[k].t), datasets: [{ data: keys.map(k => R.filter(r => (r.channel || 'app') === k).length), backgroundColor: colors, borderColor: cssVar('--surface'), borderWidth: 2 }] },
    options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } } }
  });
}

// =====================================================================
// SOZLAMALAR: v2 kalitlari va maxfiy murojaat shifrlash kaliti
// =====================================================================
function v2SettingsHTML(ro) {
  const s = state.settings, pk = s.whistle_pubkey;
  const sw = (key, title, desc, on) => `<div class="set-item"><div><b>${title}</b><p>${desc}</p></div><label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''} ${ro ? 'disabled' : ''}><i></i></label></div>`;
  return `
    <div class="card"><div class="card-h"><h3>🧩 Yangi imkoniyatlar</h3></div><div class="card-b"><div class="set-list">
      ${sw('anon_reports_enabled', '🕶️ Maxfiy murojaat', 'Fuqaro ismsiz, kuzatuv kodi bilan murojaat yubora oladi', s.anon_reports_enabled !== false)}
      ${sw('ai_enabled', '🤖 AI tahlili va AI yordamchi', 'Foto avtomatik tahlil qilinadi (Edge Function “eco-ai”, ANTHROPIC_API_KEY kerak)', s.ai_enabled !== false)}
      <div class="set-item"><div><b>AI kunlik limiti</b><p>Bir foydalanuvchi uchun kunlik AI so‘rovlari (0 — cheklovsiz)</p></div>
        <input type="number" min="0" max="500" data-set="ai_daily_limit" value="${Number(s.ai_daily_limit ?? 20)}" ${ro ? 'disabled' : ''}></div>
      ${sw('transparency_enabled', '💰 Shaffoflik bo‘limi', 'Ilovada tushumlar va loyihalar hammaga ko‘rinadi', s.transparency_enabled !== false)}
      ${sw('rating_enabled', '🏆 Eko-reyting', 'Hududlar va faol fuqarolar reytingi (faqat real natija bo‘yicha)', s.rating_enabled !== false)}
    </div></div></div>

    <div class="card"><div class="card-h"><h3>🔐 Maxfiy murojaat shifrlash kaliti</h3></div><div class="card-b">
      <p class="small" style="margin-top:0">Fuqaro ixtiyoriy qoldirgan aloqa ma’lumoti telefonning o‘zida <b>ochiq kalit</b> bilan shifrlanadi. Uni faqat <b>yopiq kalit</b> egasi —
        yuridik mas’ul — qonuniy zarurat bo‘lganda ocha oladi. Yopiq kalit serverga yuklanmaydi; yo‘qolsa, shifrlangan aloqalarni tiklab bo‘lmaydi.</p>
      <dl class="meta"><dt>Holat</dt><dd>${pk ? `<span class="pill" style="--c:var(--s3)"><span class="dot"></span>O‘rnatilgan</span> <code id="pkFp">…</code>` : '<span class="pill" style="--c:var(--sx)">O‘rnatilmagan</span> — ilovada aloqa maydoni ko‘rinmaydi'}</dd></dl>
      ${ro ? '' : `<div class="row mt"><button class="btn" id="pkGen">${pk ? 'Kalitni almashtirish' : 'Kalit juftligini yaratish'}</button>${pk ? '<button class="btn btn-danger" id="pkDel">O‘chirish</button>' : ''}</div>`}
    </div></div>`;
}
function v2BindSettings(el) {
  const pk = state.settings.whistle_pubkey;
  if (pk && pk.n && crypto.subtle) crypto.subtle.digest('SHA-256', new TextEncoder().encode(pk.n)).then(b => {
    const fp = $('#pkFp'); if (fp) fp.textContent = Array.from(new Uint8Array(b)).slice(0, 8).map(x => x.toString(16).padStart(2, '0')).join(':'); });
  const gen = $('#pkGen', el);
  if (gen) gen.onclick = async () => {
    if (pk && !confirm('Yangi kalit yaratilsa, eski kalit bilan shifrlangan aloqalar faqat ESKI yopiq kalit bilan ochiladi. Davom etasizmi?')) return;
    try {
      const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
      const pub = await crypto.subtle.exportKey('jwk', kp.publicKey), priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(priv, null, 2)], { type: 'application/json' }));
      a.download = `whistle-private-key-${dayKey(Date.now())}.json`; a.click();
      if (!confirm('Yopiq kalit fayli yuklab olindi. Uni xavfsiz joyda (shifrlangan flesh, seyf) saqlaganingizni tasdiqlang. Endi ochiq kalit serverga saqlanadi.')) return;
      await api.saveSetting('whistle_pubkey', { kty: pub.kty, n: pub.n, e: pub.e, alg: pub.alg });
      state.settings.whistle_pubkey = { kty: pub.kty, n: pub.n, e: pub.e, alg: pub.alg }; toast('Kalit o‘rnatildi', 'ok'); render();
    } catch (e) { toast(e.message, 'err'); }
  };
  const del = $('#pkDel', el);
  if (del) del.onclick = async () => {
    if (!confirm('Ochiq kalit o‘chirilsinmi? Ilovada shifrlangan aloqa maydoni yashiriladi.')) return;
    try { await api.saveSetting('whistle_pubkey', null); state.settings.whistle_pubkey = null; render(); } catch (e) { toast(e.message, 'err'); }
  };
}
