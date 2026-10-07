/* =====================================================================
   EKO-MUROJAAT — ma'lumotlar qatlami
   - Konstantalar (mobil ilova va bazadagi qiymatlar bilan bir xil)
   - Biznes qoidalari (supabase/schema.sql triggerlari bilan bir xil)
   - DemoStore: namunaviy ma'lumotlar, brauzerda saqlanadi (localStorage)
   - LiveStore: Supabase (config.js da kalitlar bo'lsa)
   ===================================================================== */
'use strict';

const STATUSES = [
  { k: 0, t: 'Yangi',               c: 'var(--s0)', citizen: 'Qabul qilindi' },
  { k: 1, t: 'Ko‘rib chiqilmoqda',  c: 'var(--s1)', citizen: 'Tekshirilmoqda' },
  { k: 2, t: 'Ijroda',              c: 'var(--s2)', citizen: 'Mas’ul tashkilotga yuborildi' },
  { k: 3, t: 'Bartaraf etildi',     c: 'var(--s3)', citizen: 'Bartaraf etildi' },
  { k: 4, t: 'Yopildi',             c: 'var(--s4)', citizen: 'Yakunlandi' }
];
const CATEGORIES = [
  { k: 'Chiqindi', icon: '🗑️', t: 'Chiqindi' },
  { k: 'Havo',     icon: '💨', t: 'Havo ifloslanishi' },
  { k: 'Suv',      icon: '💧', t: 'Suv ifloslanishi' },
  { k: 'Daraxt',   icon: '🌳', t: 'Daraxt kesish' },
  { k: 'Tuproq',   icon: '🪨', t: 'Tuproq / yer' },
  { k: 'Boshqa',   icon: '❗', t: 'Boshqa' }
];
const REGIONS = [
  { code: 'tashkent_city',  uz: 'Toshkent shahri',               lat: 41.3111, lng: 69.2797, d: ['Chilonzor', 'Yunusobod', 'Mirzo Ulug‘bek', 'Yakkasaroy', 'Sergeli', 'Olmazor', 'Shayxontohur', 'Uchtepa', 'Yashnobod', 'Mirobod', 'Bektemir', 'Yangihayot'] },
  { code: 'tashkent',       uz: 'Toshkent viloyati',             lat: 41.0000, lng: 69.6000, d: ['Chirchiq sh.', 'Angren sh.', 'Olmaliq sh.', 'Zangiota tumani', 'Qibray tumani', 'Bo‘stonliq tumani'] },
  { code: 'andijan',        uz: 'Andijon viloyati',              lat: 40.7821, lng: 72.3442, d: ['Andijon sh.', 'Asaka tumani', 'Xonobod sh.', 'Shahrixon tumani'] },
  { code: 'bukhara',        uz: 'Buxoro viloyati',               lat: 39.7747, lng: 64.4286, d: ['Buxoro sh.', 'Kogon sh.', 'G‘ijduvon tumani', 'Vobkent tumani'] },
  { code: 'fergana',        uz: 'Farg‘ona viloyati',             lat: 40.3864, lng: 71.7864, d: ['Farg‘ona sh.', 'Marg‘ilon sh.', 'Qo‘qon sh.', 'Quvasoy sh.', 'Rishton tumani'] },
  { code: 'jizzakh',        uz: 'Jizzax viloyati',               lat: 40.1158, lng: 67.8422, d: ['Jizzax sh.', 'Zomin tumani', 'G‘allaorol tumani'] },
  { code: 'khorezm',        uz: 'Xorazm viloyati',               lat: 41.5500, lng: 60.6333, d: ['Urganch sh.', 'Xiva sh.', 'Xonqa tumani'] },
  { code: 'namangan',       uz: 'Namangan viloyati',             lat: 40.9983, lng: 71.6726, d: ['Namangan sh.', 'Chust tumani', 'Pop tumani', 'Kosonsoy tumani'] },
  { code: 'navoi',          uz: 'Navoiy viloyati',               lat: 40.0844, lng: 65.3792, d: ['Navoiy sh.', 'Zarafshon sh.', 'Karmana tumani'] },
  { code: 'kashkadarya',    uz: 'Qashqadaryo viloyati',          lat: 38.8600, lng: 65.7900, d: ['Qarshi sh.', 'Shahrisabz sh.', 'Muborak tumani', 'G‘uzor tumani'] },
  { code: 'karakalpakstan', uz: 'Qoraqalpog‘iston Respublikasi', lat: 42.4600, lng: 59.6000, d: ['Nukus sh.', 'Mo‘ynoq tumani', 'Xo‘jayli tumani', 'Chimboy tumani'] },
  { code: 'samarkand',      uz: 'Samarqand viloyati',            lat: 39.6542, lng: 66.9597, d: ['Samarqand sh.', 'Kattaqo‘rg‘on sh.', 'Urgut tumani', 'Payariq tumani'] },
  { code: 'syrdarya',       uz: 'Sirdaryo viloyati',             lat: 40.4897, lng: 68.7842, d: ['Guliston sh.', 'Yangiyer sh.', 'Shirin sh.'] },
  { code: 'surkhandarya',   uz: 'Surxondaryo viloyati',          lat: 37.2242, lng: 67.2783, d: ['Termiz sh.', 'Denov tumani', 'Sherobod tumani'] }
];
const PRIORITIES = [
  { k: 0, t: 'Oddiy' },
  { k: 1, t: 'Muhim' },
  { k: 2, t: 'Shoshilinch' }
];
const ROLES = {
  admin:     'Vazirlik administratori',
  moderator: 'Vazirlik dispetcheri',
  org_head:  'Idora rahbari',
  org_staff: 'Ijrochi (inspektor)',
  user:      'Fuqaro'
};
const PORTAL_ROLES = ['admin', 'moderator', 'org_head', 'org_staff'];
const DEFAULT_SETTINGS = {
  accepting_reports: true,
  auto_assign: true,
  sla_days: { Chiqindi: 5, Havo: 3, Suv: 5, Daraxt: 7, Tuproq: 10, Boshqa: 15 },
  edit_days: 5, daily_limit: 10,
  announcement: { enabled: false, uz: '', ru: '' }
};
const MAX_TERM_DAYS = 30;   // murojaat kelgan kundan boshlab eng uzoq muddat

const DAY = 86400000;
const regionOf = c => REGIONS.find(r => r.code === c);
const catOf = k => CATEGORIES.find(c => c.k === k) || { k: k || '—', icon: '•', t: k || '—' };
const isStaffRole = r => r === 'admin' || r === 'moderator';
const isAgentRole = r => r === 'org_head' || r === 'org_staff';

// ---------------------------------------------------------------------
// Biznes qoidalari: schema.sql dagi reports_before_update / finish_update bilan bir xil.
// Demo rejimda shu yerda bajariladi, jonli rejimda baza o'zi tekshiradi.
// ---------------------------------------------------------------------
function applyReportRules(old, patch, me, ctx) {
  const n = Object.assign({}, old, patch);
  const now = new Date().toISOString();
  const staff = isStaffRole(me.role);
  if (!staff) {
    if (!isAgentRole(me.role) || !me.org_id || old.org_id !== me.org_id) throw new Error('Ruxsat yo‘q');
    if (old.cancelled) throw new Error('Ariza fuqaro tomonidan bekor qilingan');
    ['id', 'case_no', 'user_id', 'description', 'category', 'region', 'address', 'lat', 'lng', 'location_text', 'media_type', 'media_path', 'created_at', 'cancelled'].forEach(k => { n[k] = old[k]; });
    if (me.role !== 'org_head') {
      if (old.assignee_id !== me.id) throw new Error('Bu ariza sizga biriktirilmagan');
      n.assignee_id = old.assignee_id; n.org_id = old.org_id; n.deadline_at = old.deadline_at; n.priority = old.priority;
    }
    if (n.assignee_id !== old.assignee_id && n.assignee_id) {
      const p = ctx.profiles.find(x => x.id === n.assignee_id);
      if (!p || p.org_id !== old.org_id || !isAgentRole(p.role) || p.blocked) throw new Error('Ijrochi shu idora xodimi bo‘lishi kerak');
    }
    if (n.deadline_at !== old.deadline_at) {
      if (!n.deadline_at || new Date(n.deadline_at) - new Date(old.created_at) > MAX_TERM_DAYS * DAY) throw new Error('Muddat murojaat kelgan kundan boshlab 30 kundan oshmasligi kerak');
    }
    const closing = (n.status >= 3 && old.status < 3) || (n.reject_reason && !old.reject_reason);
    if (closing && !String(n.admin_note || '').trim()) throw new Error('Arizani yopishdan oldin fuqaroga javob yozing');
  }
  // umumiy qoidalar
  if (n.org_id !== old.org_id) {
    n.assignee_id = null;
    if (old.org_id && n.status >= 1 && n.status <= 2) n.status = 0;
  }
  n.extend_count = (n.deadline_at !== old.deadline_at && new Date(n.deadline_at) > new Date(old.deadline_at)) ? (old.extend_count || 0) + 1 : (old.extend_count || 0);
  if (n.reject_reason && !old.reject_reason) n.status = 4;
  if (n.status !== old.status) {
    n.status_changed_at = now;
    if (n.status >= 1 && !n.accepted_at) n.accepted_at = now;
    if (n.status >= 3 && old.status < 3) n.resolved_at = now;
    if (n.status < 3) n.resolved_at = null;
  }
  n.updated_at = now;
  return n;
}

// Tarix yozuvlari (schema.sql: reports_after_change bilan bir xil)
function historyFor(old, n, actor, ctx) {
  const h = [], at = n.updated_at || new Date().toISOString();
  const add = (event, extra) => h.push(Object.assign({ report_id: n.id, event, status: null, note: null, actor, created_at: at }, extra));
  const orgName = id => (ctx.orgs.find(o => o.id === id) || {}).name || '—';
  if (n.status !== old.status) add('status', { status: n.status });
  if (n.org_id !== old.org_id) add(old.org_id ? 'forwarded' : 'org', { note: orgName(n.org_id) });
  if (n.assignee_id !== old.assignee_id && n.assignee_id) add('assigned', { note: (ctx.profiles.find(p => p.id === n.assignee_id) || {}).full_name || '—' });
  if (n.deadline_at !== old.deadline_at && n.deadline_at) add('deadline', { note: fmtDay(n.deadline_at) });
  if ((n.admin_note || '') !== (old.admin_note || '') && n.admin_note) add('note', { note: n.admin_note });
  if (n.priority !== old.priority) add('priority', { status: n.priority });
  if (n.reject_reason && n.reject_reason !== old.reject_reason) add('rejected', { note: n.reject_reason });
  if (n.proof_path && n.proof_path !== old.proof_path) add('proof');
  return h;
}
function fmtDay(d) { const x = new Date(d); return String(x.getDate()).padStart(2, '0') + '.' + String(x.getMonth() + 1).padStart(2, '0') + '.' + x.getFullYear(); }

// Kategoriya + viloyat bo'yicha mos idora (schema.sql: auto_assign)
function routeOrg(orgs, category, region) {
  const cands = orgs.filter(o => o.active && (o.categories || []).includes(category) && (o.region === region || !o.region) && !o.central);
  cands.sort((a, b) => (a.region ? 0 : 1) - (b.region ? 0 : 1));
  return cands[0] ? cands[0].id : null;
}

// ---------------------------------------------------------------------
// Rasmni kichraytirish (yuklashdan oldin): eng uzun tomoni 1280px, JPEG
// ---------------------------------------------------------------------
function shrinkImage(file, max = 1280, q = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Faqat rasm fayli yuklanadi'));
    if (file.size > 15 * 1024 * 1024) return reject(new Error('Fayl hajmi 15 MB dan oshmasligi kerak'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Rasmni o‘qib bo‘lmadi')), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Rasmni o‘qib bo‘lmadi')); };
    img.src = url;
  });
}
const blobToDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });

// =====================================================================
// DEMO MA'LUMOTLAR
// =====================================================================
const DEMO_KEY = 'eko_portal_demo_v3';
const DEMO_SESSION = 'eko_portal_demo_me';

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const DEMO_TEXTS = {
  Chiqindi: [
    'Ko‘cha chetida bir necha kundan beri chiqindi uyumi turibdi, konteynerlar to‘lib ketgan. Hidi butun mahallaga tarqalyapti.',
    'Ariq bo‘yiga qurilish chiqindilari tashlab ketilgan. G‘isht, beton bo‘laklari suv oqimini to‘sib qo‘ygan.',
    'Uy oldidagi chiqindi konteyneri bir haftadan beri olib ketilmagan, atrofida itlar va kalamushlar ko‘paygan.',
    'Bog‘ ichida plastik idishlar va paketlar to‘planib qolgan, hech kim tozalamayapti.',
    'Kechasi noma’lum yuk mashinasi bo‘sh yerga maishiy chiqindi to‘kib ketdi. Mashina raqamini suratga oldim.',
    'Chiqindi yoqilyapti, tutun bolalar maydonchasigacha keladi. Har kuni kechqurun takrorlanadi.',
    'Bozor orqasida sabzavot chiqindilari chirib yotibdi, pashsha juda ko‘p.',
    'Avtobus bekati yonidagi axlat qutisi singan, chiqindi yo‘lga sochilib ketgan.'
  ],
  Havo: [
    'Zavod mo‘ridan kechasi qora tutun chiqyapti, ertalab hovlidagi mashinalar ustida qora chang bo‘ladi.',
    'Mahallada kimdir shina yoqyapti, hidi nafas olishga qiyin qiladi.',
    'Asfalt zavodidan kuchli hid kelyapti, ayniqsa kechqurun. Bolalar yo‘tal bilan kasallanmoqda.',
    'Qurilish maydonidan juda ko‘p chang ko‘tarilmoqda, suv sepilmaydi, to‘siq ham yo‘q.',
    'Yaqin atrofdagi novvoyxona ko‘mir yoqadi, tutun uylar ichiga kiradi.',
    'Kafeda tandirda plastik va eski taxta yoqishmoqda, tutun ko‘chaga tarqalyapti.'
  ],
  Suv: [
    'Kanalga kanalizatsiya suvi oqizilmoqda, suv rangi qorayib, hid chiqmoqda.',
    'Ariqda baliqlar o‘lib suzib yuribdi. Yuqorida avtomoyka bor, yuvilgan suv to‘g‘ridan-to‘g‘ri ariqqa tushadi.',
    'Ichimlik suvi quvuri yorilgan, ikki kundan beri suv ko‘chaga oqib yotibdi.',
    'Daryo bo‘yida avtomobil moyi to‘kilgan, suv yuzasida dog‘lar ko‘rinmoqda.',
    'Ariq to‘lib qolgan chiqindi tufayli suv ko‘chaga toshib chiqdi, uylarning yerto‘lalarini suv bosdi.',
    'Ko‘l bo‘yidagi dam olish maskani oqova suvni ko‘lga chiqaryapti.'
  ],
  Daraxt: [
    'Ko‘cha bo‘yidagi 5 ta katta chinor daraxti kesilmoqda. Ruxsatnoma bormi, bilmoqchimiz.',
    'Park ichida yosh daraxtlar sindirib ketilgan, qo‘riqlash yo‘q.',
    'Qurilish kompaniyasi hovlidagi tut daraxtlarini kechasi kesib, ildizini olib tashladi.',
    'Ko‘chadagi daraxtlar sug‘orilmayapti, yangi ekilganlarning yarmi qurib qoldi.',
    'Maktab yonidagi qari terak yiqilish arafasida, bolalar uchun xavfli. Mutaxassis ko‘rib chiqsin.',
    'Daraxt shoxlari elektr simlariga tegib turibdi, shamolda uchqun chiqdi.'
  ],
  Tuproq: [
    'Dalaga qishloq xo‘jaligi kimyoviy moddalari solingan qoplar tashlab ketilgan.',
    'Qurilish uchun unumdor tuproq qatlami ruxsatsiz qazib olib ketilmoqda.',
    'Yonilg‘i quyish shoxobchasi yonidagi yerga yoqilg‘i to‘kilgan, yer qorayib qolgan.',
    'Daryo o‘zanidan ruxsatsiz qum-shag‘al qazilmoqda, qirg‘oq yemirilyapti.',
    'Eski fabrika hududida bochkalarda noma’lum kimyoviy moddalar qolib ketgan.'
  ],
  Boshqa: [
    'Ko‘chadagi daraxtlarga reklama bannerlari mixlab qo‘yilgan.',
    'Hovlida adashgan itlar ko‘payib ketgan, bolalarga xavf tug‘diryapti.',
    'Kechasi qurilishda shovqin juda baland, soat 2 gacha ishlashadi.',
    'Bog‘dagi favvora suvi almashtirilmaydi, yashil rangga kirib, hid chiqmoqda.',
    'Muhofaza qilinadigan hududda ruxsatsiz ov qilinmoqda, otishma ovozlari eshitiladi.'
  ]
};
const DEMO_ANSWERS = {
  Chiqindi: 'Murojaatingiz o‘rganildi. Ko‘rsatilgan joydagi chiqindilar {d} kuni maxsus texnika yordamida olib ketildi, hudud tozalandi. Chiqindi olib chiqish jadvali haftasiga 3 marta etib belgilandi. Mas’ul tashkilotga ogohlantirish berildi.',
  Havo: 'Murojaatingiz bo‘yicha inspektorlar tomonidan joyida o‘rganish o‘tkazildi va havo namunalari olindi. Aniqlangan qoidabuzarlik uchun korxonaga nisbatan ma’muriy bayonnoma rasmiylashtirildi hamda chang-tutun ushlagich uskunalarini ta’mirlash bo‘yicha ko‘rsatma berildi.',
  Suv: 'Murojaatingiz o‘rganildi. Oqova suvni chiqarish manbai aniqlanib, faoliyati to‘xtatildi. Suv namunalari laboratoriyada tahlil qilindi, aybdor shaxsga nisbatan qonunchilikda belgilangan choralar ko‘rildi.',
  Daraxt: 'Murojaatingiz bo‘yicha joyida o‘rganish o‘tkazildi. Daraxtlar ruxsatsiz kesilgani aniqlanib, aybdorlarga nisbatan jarima qo‘llanildi va yetkazilgan zararni qoplash uchun 10 barobar ko‘p ko‘chat ekish majburiyati yuklatildi.',
  Tuproq: 'Murojaatingiz o‘rganildi. Ifloslangan yer maydoni aniqlanib, tozalash ishlari tashkil etildi. Tuproq namunalari tahlilga yuborildi, mas’ul shaxsga nisbatan choralar ko‘rildi.',
  Boshqa: 'Murojaatingiz ko‘rib chiqildi. Ko‘rsatilgan holat bo‘yicha tegishli choralar ko‘rildi va mas’ul xizmatlarga topshiriq berildi. Murojaatingiz uchun rahmat.'
};
const DEMO_REJECTS = [
  'Murojaatda ko‘rsatilgan manzil bo‘yicha qoidabuzarlik aniqlanmadi.',
  'Takroriy murojaat: ushbu holat bo‘yicha avvalroq javob berilgan.',
  'Ko‘rsatilgan daraxtlarni kesish uchun belgilangan tartibda ruxsatnoma olingan.'
];
const NAMES_M = ['Akmal Karimov', 'Jasur Toshmatov', 'Sherzod Rahimov', 'Bekzod Usmonov', 'Otabek Yusupov', 'Dilshod Ergashev', 'Rustam Nazarov', 'Farrux Qodirov', 'Sardor Aliyev', 'Ulug‘bek Xolmatov', 'Botir Saidov', 'Javlon Mirzayev', 'Anvar Tursunov', 'Ilhom Sobirov', 'Shoxrux Abdullayev', 'Nodir Ismoilov'];
const NAMES_F = ['Dilnoza Rasulova', 'Malika Hamidova', 'Gulnora Yo‘ldosheva', 'Nilufar Sultonova', 'Zarina Qosimova', 'Madina Ahmedova', 'Shahnoza Islomova', 'Feruza Jo‘rayeva', 'Kamola Raximova', 'Nargiza Sharipova'];
const CITIZENS = ['Aziz Normatov', 'Lola Karimova', 'Timur Ganiyev', 'Sevara Olimova', 'Bahodir Xasanov', 'Nodira Umarova', 'Eldor Sattorov', 'Munisa Valiyeva', 'Jamshid Murodov', 'Ozoda Hakimova', 'Laziz Qurbonov', 'Durdona Azimova', 'Sanjar Pulatov', 'Kamron Ibragimov', 'Mohira Tojiyeva', 'Abdulla Yo‘ldoshev'];

function demoOrgs() {
  const all = ['Chiqindi', 'Havo', 'Suv', 'Daraxt', 'Tuproq', 'Boshqa'];
  return [
    { id: 'org-min', name: 'O‘zbekiston Respublikasi Ekologiya, atrof-muhitni muhofaza qilish va iqlim o‘zgarishi vazirligi', short_name: 'Ekologiya vazirligi', region: null, categories: all, central: true, phone: '+998 71 207-07-70', email: 'info@eco.gov.uz', address: 'Toshkent sh.' },
    { id: 'org-tsh-eco', name: 'Toshkent shahar Ekologiya va atrof-muhitni muhofaza qilish boshqarmasi', short_name: 'Toshkent sh. Ekologiya boshqarmasi', region: 'tashkent_city', categories: ['Havo', 'Suv', 'Daraxt', 'Tuproq', 'Boshqa'], phone: '+998 71 200-00-01', email: 'toshkent@eco.gov.uz', address: 'Toshkent sh., Yunusobod tumani' },
    { id: 'org-tsh-obod', name: 'Toshkent shahar Obodonlashtirish bosh boshqarmasi', short_name: 'Toshkent sh. Obodonlashtirish', region: 'tashkent_city', categories: ['Chiqindi', 'Daraxt'], phone: '+998 71 200-00-02', email: 'obod@tashkent.uz', address: 'Toshkent sh., Mirobod tumani' },
    { id: 'org-waste', name: 'Chiqindilar bilan ishlash agentligi', short_name: 'Chiqindi agentligi', region: null, categories: ['Chiqindi'], phone: '+998 71 200-00-03', email: 'info@waste.uz', address: 'Toshkent sh.' },
    { id: 'org-tv-eco', name: 'Toshkent viloyati Ekologiya boshqarmasi', short_name: 'Toshkent vil. Ekologiya', region: 'tashkent', categories: all, phone: '+998 70 200-00-04', email: 'tv@eco.gov.uz', address: 'Nurafshon sh.' },
    { id: 'org-sam-eco', name: 'Samarqand viloyati Ekologiya boshqarmasi', short_name: 'Samarqand Ekologiya', region: 'samarkand', categories: all, phone: '+998 66 200-00-05', email: 'samarqand@eco.gov.uz', address: 'Samarqand sh.' },
    { id: 'org-fer-eco', name: 'Farg‘ona viloyati Ekologiya boshqarmasi', short_name: 'Farg‘ona Ekologiya', region: 'fergana', categories: all, phone: '+998 73 200-00-06', email: 'fargona@eco.gov.uz', address: 'Farg‘ona sh.' },
    { id: 'org-buh-eco', name: 'Buxoro viloyati Ekologiya boshqarmasi', short_name: 'Buxoro Ekologiya', region: 'bukhara', categories: all, phone: '+998 65 200-00-07', email: 'buxoro@eco.gov.uz', address: 'Buxoro sh.' },
    { id: 'org-and-eco', name: 'Andijon viloyati Ekologiya boshqarmasi', short_name: 'Andijon Ekologiya', region: 'andijan', categories: all, phone: '+998 74 200-00-08', email: 'andijon@eco.gov.uz', address: 'Andijon sh.' },
    { id: 'org-kk-eco', name: 'Qoraqalpog‘iston Respublikasi Ekologiya boshqarmasi', short_name: 'Qoraqalpog‘iston Ekologiya', region: 'karakalpakstan', categories: all, phone: '+998 61 200-00-09', email: 'nukus@eco.gov.uz', address: 'Nukus sh.' },
    { id: 'org-water', name: 'Suv xo‘jaligi vazirligi huzuridagi suv resurslari inspeksiyasi', short_name: 'Suv inspeksiyasi', region: null, categories: ['Suv'], phone: '+998 71 200-00-10', email: 'suv@water.gov.uz', address: 'Toshkent sh.' }
  ].map(o => Object.assign({ active: true, head: null }, o));
}

function buildDemo() {
  const R = rng(20261005), pick = a => a[Math.floor(R() * a.length)], now = Date.now();
  const orgs = demoOrgs(), profiles = [], reports = [], history = [], comments = [], templates = [];
  let pid = 0;
  const person = (full_name, role, org_id, position) => {
    const p = { id: 'u' + (++pid), full_name, role, org_id, position, email: null, phone: '+998 9' + Math.floor(R() * 10) + ' ' + String(100 + Math.floor(R() * 899)) + '-' + String(10 + Math.floor(R() * 89)) + '-' + String(10 + Math.floor(R() * 89)), blocked: false, created_at: new Date(now - (90 + R() * 200) * DAY).toISOString() };
    profiles.push(p); return p;
  };
  const admin = person('Sanjar Mahmudov', 'admin', null, 'Murojaatlar bilan ishlash bo‘limi boshlig‘i'); admin.email = 'admin@eco.gov.uz';
  const disp = person('Nigora Abdullayeva', 'moderator', null, 'Bosh mutaxassis, dispetcher'); disp.email = 'dispetcher@eco.gov.uz';
  let mi = 0, fi = 0;
  orgs.filter(o => !o.central).forEach((o, i) => {
    const head = person((i % 3 === 1 ? NAMES_F[fi++ % NAMES_F.length] : NAMES_M[mi++ % NAMES_M.length]), 'org_head', o.id, 'Boshqarma boshlig‘i');
    head.email = 'rahbar.' + o.id.replace('org-', '') + '@eco.gov.uz'; o.head = head.full_name;
    const n = o.id === 'org-tsh-eco' || o.id === 'org-tsh-obod' ? 4 : 2 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const p = person((k % 2 ? NAMES_F[fi++ % NAMES_F.length] : NAMES_M[mi++ % NAMES_M.length]), 'org_staff', o.id, k === 0 ? 'Bosh inspektor' : 'Inspektor');
      p.email = 'inspektor' + (k + 1) + '.' + o.id.replace('org-', '') + '@eco.gov.uz';
    }
  });
  const citizens = CITIZENS.map((n, i) => ({ id: 'c' + i, full_name: n, role: 'user', phone: '+998 9' + (i % 10) + ' ' + String(200 + i * 37) + '-' + String(10 + i * 5 % 89) + '-' + String(20 + i * 3 % 79), created_at: new Date(now - (30 + i * 9) * DAY).toISOString() }));
  profiles.push(...citizens);

  const regionBag = ['tashkent_city', 'tashkent_city', 'tashkent_city', 'tashkent_city', 'tashkent_city', 'tashkent_city', 'tashkent', 'tashkent', 'samarkand', 'samarkand', 'fergana', 'fergana', 'bukhara', 'andijan', 'namangan', 'karakalpakstan', 'kashkadarya', 'navoi', 'khorezm', 'jizzakh', 'syrdarya', 'surkhandarya'];
  const catBag = ['Chiqindi', 'Chiqindi', 'Chiqindi', 'Chiqindi', 'Havo', 'Havo', 'Havo', 'Suv', 'Suv', 'Daraxt', 'Daraxt', 'Daraxt', 'Tuproq', 'Boshqa'];
  const sla = DEFAULT_SETTINGS.sla_days;
  const N = 264;
  let hid = 0, cid = 0;
  for (let i = 0; i < N; i++) {
    const age = Math.pow(R(), 1.6) * 75;                 // ko'pchiligi yaqin kunlarda
    const created = now - age * DAY - R() * 3600e3;
    const region = pick(regionBag), reg = regionOf(region), cat = pick(catBag), cit = pick(citizens);
    const district = pick(reg.d);
    let org = routeOrg(orgs, cat, region), fwdOrg = null;
    // avtomatik taqsimlanmaganlarini dispetcher bir-ikki kunda yo'naltiradi
    if (!org && age > 1.5) { const cand = orgs.filter(o => o.active && !o.central && (o.region === region || !o.region)); if (cand.length) org = fwdOrg = pick(cand).id; }
    const r = {
      id: 'r' + (i + 1), case_no: 'ECO-' + String(1000 + i).padStart(6, '0'), user_id: cit.id,
      description: pick(DEMO_TEXTS[cat]), category: cat, region,
      address: district + ', ' + pick(['Navro‘z', 'Bog‘ishamol', 'Amir Temur', 'Mustaqillik', 'Bunyodkor', 'Do‘stlik', 'Istiqlol', 'Navoiy', 'Bobur', 'Sharq']) + ' ko‘chasi, ' + (1 + Math.floor(R() * 90)) + '-uy yoni',
      lat: +(reg.lat + (R() - 0.5) * (region === 'tashkent_city' ? 0.13 : 0.32)).toFixed(5),
      lng: +(reg.lng + (R() - 0.5) * (region === 'tashkent_city' ? 0.16 : 0.42)).toFixed(5),
      location_text: null, media_type: R() < 0.82 ? 'image' : null, media_path: null,
      status: 0, priority: R() < 0.12 ? 2 : R() < 0.3 ? 1 : 0, org_id: org, assignee_id: null,
      created_at: new Date(created).toISOString(), deadline_at: new Date(created + (sla[cat] || 15) * DAY).toISOString(),
      accepted_at: null, admin_note: null, reject_reason: null, proof_path: null, extend_count: 0,
      cancelled: false, cancelled_at: null, edited_at: null, status_changed_at: null, resolved_at: null
    };
    r.updated_at = r.created_at;
    const H = (event, at, extra) => history.push(Object.assign({ id: ++hid, report_id: r.id, event, status: null, note: null, actor: null, created_at: new Date(at).toISOString() }, extra));
    H('created', created, { status: 0 });
    const disp = profiles.find(p => p.role === 'moderator');
    if (fwdOrg) H('forwarded', created + (0.3 + R() * 0.9) * DAY, { note: orgs.find(o => o.id === org).name, actor: disp && disp.id });
    else if (org) H('org', created + 60e3, { note: orgs.find(o => o.id === org).name });
    // holat rivoji: arizaning yoshi va tasodifga qarab
    const staffOf = profiles.filter(p => p.org_id === org && p.role === 'org_staff');
    const head = profiles.find(p => p.org_id === org && p.role === 'org_head');
    const lim = (sla[cat] || 15) * DAY;
    let t = created, st = 0;
    const roll = R();
    const progress = !org ? 0 : age < 0.6 ? 0 : age < 2 ? (roll < 0.6 ? 1 : 0) : age < 5 ? (roll < 0.15 ? 0 : roll < 0.45 ? 1 : roll < 0.75 ? 2 : 3) : age < 15 ? (roll < 0.04 ? 0 : roll < 0.12 ? 1 : roll < 0.24 ? 2 : roll < 0.6 ? 3 : 4) : (roll < 0.015 ? 1 : roll < 0.04 ? 2 : roll < 0.4 ? 3 : 4);
    if (R() < 0.03 && age > 1) { r.cancelled = true; r.cancelled_at = new Date(created + 0.5 * DAY).toISOString(); H('cancelled', created + 0.5 * DAY); }
    else {
      if (progress >= 1) { t += (0.1 + R() * 0.8) * DAY; st = 1; r.accepted_at = new Date(t).toISOString(); H('status', t, { status: 1, actor: head && head.id }); if (staffOf.length) { r.assignee_id = pick(staffOf).id; H('assigned', t + 120e3, { note: profiles.find(p => p.id === r.assignee_id).full_name, actor: head && head.id }); } }
      if (progress >= 2) { t += (0.3 + R() * 1.5) * DAY; st = 2; H('status', t, { status: 2, actor: r.assignee_id }); if (R() < 0.5) { comments.push({ id: ++cid, report_id: r.id, author: r.assignee_id, body: pick(['Joyiga chiqildi, holat tasdiqlandi. Dalolatnoma tuzilmoqda.', 'Mas’ul korxona bilan bog‘lanildi, ertaga qayta tekshiriladi.', 'Laboratoriya namunalari olindi, natija kutilmoqda.', 'Hokimlik vakili bilan birgalikda o‘rganish rejalashtirildi.']), created_at: new Date(t + 3600e3).toISOString() }); } }
      if (progress >= 3) {
        const late = R() < 0.18;
        t = Math.min(now - 3600e3, Math.max(t + 0.5 * DAY, late ? created + lim + (1 + R() * 3) * DAY : created + R() * lim * 0.9));
        if (R() < 0.07) { r.reject_reason = pick(DEMO_REJECTS); r.admin_note = 'Murojaatingiz o‘rganildi. ' + r.reject_reason + ' Murojaatingiz uchun rahmat.'; st = 4; H('rejected', t, { note: r.reject_reason, actor: head && head.id }); H('status', t, { status: 4, actor: head && head.id }); }
        else { st = 3; r.admin_note = DEMO_ANSWERS[cat].replace('{d}', fmtDay(t)); r.proof_path = R() < 0.55 ? 'demo-proof' : null; H('note', t - 600e3, { note: r.admin_note, actor: r.assignee_id }); if (r.proof_path) H('proof', t - 300e3, { actor: r.assignee_id }); H('status', t, { status: 3, actor: r.assignee_id }); }
        r.resolved_at = new Date(t).toISOString();
      }
      if (progress >= 4 && st === 3) { t = Math.min(now - 600e3, t + (0.2 + R() * 1.5) * DAY); st = 4; H('status', t, { status: 4, actor: head && head.id }); }
    }
    // ba'zi ijrodagi arizalar muddati uzaytirilgan
    if (st >= 1 && st <= 2 && R() < 0.12) { const nd = new Date(created + Math.min(MAX_TERM_DAYS, (sla[cat] || 15) + 10) * DAY); r.deadline_at = nd.toISOString(); r.extend_count = 1; H('deadline', t + 600e3, { note: fmtDay(nd), actor: head && head.id }); comments.push({ id: ++cid, report_id: r.id, author: head && head.id, body: 'Muddat uzaytirildi: qo‘shimcha o‘rganish va laboratoriya tahlili talab etiladi.', created_at: new Date(t + 600e3).toISOString() }); }
    r.status = st;
    r.status_changed_at = st ? new Date(t).toISOString() : null;
    r.updated_at = new Date(Math.max(created, t)).toISOString();
    reports.push(r);
  }
  templates.push(
    { id: 't1', org_id: null, title: 'Chiqindi olib ketildi', body: 'Murojaatingiz o‘rganildi. Ko‘rsatilgan joydagi chiqindilar olib ketildi va hudud tozalandi. Mas’ul tashkilotga chiqindini o‘z vaqtida olib chiqish bo‘yicha ko‘rsatma berildi. Murojaatingiz uchun rahmat.' },
    { id: 't2', org_id: null, title: 'Qoidabuzarlik aniqlanib, choralar ko‘rildi', body: 'Murojaatingiz bo‘yicha joyida o‘rganish o‘tkazildi. Qoidabuzarlik tasdiqlanib, aybdor shaxsga nisbatan qonunchilikda belgilangan tartibda ma’muriy choralar ko‘rildi. Holat nazoratga olindi.' },
    { id: 't3', org_id: null, title: 'Qoidabuzarlik aniqlanmadi', body: 'Murojaatingiz o‘rganildi. Ko‘rsatilgan manzilda o‘tkazilgan tekshiruv natijasida qoidabuzarlik holati aniqlanmadi. Qo‘shimcha ma’lumotlaringiz bo‘lsa, qayta murojaat qilishingiz mumkin.' },
    { id: 't4', org_id: null, title: 'Muddat uzaytirildi', body: 'Murojaatingiz bo‘yicha qo‘shimcha o‘rganish va laboratoriya tahlili talab etilganligi sababli ko‘rib chiqish muddati uzaytirildi. Natijasi haqida qo‘shimcha ma’lum qilinadi.' },
    { id: 't5', org_id: 'org-tsh-eco', title: 'Havo namunasi olindi', body: 'Murojaatingiz bo‘yicha inspektorlar joyiga chiqib, atmosfera havosi namunalarini oldi. Tahlil natijasida me’yordan oshish holati aniqlandi va korxonaga nisbatan choralar ko‘rildi.' },
    { id: 't6', org_id: 'org-tsh-eco', title: 'Daraxt kesish uchun ruxsatnoma bor', body: 'Murojaatingiz o‘rganildi. Ko‘rsatilgan daraxtlarni kesish belgilangan tartibda olingan ruxsatnoma asosida amalga oshirilgan. Kompensatsiya sifatida yangi ko‘chatlar ekilishi nazoratga olindi.' }
  );
  return { v: 2, orgs, profiles, reports, history, comments, templates, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), seq: 1000 + N, hid, cid, audit: [] };
}

// Demo suratlar: kategoriya bo'yicha chizilgan rasm (haqiqiy surat o'rniga)
function demoPhoto(r, kind) {
  const pal = { Chiqindi: ['#6B4F2A', '#A0784A', '#D9C29C'], Havo: ['#4B5563', '#9CA3AF', '#E5E7EB'], Suv: ['#1E3A5F', '#2F6E9E', '#A9D3EE'], Daraxt: ['#1F4D2B', '#3F8A4E', '#BFE3B4'], Tuproq: ['#5B3A1E', '#9A6B3F', '#E3C9A8'], Boshqa: ['#3B2F63', '#6E5BB5', '#D7CEF5'] }[r.category] || ['#333', '#777', '#ddd'];
  const ic = catOf(r.category).icon, after = kind === 'proof';
  const seed = parseInt(String(r.id).replace(/\D/g, '') || '1', 10);
  const R = rng(seed * 7 + (after ? 3 : 0));
  let blobs = '';
  for (let i = 0; i < (after ? 2 : 9); i++) blobs += `<circle cx="${40 + R() * 520}" cy="${250 + R() * 110}" r="${12 + R() * 34}" fill="${pal[R() < 0.5 ? 0 : 1]}" opacity=".85"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${after ? '#BDE3F5' : pal[2]}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="600" height="400" fill="url(#s)"/><rect y="250" width="600" height="150" fill="${after ? '#8BBF7A' : pal[1]}" opacity=".55"/>${blobs}<text x="300" y="200" font-size="110" text-anchor="middle">${after ? '✅' : ic}</text><rect x="12" y="12" width="${after ? 196 : 150}" height="34" rx="8" fill="rgba(0,0,0,.55)"/><text x="24" y="35" font-family="Arial" font-size="16" fill="#fff">${after ? 'Bajarilgan ish (demo)' : 'Fuqaro surati (demo)'}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// Demo tozalash aksiyalari (sanalar bugungi kunga nisbatan)
function demoEvents() {
  const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const sat = n => { const d = new Date(); return ((6 - d.getDay() + 7) % 7 || 7) + 7 * n; };
  return [
    { id: 'e1', title: 'Umumshahar shanbaligi: Chilonzor tumani ko‘chalarini tozalash', type: 'clean', region: 'tashkent_city', place: 'Chilonzor tumani, Bunyodkor ko‘chasi, “Chilonzor” metro bekati yonida', lat: 41.2756, lng: 69.2034, starts_at: at(sat(0), 9), ends_at: at(sat(0), 13), organizer: 'Toshkent sh. Obodonlashtirish', contact: '+998 71 200-00-02', max_people: 200, org_id: 'org-tsh-obod', status: 'published', description: 'Mahalla faollari, yoshlar va barcha xohlovchilar taklif etiladi. Qo‘lqop, qop va suv tashkilotchilar tomonidan beriladi. Qulay kiyim va bosh kiyim kiyib keling.', going: 64 },
    { id: 'e2', title: '“Yashil makon”: Yunusobodda 1000 tup ko‘chat ekamiz', type: 'tree', region: 'tashkent_city', place: 'Yunusobod tumani, Bodomzor yo‘li bo‘yi', lat: 41.3409, lng: 69.2847, starts_at: at(sat(1), 8), ends_at: at(sat(1), 12), organizer: 'Toshkent sh. Ekologiya boshqarmasi', contact: '+998 71 200-00-01', max_people: 150, org_id: 'org-tsh-eco', status: 'published', description: '“Yashil makon” umummilliy loyihasi doirasida chinor, eman va akas ko‘chatlari ekiladi. Ko‘chat va asbob-uskunalar joyida beriladi.', going: 41 },
    { id: 'e3', title: 'Chorvoq suv ombori qirg‘oqlarini plastikdan tozalash', type: 'volunteer', region: 'tashkent', place: 'Bo‘stonliq tumani, Chorvoq suv ombori, Yusufxona qirg‘og‘i', lat: 41.6271, lng: 70.0294, starts_at: at(sat(0) + 1, 9), ends_at: at(sat(0) + 1, 15), organizer: 'Toshkent vil. Ekologiya', contact: '@chorvoq_toza', max_people: 60, org_id: 'org-tv-eco', status: 'published', description: 'Ekologik volontyorlar uchun bir kunlik aksiya. Toshkentdan avtobus soat 7:30 da jo‘naydi (joy cheklangan). Yig‘ilgan plastik qayta ishlashga topshiriladi.', going: 37 },
    { id: 'e4', title: 'Samarqand: Siyob bozori atrofida ekologik hashar', type: 'clean', region: 'samarkand', place: 'Samarqand sh., Siyob bozori va Shohizinda yo‘li', lat: 39.6627, lng: 66.9874, starts_at: at(sat(1), 9), ends_at: null, organizer: 'Samarqand Ekologiya', contact: '+998 66 200-00-05', max_people: null, org_id: 'org-sam-eco', status: 'published', description: 'Tarixiy obidalar atrofini tozalash va axlat qutilarini o‘rnatish.', going: 18 },
    { id: 'e5', title: 'Orolbo‘yida saksovul ekish ekologik aksiyasi', type: 'action', region: 'karakalpakstan', place: 'Mo‘ynoq tumani, Orolning qurigan tubi', lat: 43.7686, lng: 59.0218, starts_at: at(sat(2), 8), ends_at: at(sat(2) + 1, 17), organizer: 'Qoraqalpog‘iston Ekologiya', contact: '+998 61 200-00-09', max_people: 80, org_id: 'org-kk-eco', status: 'draft', description: 'Ikki kunlik aksiya: saksovul va qandim ko‘chatlarini ekish. Turar joy va ovqat tashkilotchilar zimmasida.', going: 0 },
    { id: 'e6', title: 'Farg‘ona: “Toza hovli” mahalla shanbaligi', type: 'clean', region: 'fergana', place: 'Farg‘ona sh., Al-Farg‘oniy bog‘i', lat: 40.3864, lng: 71.7864, starts_at: at(-6, 9), ends_at: at(-6, 12), organizer: 'Farg‘ona Ekologiya', contact: '', max_people: null, org_id: 'org-fer-eco', status: 'published', description: 'O‘tkazildi: 3,2 tonna chiqindi yig‘ildi, 120 nafar ishtirokchi.', going: 120 }
  ];
}

const NEW_REPORT_POOL = [
  ['Chiqindi', 'tashkent_city'], ['Havo', 'tashkent_city'], ['Daraxt', 'tashkent_city'], ['Suv', 'samarkand'], ['Chiqindi', 'fergana'], ['Havo', 'tashkent'], ['Chiqindi', 'namangan'], ['Suv', 'tashkent_city'], ['Tuproq', 'bukhara']
];

class DemoStore {
  constructor() { this.mode = 'demo'; this.listeners = []; this.sim = null; }
  _read() { try { const d = JSON.parse(localStorage.getItem(DEMO_KEY)); if (d && d.v === 2) return d; } catch (e) { } return null; }
  _write() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.db)); } catch (e) { console.warn('demo save', e); } }
  async init() {
    this.db = this._read() || buildDemo();
    this._write();
    window.addEventListener('storage', e => { if (e.key === DEMO_KEY) { this.db = this._read() || this.db; this._emit({ type: 'sync' }); } });
    let sid = null; try { sid = sessionStorage.getItem(DEMO_SESSION) || localStorage.getItem(DEMO_SESSION); } catch (e) { }
    this.me = sid ? this.db.profiles.find(p => p.id === sid && PORTAL_ROLES.includes(p.role)) || null : null;
    return this.me;
  }
  demoAccounts() {
    const P = this.db.profiles;
    const pickRole = (role, org) => P.find(p => p.role === role && (!org || p.org_id === org));
    return [
      { p: pickRole('admin'), note: 'Barcha idoralar va arizalar, taqsimlash, sozlamalar' },
      { p: pickRole('moderator'), note: 'Taqsimlanmagan arizalarni idoralarga yo‘naltiradi' },
      { p: pickRole('org_head', 'org-tsh-eco'), note: 'Idora arizalari, ijrochi tayinlash, muddat' },
      { p: P.find(p => p.role === 'org_staff' && p.org_id === 'org-tsh-eco'), note: 'O‘ziga biriktirilgan arizalar ijrosi' },
      { p: pickRole('org_head', 'org-tsh-obod'), note: 'Chiqindi va obodonlashtirish arizalari' }
    ].filter(x => x.p);
  }
  async login(email) {
    const p = this.db.profiles.find(x => (x.email || '').toLowerCase() === String(email || '').trim().toLowerCase() && PORTAL_ROLES.includes(x.role));
    if (!p) throw new Error('Bunday hisob topilmadi. Demo rejimda quyidagi tayyor hisoblardan birini tanlang.');
    if (p.blocked) throw new Error('Hisobingiz bloklangan');
    return this.loginAs(p.id);
  }
  async loginAs(id) {
    this.me = this.db.profiles.find(p => p.id === id);
    try { sessionStorage.setItem(DEMO_SESSION, id); } catch (e) { }
    this._audit('login', null, this.me.full_name);
    return this.me;
  }
  async logout() { try { sessionStorage.removeItem(DEMO_SESSION); localStorage.removeItem(DEMO_SESSION); } catch (e) { } this.me = null; this.stopSim(); }
  // RLS bilan bir xil ko'rinish qoidasi
  _canSee(r) { const m = this.me; return isStaffRole(m.role) || (isAgentRole(m.role) && m.org_id && r.org_id === m.org_id); }
  async load() {
    const d = this.db, m = this.me;
    const reports = d.reports.filter(r => this._canSee(r)).map(r => this._norm(r));
    const ids = new Set(reports.map(r => r.id));
    const profiles = isStaffRole(m.role) ? d.profiles.filter(p => p.role !== 'user') : d.profiles.filter(p => p.org_id === m.org_id && p.role !== 'user');
    return {
      me: m, orgs: d.orgs.slice(), profiles, reports,
      history: d.history.filter(h => ids.has(h.report_id)),
      templates: d.templates.filter(t => isStaffRole(m.role) || !t.org_id || t.org_id === m.org_id),
      settings: d.settings
    };
  }
  _norm(r) {
    const c = this.db.profiles.find(p => p.id === r.user_id);
    return Object.assign({}, r, { citizen: c ? { id: c.id, name: c.full_name, phone: c.phone, blocked: !!c.blocked } : null });
  }
  async mediaUrl(r, kind) {
    if (kind === 'proof') return r.proof_path ? (String(r.proof_path).startsWith('data:') ? r.proof_path : demoPhoto(r, 'proof')) : null;
    return r.media_type === 'image' ? demoPhoto(r, 'media') : null;
  }
  async comments(id) { return this.db.comments.filter(c => c.report_id === id).sort((a, b) => a.created_at < b.created_at ? -1 : 1); }
  _ctx() { return { profiles: this.db.profiles, orgs: this.db.orgs }; }
  async updateReport(id, patch) {
    const i = this.db.reports.findIndex(r => r.id === id); if (i < 0) throw new Error('Ariza topilmadi');
    const old = this.db.reports[i];
    if (!this._canSee(old)) throw new Error('Ruxsat yo‘q');
    const n = applyReportRules(old, patch, this.me, this._ctx());
    historyFor(old, n, this.me.id, this._ctx()).forEach(h => { h.id = ++this.db.hid; this.db.history.push(h); });
    this.db.reports[i] = n; this._write();
    this._emit({ type: 'report', id });
    return this._norm(n);
  }
  async forward(id, orgId, reason) {
    const old = this.db.reports.find(r => r.id === id);
    if (!old) throw new Error('Ariza topilmadi');
    const m = this.me;
    if (!(isStaffRole(m.role) || (m.role === 'org_head' && old.org_id === m.org_id))) throw new Error('Ruxsat yo‘q');
    const org = this.db.orgs.find(o => o.id === orgId && o.active);
    if (!org) throw new Error('Tashkilot topilmadi yoki faol emas');
    if (orgId === old.org_id) throw new Error('Ariza allaqachon shu tashkilotda');
    if (reason && reason.trim()) this.db.comments.push({ id: ++this.db.cid, report_id: id, author: m.id, body: 'Yo‘naltirish sababi: ' + reason.trim().slice(0, 3900), created_at: new Date().toISOString() });
    const saved = this.me; this.me = Object.assign({}, m, { role: 'admin' });   // RPC security definer kabi
    try { return await this.updateReport(id, { org_id: orgId }); } finally { this.me = saved; }
  }
  async addComment(id, body) {
    const r = this.db.reports.find(x => x.id === id); if (!r || !this._canSee(r)) throw new Error('Ruxsat yo‘q');
    const c = { id: ++this.db.cid, report_id: id, author: this.me.id, body: String(body).trim().slice(0, 4000), created_at: new Date().toISOString() };
    if (!c.body) throw new Error('Izoh bo‘sh');
    this.db.comments.push(c); this._write(); this._emit({ type: 'comment', id });
    return c;
  }
  async uploadProof(id, file) {
    const blob = await shrinkImage(file, 900, 0.7);
    const url = await blobToDataUrl(blob);
    return this.updateReport(id, { proof_path: url });
  }
  async saveOrg(o) {
    if (!isStaffRole(this.me.role) || this.me.role !== 'admin') throw new Error('Faqat administrator uchun');
    if (o.id) { const i = this.db.orgs.findIndex(x => x.id === o.id); this.db.orgs[i] = Object.assign({}, this.db.orgs[i], o); }
    else { o.id = 'org-' + Date.now().toString(36); o.created_at = new Date().toISOString(); this.db.orgs.push(o); }
    this._audit('org', null, o.name); this._write(); this._emit({ type: 'orgs' }); return o;
  }
  async saveProfile(p) {
    if (this.me.role !== 'admin') throw new Error('Faqat administrator uchun');
    if (p.id === this.me.id && (p.role !== 'admin' || p.blocked)) throw new Error('O‘zingizni admin rolidan chiqara yoki bloklay olmaysiz');
    if (p.id) { const i = this.db.profiles.findIndex(x => x.id === p.id); this.db.profiles[i] = Object.assign({}, this.db.profiles[i], p); }
    else { if (!p.email) throw new Error('Email kiriting'); p.id = 'u' + Date.now().toString(36); p.created_at = new Date().toISOString(); this.db.profiles.push(p); }
    if (!isAgentRole(p.role)) { const x = this.db.profiles.find(y => y.id === p.id); x.org_id = null; }
    this._audit('staff', null, p.full_name); this._write(); this._emit({ type: 'profiles' }); return p;
  }
  async setBlocked(userId, blocked) {
    if (this.me.role !== 'admin') throw new Error('Faqat administrator uchun');
    const p = this.db.profiles.find(x => x.id === userId); if (!p || p.role !== 'user') throw new Error('Fuqaro topilmadi');
    p.blocked = !!blocked; this._audit(blocked ? 'block' : 'unblock', null, p.full_name); this._write(); this._emit({ type: 'profiles' });
  }
  async saveTemplate(t) {
    const m = this.me;
    if (!(m.role === 'admin' || (m.role === 'org_head' && t.org_id === m.org_id))) throw new Error('Ruxsat yo‘q');
    if (t.id) { const i = this.db.templates.findIndex(x => x.id === t.id); this.db.templates[i] = t; }
    else { t.id = 't' + Date.now().toString(36); this.db.templates.push(t); }
    this._write(); this._emit({ type: 'templates' }); return t;
  }
  async deleteTemplate(id) {
    const t = this.db.templates.find(x => x.id === id), m = this.me;
    if (!t || !(m.role === 'admin' || (m.role === 'org_head' && t.org_id === m.org_id))) throw new Error('Ruxsat yo‘q');
    this.db.templates = this.db.templates.filter(x => x.id !== id); this._write(); this._emit({ type: 'templates' });
  }
  // ---- Tozalash aksiyalari (RLS bilan bir xil qoidalar)
  _canEditEvent(e) { const m = this.me; return isStaffRole(m.role) || (m.role === 'org_head' && e.org_id === m.org_id); }
  async loadEvents() {
    if (!this.db.events) { this.db.events = demoEvents(); this._write(); }
    const m = this.me;
    return this.db.events.filter(e => e.status !== 'draft' || isStaffRole(m.role) || (m.role === 'org_head' && e.org_id === m.org_id))
      .map(e => Object.assign({}, e)).sort((a, b) => a.starts_at < b.starts_at ? 1 : -1);
  }
  async saveEvent(e) {
    const m = this.me;
    if (!isStaffRole(m.role) && m.role !== 'org_head') throw new Error('Ruxsat yo‘q');
    if (m.role === 'org_head') e.org_id = m.org_id;
    if (!this.db.events) this.db.events = demoEvents();
    if (e.id) {
      const i = this.db.events.findIndex(x => x.id === e.id);
      if (i < 0 || !this._canEditEvent(this.db.events[i])) throw new Error('Ruxsat yo‘q');
      this.db.events[i] = Object.assign({}, this.db.events[i], e);
    } else { e.id = 'e' + Date.now().toString(36); e.going = 0; this.db.events.push(e); }
    this._audit('event', null, e.title); this._write(); this._emit({ type: 'events' }); return e;
  }
  async deleteEvent(id) {
    const e = (this.db.events || []).find(x => x.id === id);
    if (!e || !this._canEditEvent(e)) throw new Error('Ruxsat yo‘q');
    this.db.events = this.db.events.filter(x => x.id !== id); this._write(); this._emit({ type: 'events' });
  }
  async saveSettings(s) {
    if (this.me.role !== 'admin') throw new Error('Faqat administrator uchun');
    this.db.settings = Object.assign({}, this.db.settings, s); this._write(); this._emit({ type: 'settings' });
  }
  _audit(kind, report, note) { this.db.audit = (this.db.audit || []).slice(-300); this.db.audit.push({ kind, report, note, actor: this.me && this.me.id, at: new Date().toISOString() }); }
  logContactView(r) { this._audit('contact', r.id, r.case_no); this._write(); }
  onChange(cb) { this.listeners.push(cb); }
  _emit(e) { this.listeners.forEach(cb => { try { cb(e); } catch (err) { console.error(err); } }); }
  reset() { localStorage.removeItem(DEMO_KEY); this.db = buildDemo(); this._write(); }
  // Fuqarolardan yangi ariza kelishini taqlid qiladi (faqat demo)
  startSim(ms = 70000) {
    this.stopSim();
    this.sim = setInterval(() => this.simulateIncoming(), ms);
  }
  stopSim() { if (this.sim) clearInterval(this.sim); this.sim = null; }
  simulateIncoming(forceOrg) {
    const d = this.db, R = Math.random, now = Date.now();
    let [cat, region] = NEW_REPORT_POOL[Math.floor(R() * NEW_REPORT_POOL.length)];
    if (forceOrg) { const o = d.orgs.find(x => x.id === forceOrg); if (o && o.region) region = o.region; if (o) cat = o.categories[Math.floor(R() * o.categories.length)]; }
    const reg = regionOf(region), cit = d.profiles.filter(p => p.role === 'user')[Math.floor(R() * CITIZENS.length)];
    const id = 'r' + (++d.seq);
    const org = d.settings.auto_assign ? routeOrg(d.orgs, cat, region) : null;
    const r = { id, case_no: 'ECO-' + String(d.seq).padStart(6, '0'), user_id: cit.id, description: DEMO_TEXTS[cat][Math.floor(R() * DEMO_TEXTS[cat].length)], category: cat, region,
      address: reg.d[Math.floor(R() * reg.d.length)] + ', ' + (1 + Math.floor(R() * 60)) + '-uy yoni', lat: +(reg.lat + (R() - .5) * .1).toFixed(5), lng: +(reg.lng + (R() - .5) * .12).toFixed(5),
      location_text: null, media_type: 'image', media_path: null, status: 0, priority: R() < .15 ? 2 : 0, org_id: org, assignee_id: null,
      created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(), deadline_at: new Date(now + (d.settings.sla_days[cat] || 15) * DAY).toISOString(),
      accepted_at: null, admin_note: null, reject_reason: null, proof_path: null, extend_count: 0, cancelled: false, cancelled_at: null, edited_at: null, status_changed_at: null, resolved_at: null };
    d.reports.push(r);
    d.history.push({ id: ++d.hid, report_id: id, event: 'created', status: 0, note: null, actor: null, created_at: r.created_at });
    if (org) d.history.push({ id: ++d.hid, report_id: id, event: 'org', status: null, note: d.orgs.find(o => o.id === org).name, actor: null, created_at: r.created_at });
    this._write();
    this._emit({ type: 'new', id, visible: this._canSee(r) });
    return r;
  }
}

// =====================================================================
// SUPABASE (jonli rejim)
// =====================================================================
class LiveStore {
  constructor(sb) { this.mode = 'live'; this.sb = sb; this.listeners = []; this.urlCache = {}; }
  async init() {
    const { data: { session } } = await this.sb.auth.getSession();
    if (!session) return null;
    try { return await this._loadMe(session.user.id); } catch (e) { await this.sb.auth.signOut(); return null; }
  }
  async _loadMe(uid) {
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', uid).single();
    if (error) throw error;
    if (!PORTAL_ROLES.includes(data.role)) { await this.sb.auth.signOut(); throw new Error('Bu hisobga portalga kirish huquqi berilmagan. Vazirlik administratoriga murojaat qiling.'); }
    if (isAgentRole(data.role) && !data.org_id) { await this.sb.auth.signOut(); throw new Error('Hisobingiz hali idoraga biriktirilmagan.'); }
    if (data.blocked) { await this.sb.auth.signOut(); throw new Error('Hisobingiz bloklangan'); }
    this.me = data; return data;
  }
  demoAccounts() { return []; }
  async login(email, pass) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'Email yoki parol noto‘g‘ri' : error.message);
    return this._loadMe(data.user.id);
  }
  async logout() { await this.sb.auth.signOut(); this.me = null; }
  async _all(q) { const { data, error } = await q; if (error) throw error; return data || []; }
  async load() {
    const sb = this.sb;
    const [orgs, profiles, reports, history, templates, settingsRows] = await Promise.all([
      this._all(sb.from('organizations').select('*').order('created_at')),
      this._all(sb.from('profiles').select('id,full_name,email,phone,role,org_id,position,blocked,created_at')),
      this._all(sb.from('reports').select('*').order('created_at', { ascending: false }).limit(5000)),
      this._all(sb.from('report_status_history').select('*').order('created_at', { ascending: false }).limit(4000)),
      this._all(sb.from('response_templates').select('*').order('created_at')),
      this._all(sb.from('app_settings').select('key,value'))
    ]);
    this.profilesById = Object.fromEntries(profiles.map(p => [p.id, p]));
    const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    settingsRows.forEach(r => { settings[r.key] = r.value; });
    return { me: this.me, orgs, profiles: profiles.filter(p => p.role !== 'user'), reports: reports.map(r => this._norm(r)), history, templates, settings };
  }
  _norm(r) { const c = this.profilesById && this.profilesById[r.user_id]; return Object.assign({}, r, { citizen: c ? { id: c.id, name: c.full_name, phone: c.phone, blocked: !!c.blocked } : null }); }
  async mediaUrl(r, kind) {
    const path = kind === 'proof' ? r.proof_path : (r.media_type === 'image' ? r.media_path : null);
    if (!path) return null;
    const c = this.urlCache[path]; if (c && c.exp > Date.now()) return c.url;
    const { data, error } = await this.sb.storage.from(window.ECO_CONFIG.MEDIA_BUCKET || 'report-media').createSignedUrl(path, 3600);
    if (error) return null;
    this.urlCache[path] = { url: data.signedUrl, exp: Date.now() + 3300e3 };
    return data.signedUrl;
  }
  async comments(id) { return this._all(this.sb.from('report_comments').select('*').eq('report_id', id).order('created_at')); }
  async updateReport(id, patch) {
    const { data, error } = await this.sb.from('reports').update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return this._norm(data);
  }
  async forward(id, orgId, reason) {
    const { error } = await this.sb.rpc('forward_report', { p_report: id, p_org: orgId, p_reason: reason || '' });
    if (error) throw new Error(error.message);
  }
  async addComment(id, body) {
    const { data, error } = await this.sb.from('report_comments').insert({ report_id: id, body: String(body).trim(), author: this.me.id }).select().single();
    if (error) throw new Error(error.message); return data;
  }
  async uploadProof(id, file) {
    const blob = await shrinkImage(file);
    const path = 'proof/' + id + '/' + Date.now() + '.jpg';
    const { error } = await this.sb.storage.from(window.ECO_CONFIG.MEDIA_BUCKET || 'report-media').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    return this.updateReport(id, { proof_path: path });
  }
  async saveOrg(o) {
    const row = { name: o.name, short_name: o.short_name, region: o.region || null, categories: o.categories, head: o.head, phone: o.phone, email: o.email, address: o.address, active: o.active };
    const q = o.id ? this.sb.from('organizations').update(row).eq('id', o.id) : this.sb.from('organizations').insert(row);
    const { error } = await q; if (error) throw new Error(error.message);
  }
  async saveProfile(p) {
    if (!p.id) throw new Error('Yangi xodimni avval Supabase → Authentication → Users bo‘limida yarating, keyin bu yerda unga idora va rol tanlang.');
    const row = { full_name: p.full_name, role: p.role, org_id: isAgentRole(p.role) ? p.org_id : null, position: p.position, blocked: !!p.blocked };
    const { error } = await this.sb.from('profiles').update(row).eq('id', p.id); if (error) throw new Error(error.message);
  }
  async setBlocked(userId, blocked) {
    const { error } = await this.sb.from('profiles').update({ blocked: !!blocked }).eq('id', userId).eq('role', 'user'); if (error) throw new Error(error.message);
  }
  async saveTemplate(t) {
    const row = { org_id: t.org_id || null, title: t.title, body: t.body };
    const q = t.id ? this.sb.from('response_templates').update(row).eq('id', t.id) : this.sb.from('response_templates').insert(row);
    const { error } = await q; if (error) throw new Error(error.message);
  }
  async deleteTemplate(id) { const { error } = await this.sb.from('response_templates').delete().eq('id', id); if (error) throw new Error(error.message); }
  async loadEvents() {
    const ev = await this._all(this.sb.from('eco_events').select('*').order('starts_at', { ascending: false }).limit(500));
    if (ev.length) {
      const { data } = await this.sb.rpc('event_counts', { p_ids: ev.map(e => e.id) });
      const c = Object.fromEntries((data || []).map(r => [r.event_id, Number(r.going)]));
      ev.forEach(e => { e.going = c[e.id] || 0; });
    }
    return ev;
  }
  async saveEvent(e) {
    const row = {};
    ['title', 'description', 'type', 'region', 'place', 'lat', 'lng', 'starts_at', 'ends_at', 'organizer', 'contact', 'link', 'max_people', 'org_id', 'status'].forEach(k => { row[k] = e[k] === '' || e[k] === undefined ? null : e[k]; });
    const q = e.id ? this.sb.from('eco_events').update(row).eq('id', e.id) : this.sb.from('eco_events').insert(row);
    const { error } = await q; if (error) throw new Error(error.message);
  }
  async deleteEvent(id) { const { error } = await this.sb.from('eco_events').delete().eq('id', id); if (error) throw new Error(error.message); }
  async saveSettings(s) {
    const rows = Object.entries(s).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await this.sb.from('app_settings').upsert(rows); if (error) throw new Error(error.message);
  }
  logContactView() { }
  onChange(cb) {
    this.listeners.push(cb);
    if (this.channel) return;
    this.channel = this.sb.channel('portal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, p => this._emit({ type: 'new', id: p.new.id, visible: true }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, p => this._emit({ type: 'report', id: p.new.id }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'report_comments' }, p => this._emit({ type: 'comment', id: p.new.report_id }))
      .subscribe();
  }
  _emit(e) { this.listeners.forEach(cb => { try { cb(e); } catch (err) { console.error(err); } }); }
  startSim() { } stopSim() { }
}
