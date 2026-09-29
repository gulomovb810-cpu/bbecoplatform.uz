/* =====================================================================
   bbecoplatform.uz — v2 imkoniyatlari (mobil ilova)
   1. Ovozli murojaat (MediaRecorder + nutqni matnga aylantirish)
   2. AI foto tahlili (Supabase Edge Function "eco-ai" → Claude)
   3. Qonunni ariza oqimiga bog'lash (kategoriya → tegishli moddalar)
   4. Maxfiy (whistleblower) murojaat — identity-blind
   5. Transchegaraviy belgi
   6. Shaffoflik: kompensatsiya/jarimalar → loyihalar, ovoz berish, taklif
   7. Natijaga asoslangan eko-reyting
   8. AI yordamchi: rasm bilan savol, server orqali
   Asosiy ilova (index.html) dagi `app` obyektini kengaytiradi.
   ===================================================================== */
(function () {
  'use strict';
  if (typeof app === 'undefined') return;

  // ------------------------------------------------------------------
  // Tarjimalar
  // ------------------------------------------------------------------
  const P = {
    uz: {
      voice_start: '🎙️ Ovoz bilan aytib berish', voice_stop: '⏹ To‘xtatish', voice_rec: 'Yozilmoqda… {s} s',
      voice_no_mic: 'Mikrofonga ruxsat berilmadi yoki qurilma qo‘llab-quvvatlamaydi.',
      voice_no_stt: 'Ovoz yozildi. Bu brauzer nutqni matnga aylantira olmaydi — ovozli yozuvni operator tinglaydi.',
      voice_done: 'Ovozli xabar biriktirildi ✓', voice_only_desc: '🎙️ Ovozli murojaat (matnni operator yozuvdan kiritadi)',
      ai_loading: '🤖 AI rasmni tahlil qilmoqda…', ai_title: '🤖 AI tahlili', ai_conf: 'ishonch', ai_apply_cat: 'Kategoriya sifatida tanlash',
      ai_apply_desc: 'Tavsifga qo‘shish', ai_not_env: 'Rasmda ekologik muammo aniq ko‘rinmadi. Muammo yaxshiroq ko‘rinadigan foto olishni tavsiya qilamiz.',
      ai_sev: ['', 'Kichik', 'O‘rta', 'Jiddiy'], ai_badge: 'AI tavsiyasi', ai_applied: 'Qo‘llandi ✓',
      legal_title: '⚖️ Sizning huquqingiz shu normalarga asoslanadi', legal_more: 'To‘liq o‘qish ›', legal_search: 'lex.uz’da ko‘rish ↗',
      legal_air: 'Atmosfera havosini muhofaza qilish to‘g‘risidagi Qonun', legal_art: '{n}-modda',
      legal_note: 'Arizangizga shu huquqiy asoslar biriktiriladi va mas’ul tashkilotga ko‘rsatiladi.',
      anon_mode: '🕶️ Maxfiy rejim', anon_review: '🕶️ Maxfiy murojaat — ismingiz, telefoningiz va hisobingiz yuborilmaydi.',
      anon_video_warn: 'Maxfiy rejimda video metama’lumotlarini o‘chirib bo‘lmaydi — foto yuborish xavfsizroq.',
      anon_token_t: 'Kuzatuv kodingiz', anon_token_d: 'Bu kodni saqlab qo‘ying — u faqat hozir bir marta ko‘rsatiladi. Kod bo‘lmasa, arizaning holatini hech kim (siz ham) bog‘lay olmaydi.',
      anon_copy: '📋 Kodni nusxalash', anon_copied: 'Nusxalandi ✓', anon_not_found: 'Bu kod bo‘yicha murojaat topilmadi.',
      anon_disabled: 'Maxfiy murojaat vaqtincha o‘chirilgan.', anon_err: 'Yuborib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.',
      track_status: 'Holat', track_reply: 'Mas’ul tashkilot javobi', track_rejected: 'Murojaat asossiz deb topildi.',
      rejected_note: 'Murojaat asossiz deb topildi', tb_chip: '🌐 Transchegaraviy', voice_chip: '🎙️ Ovozli xabar', ai_line: '🤖 AI: {c} · {p}%',
      ledger_collected: 'Yig‘ilgan (kompensatsiya, jarima)', ledger_allocated: 'Loyihalarga ajratilgan', ledger_spent: 'Sarflangan',
      ledger_used: 'Yig‘ilgan mablag‘ning {p}% i loyihalarga ajratilgan', ledger_empty: 'Bu hudud bo‘yicha hali ma’lumot kiritilmagan.',
      ledger_all: 'Butun respublika', ledger_budget: 'Byudjet', ledger_vote: '👍 {n}', ledger_vote_login: 'Ovoz berish uchun ro‘yxatdan o‘ting.',
      ledger_src: { compensation: 'Kompensatsiya to‘lovlari', fine: 'Jarimalar', budget: 'Davlat byudjeti', grant: 'Grantlar', other: 'Boshqa' },
      ledger_status: { proposed: 'Taklif', approved: 'Tasdiqlangan', in_progress: 'Amalga oshirilmoqda', done: 'Yakunlangan', cancelled: 'Bekor qilingan' },
      ledger_law: 'Qonuniy asos: Atmosfera havosini muhofaza qilish to‘g‘risidagi Qonun, 25-modda — kompensatsiya to‘lovlari. ',
      ledger_sent: 'Taklifingiz qabul qilindi. Rahmat!', ledger_short: 'Taklifni batafsilroq yozing (kamida 10 belgi).',
      ledger_demo: '🧪 Namunaviy ma’lumotlar (Supabase ulanmagan)', ledger_doc: 'Hujjat ↗',
      rating_resolved: 'hal qilingan', rating_of: 'dan', rating_days: 'o‘rtacha {d} kun', rating_empty: 'Hozircha ma’lumot yo‘q.',
      rating_users_empty: 'Reytingda hali hech kim yo‘q. “Mening natijam” bo‘limida ko‘rinishni yoqing.',
      rating_points: 'ball', rating_in_work: 'ishga olingan', rating_total: 'jami murojaat', rating_show: 'Reytingda ismim ko‘rinsin (ism va familiyaning bosh harfi)',
      rating_guest: 'Reytingda qatnashish uchun ro‘yxatdan o‘ting.',
      badges: [['🌱', 'Birinchi natija', '1 ta murojaat hal qilindi', 'resolved', 1], ['🌿', 'Faol fuqaro', '5 ta murojaat hal qilindi', 'resolved', 5],
        ['🌳', 'Eko-qahramon', '20 ta murojaat hal qilindi', 'resolved', 20], ['🧭', 'Ko‘p qirrali', '3 xil turdagi muammo hal qilindi', 'categories', 3]],
      ai_photo_q: 'Bu rasmda qanday ekologik muammo bor?', ai_err: 'AI javob bera olmadi. Birozdan so‘ng qayta urinib ko‘ring.',
      ai_login: 'AI yordamchidan foydalanish uchun hisobingizga kiring yoki mehmon sifatida kiring.'
    },
    ru: {
      voice_start: '🎙️ Рассказать голосом', voice_stop: '⏹ Остановить', voice_rec: 'Идёт запись… {s} с',
      voice_no_mic: 'Нет доступа к микрофону или устройство не поддерживается.',
      voice_no_stt: 'Голос записан. Этот браузер не умеет переводить речь в текст — запись прослушает оператор.',
      voice_done: 'Голосовое сообщение прикреплено ✓', voice_only_desc: '🎙️ Голосовое обращение (текст внесёт оператор по записи)',
      ai_loading: '🤖 ИИ анализирует фото…', ai_title: '🤖 Анализ ИИ', ai_conf: 'уверенность', ai_apply_cat: 'Выбрать категорию',
      ai_apply_desc: 'Добавить в описание', ai_not_env: 'На фото не видно явной экологической проблемы. Сделайте снимок, где проблема видна лучше.',
      ai_sev: ['', 'Незначительная', 'Средняя', 'Серьёзная'], ai_badge: 'Совет ИИ', ai_applied: 'Применено ✓',
      legal_title: '⚖️ Ваше право основано на этих нормах', legal_more: 'Читать полностью ›', legal_search: 'Смотреть на lex.uz ↗',
      legal_air: 'Закон об охране атмосферного воздуха', legal_art: 'Статья {n}',
      legal_note: 'Эти правовые основания прикрепляются к заявке и видны ответственной организации.',
      anon_mode: '🕶️ Анонимный режим', anon_review: '🕶️ Анонимное обращение — имя, телефон и аккаунт не передаются.',
      anon_video_warn: 'В анонимном режиме метаданные видео не удаляются — безопаснее отправить фото.',
      anon_token_t: 'Ваш код отслеживания', anon_token_d: 'Сохраните код — он показывается только один раз. Без него никто (и вы тоже) не сможет связать заявку с вами.',
      anon_copy: '📋 Скопировать код', anon_copied: 'Скопировано ✓', anon_not_found: 'Обращение с таким кодом не найдено.',
      anon_disabled: 'Анонимные обращения временно отключены.', anon_err: 'Не удалось отправить. Проверьте интернет и попробуйте снова.',
      track_status: 'Статус', track_reply: 'Ответ ответственной организации', track_rejected: 'Обращение признано необоснованным.',
      rejected_note: 'Обращение признано необоснованным', tb_chip: '🌐 Трансграничное', voice_chip: '🎙️ Голосовое', ai_line: '🤖 ИИ: {c} · {p}%',
      ledger_collected: 'Собрано (компенсации, штрафы)', ledger_allocated: 'Выделено на проекты', ledger_spent: 'Израсходовано',
      ledger_used: '{p}% собранных средств направлено на проекты', ledger_empty: 'По этому региону данных пока нет.',
      ledger_all: 'Вся республика', ledger_budget: 'Бюджет', ledger_vote: '👍 {n}', ledger_vote_login: 'Чтобы голосовать, зарегистрируйтесь.',
      ledger_src: { compensation: 'Компенсационные платежи', fine: 'Штрафы', budget: 'Госбюджет', grant: 'Гранты', other: 'Другое' },
      ledger_status: { proposed: 'Предложение', approved: 'Утверждён', in_progress: 'Реализуется', done: 'Завершён', cancelled: 'Отменён' },
      ledger_law: 'Правовая основа: Закон об охране атмосферного воздуха, статья 25 — компенсационные платежи. ',
      ledger_sent: 'Предложение принято. Спасибо!', ledger_short: 'Опишите подробнее (минимум 10 символов).',
      ledger_demo: '🧪 Демонстрационные данные (Supabase не подключён)', ledger_doc: 'Документ ↗',
      rating_resolved: 'решено', rating_of: 'из', rating_days: 'в среднем {d} дн.', rating_empty: 'Данных пока нет.',
      rating_users_empty: 'В рейтинге пока никого нет. Включите отображение в разделе «Мой результат».',
      rating_points: 'баллов', rating_in_work: 'в работе', rating_total: 'всего обращений', rating_show: 'Показывать меня в рейтинге (имя и инициал фамилии)',
      rating_guest: 'Чтобы участвовать в рейтинге, зарегистрируйтесь.',
      badges: [['🌱', 'Первый результат', 'Решено 1 обращение', 'resolved', 1], ['🌿', 'Активный гражданин', 'Решено 5 обращений', 'resolved', 5],
        ['🌳', 'Эко-герой', 'Решено 20 обращений', 'resolved', 20], ['🧭', 'Разносторонний', 'Решены проблемы 3 типов', 'categories', 3]],
      ai_photo_q: 'Какая экологическая проблема на этом фото?', ai_err: 'ИИ не смог ответить. Попробуйте чуть позже.',
      ai_login: 'Чтобы пользоваться ИИ-помощником, войдите в аккаунт или как гость.'
    }
  };
  const T = (k) => (P[app.lang] && P[app.lang][k] !== undefined ? P[app.lang][k] : P.uz[k]);
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
  const h = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const catLabel = (c) => ((CAT_LABEL[app.lang] || {})[c]) || c;

  // Statik (data-i18n) matnlarning ruscha tarjimasi — o'zbekchasi HTML'dan olinadi
  Object.assign(LANG.ru, {
    card_anon_t: 'Анонимное обращение', card_anon_d: 'Ваше имя никто не увидит',
    card_ledger_t: 'Прозрачность', card_ledger_d: 'Куда потрачены штрафы и компенсации',
    card_rating_t: 'Эко-рейтинг', card_rating_d: 'По реально решённым обращениям',
    voice_start: P.ru.voice_start, voice_hint: 'Трудно писать? Расскажите голосом — переведём в текст, а запись приложим к заявке.',
    voice_delete: 'Удалить', skip_photo: 'Продолжить без фото (есть голосовое сообщение)',
    rev_ai: 'Анализ ИИ', rev_voice: 'Голосовое', rev_voice_v: '🎙️ Прикреплено', rev_legal: 'Правовая основа',
    tb_title: '🌐 Проблема связана с соседней страной', tb_desc: 'Общая река или канал, пыльно-солевые бури, загрязнение в приграничье (Казахстан, Кыргызстан, Таджикистан, Туркменистан, Афганистан)',
    anon_hero_t: 'Ваша личность останется неизвестной', anon_hero_d: 'Сообщайте безопасно, даже если виновен работодатель или влиятельный человек.',
    anon_g1: 'К заявке не привязываются имя, телефон или аккаунт — их не видит даже администратор.',
    anon_g2: 'Скрытые данные фото (EXIF, GPS, модель устройства) удаляются перед отправкой.',
    anon_g3: 'Вы получите код отслеживания, который показывается один раз — статус узнаёте по нему.',
    anon_g4: 'В анонимном режиме анализ ИИ не используется — фото не передаётся третьим лицам.',
    anon_fuzz_t: 'Отправить местоположение с точностью ~500 м', anon_fuzz_d: 'Оставьте включённым, если точная точка может вас выдать.',
    anon_contact_t: 'Зашифрованный контакт (необязательно)', anon_contact_ph: 'Телефон или email',
    anon_contact_d: 'Шифруется на вашем телефоне. Открыть его может только юрист с особым ключом — при законной необходимости.',
    anon_start: 'Начать анонимное обращение', anon_track_t: 'ОТСЛЕЖИВАНИЕ ПО КОДУ',
    ledger_projects: 'ПРОЕКТЫ', ledger_suggest_t: 'ПРЕДЛОЖИТЬ ПРОЕКТ', ledger_suggest_ph: 'На какой экологический проект в вашем районе стоит направить средства?',
    ledger_suggest_btn: 'Отправить предложение',
    rating_regions: 'Регионы', rating_users: 'Граждане', rating_me: 'Мой результат',
    rating_rule: 'Баллы начисляются только за обращения, решение которых подтвердила ответственная организация: решено — 10 баллов, взято в работу — 2 балла. Необоснованные и отменённые не учитываются.'
  });

  // ------------------------------------------------------------------
  // Yordamchilar
  // ------------------------------------------------------------------
  const setting = (k, def) => (app.settings && app.settings[k] !== undefined && app.settings[k] !== null ? app.settings[k] : def);
  let anonClient = null; // sessiyasiz mijoz: maxfiy murojaat hech qachon hisob tokeni bilan yuborilmaydi
  function anonSb() {
    if (!SUPABASE_READY) return null;
    if (!anonClient) {
      anonClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'eco-anon-no-session' }
      });
    }
    return anonClient;
  }
  async function session() {
    if (!SUPABASE_READY) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session;
  }
  function randId(n = 12) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); }

  /** Rasmni qayta chizish: o'lchamni kichraytiradi va EXIF/GPS metama'lumotlarini butunlay olib tashlaydi */
  function reencode(file, max, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? resolve({ blob: b, dataUrl: c.toDataURL('image/jpeg', quality) }) : reject(new Error('encode'))), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }
  const b64 = (dataUrl) => dataUrl.slice(dataUrl.indexOf(',') + 1);

  function fmtMoney(n) {
    n = Number(n) || 0;
    const ru = app.lang === 'ru';
    if (n >= 1e9) return (n / 1e9).toLocaleString(ru ? 'ru-RU' : 'uz-UZ', { maximumFractionDigits: 2 }) + (ru ? ' млрд сум' : ' mlrd so‘m');
    if (n >= 1e6) return (n / 1e6).toLocaleString(ru ? 'ru-RU' : 'uz-UZ', { maximumFractionDigits: 1 }) + (ru ? ' млн сум' : ' mln so‘m');
    return n.toLocaleString(ru ? 'ru-RU' : 'uz-UZ') + (ru ? ' сум' : ' so‘m');
  }

  // ------------------------------------------------------------------
  // 3. QONUN ↔ ARIZA
  // ------------------------------------------------------------------
  const OTHER_LAWS = {
    chiqindi: { uz: '“Chiqindilar to‘g‘risida”gi Qonun', ru: 'Закон «Об отходах»' },
    suv: { uz: '“Suv va suvdan foydalanish to‘g‘risida”gi Qonun', ru: 'Закон «О воде и водопользовании»' },
    osimlik: { uz: '“O‘simlik dunyosini muhofaza qilish va undan foydalanish to‘g‘risida”gi Qonun', ru: 'Закон «Об охране и использовании растительного мира»' },
    yer: { uz: 'O‘zbekiston Respublikasining Yer kodeksi', ru: 'Земельный кодекс Республики Узбекистан' },
    tabiat: { uz: '“Tabiatni muhofaza qilish to‘g‘risida”gi Qonun', ru: 'Закон «Об охране природы»' }
  };
  // Havo qonuni (ilovadagi to'liq matn) moddalari va boshqa tegishli qonunlar
  const LEGAL = {
    Havo: { arts: ['4', '7', '8', '13', '29'], laws: [] },
    Chiqindi: { arts: ['21', '4'], laws: ['chiqindi'] },
    Suv: { arts: [], laws: ['suv', 'tabiat'] },
    Daraxt: { arts: [], laws: ['osimlik', 'tabiat'] },
    Tuproq: { arts: [], laws: ['yer', 'tabiat'] },
    Boshqa: { arts: [], laws: ['tabiat'] }
  };
  const lawArt = (n) => LAW.arts.find((a) => a.n === n && !a.repealed);
  function legalRefsFor(cat) {
    const L = LEGAL[cat]; if (!L) return [];
    return L.arts.filter(lawArt).map((n) => '353-I:' + n).concat(L.laws.map((k) => 'law:' + k));
  }
  function refLabel(ref) {
    if (ref.startsWith('353-I:')) { const n = ref.slice(6); return fill(T('legal_art'), { n }); }
    if (ref.startsWith('law:')) { const l = OTHER_LAWS[ref.slice(4)]; return l ? (l[app.lang] || l.uz) : ref; }
    return ref;
  }
  function refChip(ref) {
    if (ref.startsWith('353-I:')) return `<button class="law-chip" onclick="app.openLawArt('${h(ref.slice(6))}')">⚖️ ${h(refLabel(ref))}</button>`;
    const l = OTHER_LAWS[ref.slice(4)]; if (!l) return '';
    return `<a class="law-chip" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent('site:lex.uz ' + l.uz)}">📜 ${h(l[app.lang] || l.uz)}</a>`;
  }
  function renderLegal() {
    const box = $('legalCard'), cat = app.draft.category, L = LEGAL[cat];
    if (!L) { box.style.display = 'none'; return; }
    const arts = L.arts.map(lawArt).filter(Boolean).slice(0, 3);
    const excerpt = (a) => { const t = a.p.slice(0, 2).join(' '); return t.length > 190 ? t.slice(0, 187) + '…' : t; };
    box.innerHTML = `<b class="legal-h">${h(T('legal_title'))}</b>` +
      arts.map((a) => `<div class="legal-item" onclick="app.openLawArt('${h(a.n)}')"><div class="legal-n">${h(fill(T('legal_art'), { n: a.n }))} · ${h(T('legal_air'))}</div>
        <div class="legal-t">${h(a.t)}</div><div class="legal-x">${h(excerpt(a))}</div><div class="legal-more">${h(T('legal_more'))}</div></div>`).join('') +
      L.laws.map((k) => `<div class="legal-item"><div class="legal-t">📜 ${h(OTHER_LAWS[k][app.lang] || OTHER_LAWS[k].uz)}</div>
        <a class="legal-more" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent('site:lex.uz ' + OTHER_LAWS[k].uz)}">${h(T('legal_search'))}</a></div>`).join('') +
      `<p class="mini-note">${h(T('legal_note'))}</p>`;
    box.style.display = 'block';
  }
  app.openLawArt = function (n) {
    const cur = document.querySelector('.screen.active');
    this._lawReturn = cur ? cur.id.replace('screen-', '') : 'info';
    this.lawOpen = { [n]: true }; this.lawAll = false;
    const s = $('lawSearch'); if (s) s.value = '';
    this.goto('law');
    setTimeout(() => {
      const el = Array.from(document.querySelectorAll('#lawList .art')).find((x) => x.querySelector('.art-n').textContent === n + '-modda');
      if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('art-flash'); setTimeout(() => el.classList.remove('art-flash'), 1600); }
    }, 60);
  };
  app.lawBack = function () { const r = this._lawReturn; this._lawReturn = null; this.goto(r && r !== 'law' ? r : 'info'); };

  // ------------------------------------------------------------------
  // 1. OVOZLI MUROJAAT
  // ------------------------------------------------------------------
  const voice = { rec: null, stt: null, chunks: [], timer: null, secs: 0, base: '' };
  app.toggleVoice = async function () {
    if (voice.rec && voice.rec.state === 'recording') { stopVoice(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { $('voiceStatus').textContent = T('voice_no_mic'); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { $('voiceStatus').textContent = T('voice_no_mic'); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
    voice.chunks = []; voice.secs = 0; voice.base = $('descInput').value.trim();
    voice.rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    voice.rec.ondataavailable = (e) => { if (e.data.size) voice.chunks.push(e.data); };
    voice.rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = voice.rec.mimeType || mime || 'audio/webm';
      const blob = new Blob(voice.chunks, { type });
      const ext = /mp4/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm';
      app.draft.audio = { blob, type: type.split(';')[0], ext };
      const a = $('voiceAudio'); a.src = URL.createObjectURL(blob); $('voiceRec').style.display = 'flex';
      $('descNext').disabled = false;
      if (!$('voiceStatus').dataset.stt) $('voiceStatus').textContent = window.SpeechRecognition || window.webkitSpeechRecognition ? T('voice_done') : T('voice_no_stt');
      updateSkipPhoto();
    };
    voice.rec.start();
    $('voiceBtnLbl').textContent = T('voice_stop'); $('voiceBtn').classList.add('recording');
    $('voiceStatus').dataset.stt = '';
    voice.timer = setInterval(() => { voice.secs++; $('voiceStatus').textContent = fill(T('voice_rec'), { s: voice.secs }); if (voice.secs >= 120) stopVoice(); }, 1000);
    // Nutqni matnga aylantirish (qurilma qo'llasa)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        voice.stt = new SR(); voice.stt.lang = app.lang === 'ru' ? 'ru-RU' : 'uz-UZ'; voice.stt.continuous = true; voice.stt.interimResults = true;
        let finalText = '';
        voice.stt.onresult = (ev) => {
          let interim = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript + ' '; else interim += ev.results[i][0].transcript;
          }
          const ta = $('descInput'); ta.value = (voice.base ? voice.base + ' ' : '') + (finalText + interim).trim();
          ta.dispatchEvent(new Event('input')); $('voiceStatus').dataset.stt = '1';
        };
        voice.stt.onerror = () => {}; voice.stt.start();
      } catch (e) { voice.stt = null; }
    }
  };
  function stopVoice() {
    clearInterval(voice.timer);
    if (voice.stt) { try { voice.stt.stop(); } catch (e) {} voice.stt = null; }
    if (voice.rec && voice.rec.state === 'recording') voice.rec.stop();
    $('voiceBtnLbl').textContent = T('voice_start'); $('voiceBtn').classList.remove('recording');
  }
  app.clearVoice = function () {
    stopVoice(); delete this.draft.audio; $('voiceRec').style.display = 'none'; $('voiceAudio').removeAttribute('src');
    $('voiceStatus').textContent = LANG[this.lang] && LANG[this.lang].voice_hint || LANG.uz.voice_hint;
    $('descNext').disabled = $('descInput').value.trim().length < 5; updateSkipPhoto();
  };
  function updateSkipPhoto() { const b = $('skipPhotoBtn'); if (b) b.style.display = app.draft.audio && !app.draft.mediaName ? 'flex' : 'none'; }
  app.toStep2 = function () {
    stopVoice();
    const txt = $('descInput').value.trim();
    this.draft.description = txt.length >= 5 ? txt : (this.draft.audio ? (txt ? txt + ' — ' : '') + T('voice_only_desc') : '');
    if (!this.draft.description) return;
    this.draftInProgress = true; this.goto('report-2');
  };

  // ------------------------------------------------------------------
  // 8a. AI FOTO TAHLILI
  // ------------------------------------------------------------------
  function aiAllowed() { return SUPABASE_READY && !app.draft.anonymous && setting('ai_enabled', true) !== false; }
  async function classifyPhoto(file) {
    const card = $('aiCard');
    if (!aiAllowed() || !file.type.startsWith('image/')) { card.style.display = 'none'; return; }
    const s = await session(); if (!s) { card.style.display = 'none'; return; }
    const token = (app._aiSeq = (app._aiSeq || 0) + 1);
    card.innerHTML = `<div class="ai-loading">${h(T('ai_loading'))}</div>`; card.style.display = 'block';
    try {
      const { dataUrl } = await reencode(file, 1024, 0.8);
      const { data, error } = await sb.functions.invoke('eco-ai', { body: { mode: 'classify', image: { media_type: 'image/jpeg', data: b64(dataUrl) }, hint: app.draft.description || '' } });
      if (token !== app._aiSeq) return;
      if (error || !data || !data.ok) { card.style.display = 'none'; return; }
      const r = data.result;
      app.draft.ai = { category: r.category, confidence: r.confidence, summary: app.lang === 'ru' ? r.summary_ru : r.summary_uz, severity: r.severity, env: r.is_environmental, suggested: r.suggested_description };
      renderAiCard();
    } catch (e) { card.style.display = 'none'; }
  }
  function renderAiCard() {
    const a = app.draft.ai, card = $('aiCard'); if (!a) { card.style.display = 'none'; return; }
    const conf = Math.round(a.confidence);
    card.innerHTML = `<div class="ai-h">${h(T('ai_title'))}</div>
      <div class="ai-res"><span class="ai-cat">${CAT_ICON[a.category] || ''} ${h(catLabel(a.category))}</span><span class="ai-conf">${conf}% ${h(T('ai_conf'))}</span></div>
      <div class="ai-bar"><i style="width:${conf}%"></i></div>
      ${a.summary ? `<p class="ai-sum">${h(a.summary)}</p>` : ''}
      ${a.severity ? `<span class="sev sev${a.severity}">${h(T('ai_sev')[a.severity])}</span>` : ''}
      ${a.env === false ? `<p class="ai-warn">${h(T('ai_not_env'))}</p>` : ''}
      <div class="ai-actions"><button class="btn btn-outline ai-btn" id="aiApplyCat" onclick="app.aiApplyCat()">${h(T('ai_apply_cat'))}</button>
      ${a.suggested ? `<button class="btn btn-outline ai-btn" id="aiApplyDesc" onclick="app.aiApplyDesc()">${h(T('ai_apply_desc'))}</button>` : ''}</div>`;
    card.style.display = 'block';
  }
  function selectCat(v) {
    document.querySelectorAll('#catGrid .cat').forEach((c) => c.classList.toggle('sel', c.dataset.v === v));
    app.draft.category = v; $('catNext').disabled = false; renderLegal();
  }
  app.aiApplyCat = function () { if (!this.draft.ai) return; selectCat(this.draft.ai.category); const b = $('aiApplyCat'); if (b) { b.textContent = T('ai_applied'); b.disabled = true; } };
  app.aiApplyDesc = function () {
    const a = this.draft.ai; if (!a || !a.suggested) return;
    const ta = $('descInput'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + a.suggested; this.draft.description = ta.value.trim();
    const b = $('aiApplyDesc'); if (b) { b.textContent = T('ai_applied'); b.disabled = true; }
  };
  function markAiBadge() {
    document.querySelectorAll('#catGrid .ai-badge').forEach((x) => x.remove());
    const a = app.draft.ai; if (!a) return;
    const el = document.querySelector(`#catGrid .cat[data-v="${a.category}"]`);
    if (el) el.insertAdjacentHTML('beforeend', `<em class="ai-badge">🤖 ${h(T('ai_badge'))} · ${Math.round(a.confidence)}%</em>`);
    if (!app.draft.category && a.confidence >= 70 && a.env !== false) selectCat(a.category);
  }

  // ------------------------------------------------------------------
  // Asosiy ilova metodlarini kengaytirish
  // ------------------------------------------------------------------
  const _goto = app.goto, _resetDraft = app.resetDraft, _onMedia = app.onMedia, _renderReview = app.renderReview,
    _openCase = app.openCase, _fromRow = app.fromRow, _renderHome = app.renderHome, _applyLang = app.applyLang, _sendAI = app.sendAI;

  app.goto = function (id) {
    _goto.call(this, id);
    if (id === 'report-4') { markAiBadge(); renderLegal(); }
    if (id === 'report-3') { updateSkipPhoto(); $('aiCard').style.display = this.draft.ai ? 'block' : 'none'; anonVideoNote(); }
    if (id === 'anon') renderAnon();
    if (id === 'ledger') loadLedger();
    if (id === 'rating') loadRating();
  };
  app.resetDraft = function () {
    stopVoice();
    _resetDraft.call(this);
    document.body.classList.remove('anon-mode');
    $('voiceRec').style.display = 'none'; $('voiceAudio').removeAttribute('src');
    $('voiceStatus').textContent = (LANG[this.lang] && LANG[this.lang].voice_hint) || LANG.uz.voice_hint;
    $('aiCard').style.display = 'none'; $('aiCard').innerHTML = ''; $('legalCard').style.display = 'none';
    $('tbCheck').checked = false; updateSkipPhoto();
    document.querySelectorAll('#catGrid .ai-badge').forEach((x) => x.remove());
    const d = $('doneToken'); if (d) d.remove();
    const sub = document.querySelector('#screen-done [data-i18n="done_sub"]'); if (sub) sub.style.display = '';
  };
  app.onMedia = function (e) {
    const f = e.target.files[0];
    _onMedia.call(this, e);
    if (!f) return;
    delete this.draft.ai; updateSkipPhoto(); anonVideoNote();
    classifyPhoto(f);
  };
  function anonVideoNote() {
    let n = $('anonVideoNote');
    const show = app.draft.anonymous && app.draft.mediaType === 'video';
    if (!n && show) { $('aiCard').insertAdjacentHTML('beforebegin', `<p class="ai-warn" id="anonVideoNote">${h(T('anon_video_warn'))}</p>`); return; }
    if (n) n.style.display = show ? 'block' : 'none';
  }
  app.renderReview = function () {
    _renderReview.call(this);
    const d = this.draft;
    if (d.audio && !d.mediaName) $('revMedia').textContent = '🎙️';
    $('revVoiceRow').style.display = d.audio ? 'flex' : 'none';
    $('revAiRow').style.display = d.ai ? 'flex' : 'none';
    if (d.ai) $('revAi').textContent = `${CAT_ICON[d.ai.category] || ''} ${catLabel(d.ai.category)} · ${Math.round(d.ai.confidence)}%`;
    const refs = legalRefsFor(d.category);
    $('revLegalRow').style.display = refs.length ? 'flex' : 'none';
    $('revLegal').textContent = refs.map(refLabel).join(', ');
    $('tbCheck').checked = !!d.transboundary;
    let note = $('anonReviewNote');
    if (!note) { $('screen-report-5').querySelector('.topbar').insertAdjacentHTML('afterend', `<div class="anon-note" id="anonReviewNote"></div>`); note = $('anonReviewNote'); }
    note.textContent = T('anon_review'); note.style.display = d.anonymous ? 'block' : 'none';
  };
  app.fromRow = function (r) {
    const c = _fromRow.call(this, r);
    Object.assign(c, {
      channel: r.channel, audioPath: r.audio_path, legalRefs: r.legal_refs || [], aiCategory: r.ai_category,
      aiConfidence: r.ai_confidence, aiSummary: r.ai_summary, rejected: !!r.rejected, rejectReason: r.reject_reason, transboundary: !!r.transboundary
    });
    return c;
  };
  app.openCase = function (i, silent) {
    _openCase.call(this, i, silent);
    const c = this.cases[i], box = $('caseExtra'); if (!c || !box) return;
    const chips = [];
    if (c.transboundary) chips.push(`<span class="law-chip static">${h(T('tb_chip'))}</span>`);
    if (c.audioPath || c.channel === 'voice') chips.push(`<span class="law-chip static">${h(T('voice_chip'))}</span>`);
    (c.legalRefs || []).forEach((ref) => chips.push(refChip(ref)));
    box.innerHTML =
      (c.rejected ? `<div class="rej-note">⚠️ ${h(T('rejected_note'))}${c.rejectReason ? ': ' + h(c.rejectReason) : ''}</div>` : '') +
      (c.aiCategory ? `<div class="mini-note">${h(fill(T('ai_line'), { c: (CAT_ICON[c.aiCategory] || '') + ' ' + catLabel(c.aiCategory), p: Math.round((c.aiConfidence || 0) * 100) }))}</div>` : '') +
      (chips.length ? `<div class="chip-row">${chips.join('')}</div>` : '') +
      (c.audioPath ? `<audio id="caseAudio" controls style="width:100%; margin:6px 0 10px; display:none;"></audio>` : '');
    if (c.audioPath && SUPABASE_READY) {
      sb.storage.from('report-media').createSignedUrl(c.audioPath, 3600).then(({ data }) => { const a = $('caseAudio'); if (a && data) { a.src = data.signedUrl; a.style.display = 'block'; } });
    }
  };
  app.renderHome = function () {
    _renderHome.call(this);
    const show = (id, on) => { const el = $(id); if (el) el.style.display = on ? '' : 'none'; };
    show('cardAnon', setting('anon_reports_enabled', true) !== false);
    show('cardLedger', setting('transparency_enabled', true) !== false);
    show('cardRating', setting('rating_enabled', true) !== false);
  };
  app.applyLang = function () {
    _applyLang.call(this);
    if (!$('voiceBtn')) return;
    const active = (id) => $('screen-' + id) && $('screen-' + id).classList.contains('active');
    if (active('report-3') && this.draft.ai) renderAiCard();
    if (active('report-4')) { markAiBadge(); renderLegal(); }
    if (active('ledger')) this.renderLedger();
    if (active('rating')) renderRating();
  };

  // ------------------------------------------------------------------
  // Yuborish (oddiy + maxfiy)
  // ------------------------------------------------------------------
  async function uploadBlob(client, path, blob, type) {
    const { error } = await client.storage.from('report-media').upload(path, blob, { contentType: type, upsert: false });
    if (error) throw error;
    return path;
  }
  async function encryptContact(text) {
    const jwk = setting('whistle_pubkey', null);
    if (!text || !jwk || !crypto.subtle) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(text.slice(0, 150))));
    let bin = ''; ct.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function showToken(caseNo, token) {
    $('doneCaseId').textContent = caseNo;
    const old = $('doneToken'); if (old) old.remove();
    $('doneCaseId').insertAdjacentHTML('afterend', `<div class="token-box" id="doneToken"><div class="mini-note">${h(T('anon_token_t'))}</div>
      <div class="token">${h(token.replace(/(.{4})/g, '$1 ').trim())}</div><p class="mini-note">${h(T('anon_token_d'))}</p>
      <button class="btn btn-outline" onclick="app.copyToken('${h(token)}', this)">${h(T('anon_copy'))}</button></div>`);
    const sub = document.querySelector('#screen-done [data-i18n="done_sub"]'); if (sub) sub.style.display = 'none';
  }
  // (maxfiy murojaat profilga bog'lanmaydi — "Profil"da kuzatish haqidagi matn yashiriladi)
  app.copyToken = function (t, btn) { try { navigator.clipboard.writeText(t); btn.textContent = T('anon_copied'); } catch (e) {} };

  app.submit = async function () {
    const d = this.draft;
    if (!d.description) { this.goto('report-1'); return; }
    if (!d.location || !d.region) { this.goto('report-2'); return; }
    if (!d.mediaName && !d.audio) { this.goto('report-3'); return; }
    if (!d.category) { this.goto('report-4'); return; }
    if (this.submitting) return;
    d.address = $('addressInput').value.trim() || null;
    const errEl = $('submitError'), btn = $('submitBtn');
    errEl.textContent = '';
    let lat = d.lat ?? null, lng = d.lng ?? null;
    if (d.anonymous && d.fuzz && lat != null) { lat = Math.round(lat * 200) / 200; lng = Math.round(lng * 200) / 200; }
    const extra = {
      legal_refs: legalRefsFor(d.category), transboundary: !!d.transboundary,
      ai_category: d.ai ? d.ai.category : null, ai_confidence: d.ai ? d.ai.confidence / 100 : null, ai_summary: d.ai ? d.ai.summary : null
    };
    const locText = lat != null ? null : d.location;

    // --- Demo rejim (Supabase ulanmagan) ---
    if (!SUPABASE_READY) {
      if (d.anonymous) {
        const token = randId(10).toUpperCase(), caseNo = 'ECO-A' + Math.floor(1000 + Math.random() * 9000);
        const demo = safeGet('eco_anon_demo') || {}; demo[token] = { case_no: caseNo, status: 0, created_at: new Date().toISOString(), category: d.category, region: d.region, description: d.description };
        safeSet('eco_anon_demo', demo);
        this.resetDraft(); showToken(caseNo, token); this.goto('done');
        return;
      }
      const id = 'CASE-' + Math.floor(1000 + Math.random() * 9000);
      this.cases.unshift({ id, description: d.description, location: d.location + (d.address ? ' · ' + d.address : ''), region: d.region,
        media: d.mediaName || '🎙️', category: d.category, statusIndex: 0, createdAt: new Date().toISOString(),
        legalRefs: extra.legal_refs, transboundary: extra.transboundary, aiCategory: extra.ai_category, aiConfidence: extra.ai_confidence, channel: d.audio ? 'voice' : 'app' });
      safeSet('eco_cases', this.cases);
      $('doneCaseId').textContent = id; this.resetDraft(); this.goto('done');
      return;
    }

    if (d.file && d.file.size > 50 * 1024 * 1024) { errEl.textContent = this.t('submit_err_big'); return; }
    this.submitting = true; btn.disabled = true;
    const btnLabel = btn.innerHTML; btn.textContent = this.t('submit_sending');
    try {
      if (d.anonymous) {
        // Sessiyasiz mijoz: so'rovda hisob tokeni yo'q → Storage "owner" ham, arizadagi user_id ham bo'sh
        const cl = anonSb();
        let mediaPath = null, mediaType = null, audioPath = null;
        if (d.file) {
          if (d.mediaType === 'image') {
            const { blob } = await reencode(d.file, 1600, 0.85); // EXIF/GPS o'chiriladi
            mediaPath = await uploadBlob(cl, `anon/${randId(16)}.jpg`, blob, 'image/jpeg');
          } else {
            const ext = (d.file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
            mediaPath = await uploadBlob(cl, `anon/${randId(16)}.${ext}`, d.file, d.file.type || 'video/mp4');
          }
          mediaType = d.mediaType;
        }
        if (d.audio) audioPath = await uploadBlob(cl, `anon/${randId(16)}.${d.audio.ext}`, d.audio.blob, d.audio.type);
        const contact_cipher = await encryptContact(d.contact);
        const { data, error } = await cl.rpc('submit_anonymous_report', { p: {
          description: d.description, category: d.category, region: d.region, address: d.address, lat, lng, location_text: locText,
          media_path: mediaPath, media_type: mediaType, audio_path: audioPath, contact_cipher, transboundary: extra.transboundary, legal_refs: extra.legal_refs } });
        if (error) throw error;
        this.resetDraft(); showToken(data.case_no, data.token); this.goto('done');
        return;
      }

      let s = await session();
      if (!s && this.user && !this.user.verified) { const r = await sb.auth.signInAnonymously(); s = r.data && r.data.session; }
      if (!s) { errEl.textContent = this.t('submit_err_auth'); return; }
      let mediaPath = null, audioPath = null;
      if (d.file) mediaPath = await this.uploadMedia(s.user.id, d.file);
      if (d.audio) audioPath = await uploadBlob(sb, `${s.user.id}/voice-${Date.now()}-${randId(3)}.${d.audio.ext}`, d.audio.blob, d.audio.type);
      const { data, error } = await sb.from('reports').insert({
        description: d.description, category: d.category, region: d.region, address: d.address,
        lat, lng, location_text: locText, media_path: mediaPath, media_type: d.file ? d.mediaType : null,
        audio_path: audioPath, channel: d.audio ? 'voice' : 'app', ...extra
      }).select('id,case_no,created_at').single();
      if (error) throw error;
      $('doneCaseId').textContent = data.case_no;
      this.resetDraft(); this.goto('done'); this.loadCases();
    } catch (e) {
      console.warn('submit', e);
      const m = String((e && e.message) || '');
      errEl.textContent = /to.xtatilgan/i.test(m) ? this.t('submit_err_closed') : /o.chirilgan/i.test(m) ? T('anon_disabled') : this.t('submit_err_net');
    } finally {
      this.submitting = false; btn.disabled = false; btn.innerHTML = btnLabel;
    }
  };

  // ------------------------------------------------------------------
  // 4. MAXFIY MUROJAAT ekrani va kuzatuv
  // ------------------------------------------------------------------
  function renderAnon() {
    $('anonContactBox').style.display = setting('whistle_pubkey', null) ? 'block' : 'none';
    $('trackResult').innerHTML = '';
  }
  app.startAnon = function () {
    if (setting('anon_reports_enabled', true) === false) { alert(T('anon_disabled')); return; }
    this.resetDraft();
    this.draft.anonymous = true; this.draft.fuzz = $('anonFuzz').checked; this.draft.contact = ($('anonContact').value || '').trim();
    this.draftInProgress = true; document.body.classList.add('anon-mode');
    this.goto('report-1');
  };
  app.trackAnon = async function () {
    const code = $('trackInput').value.replace(/\s+/g, '').toUpperCase(), box = $('trackResult');
    if (code.length < 8) return;
    box.innerHTML = '<div class="mini-note">…</div>';
    let r = null;
    if (!SUPABASE_READY) r = (safeGet('eco_anon_demo') || {})[code] || null;
    else {
      const { data, error } = await anonSb().rpc('track_anonymous_report', { p_token: code });
      if (error) { box.innerHTML = `<div class="rej-note">${h(T('anon_err'))}</div>`; return; }
      r = data;
    }
    if (!r) { box.innerHTML = `<div class="rej-note">${h(T('anon_not_found'))}</div>`; return; }
    const dates = {}; (r.history || []).forEach((x) => { if (x.status != null && !dates[x.status]) dates[x.status] = x.created_at; });
    if (!dates[0]) dates[0] = r.created_at;
    const fmt = (s) => { try { return new Date(s).toLocaleString(app.lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
    box.innerHTML = `<div class="card-block"><div class="eyebrow">${h(r.case_no)}</div><div style="font-weight:700;">${h(r.description || '')}</div>
      <div class="mini-note">${CAT_ICON[r.category] || ''} ${h(catLabel(r.category))} · ${h(regionName(r.region, app.lang))}</div></div>
      ${r.rejected ? `<div class="rej-note">⚠️ ${h(T('track_rejected'))}</div>` : ''}
      ${r.cancelled ? `<div class="rej-note">${h(app.t('pill_cancelled'))}</div>` : ''}
      ${r.org || r.admin_note ? `<div class="case-reply"><b>${h(T('track_reply'))}</b>${r.org ? `<div>🏢 ${h(r.org)}</div>` : ''}${r.admin_note ? `<div>${h(r.admin_note)}</div>` : ''}</div>` : ''}
      <div class="timeline">${STATUS_I18N[app.lang].map((st, i) => `<div class="tl-item ${i <= r.status ? 'on' : ''}"><div class="tl-dot">${i <= r.status ? '✓' : ''}</div>
        <div><div class="tl-title">${h(st.t)}</div><div class="tl-sub">${h(st.d)}</div>${i <= r.status && dates[i] ? `<div class="tl-date">${h(fmt(dates[i]))}</div>` : ''}</div></div>`).join('')}</div>`;
  };

  // ------------------------------------------------------------------
  // 6. SHAFFOFLIK
  // ------------------------------------------------------------------
  const ledger = { funds: [], projects: [], myVotes: new Set(), demo: false, loaded: false };
  function demoLedger() {
    const y = new Date().getFullYear();
    ledger.funds = [
      { region: 'tashkent_city', year: y, source: 'compensation', amount: 18400000000 }, { region: 'tashkent_city', year: y, source: 'fine', amount: 2350000000 },
      { region: 'samarkand', year: y, source: 'compensation', amount: 4100000000 }, { region: 'fergana', year: y, source: 'compensation', amount: 3600000000 },
      { region: 'navoi', year: y, source: 'compensation', amount: 9800000000 }, { region: 'karakalpakstan', year: y, source: 'grant', amount: 5200000000 }
    ];
    ledger.projects = [
      { id: 'd1', region: 'tashkent_city', title: 'Chilonzor tumanida 3 000 tup daraxt ekish', description: 'Ko‘cha bo‘ylari va maktab hududlariga chinor, qayrag‘och ekish, tomchilatib sug‘orish tizimi.', budget: 2400000000, spent: 1650000000, status: 'in_progress', vote_count: 214 },
      { id: 'd2', region: 'tashkent_city', title: 'Havo sifati monitoring stansiyalari (12 ta)', description: 'Tumanlarda PM2.5/PM10 datchiklari, ma’lumotlar ochiq xaritada.', budget: 3100000000, spent: 3100000000, status: 'done', vote_count: 388 },
      { id: 'd3', region: 'navoi', title: 'Sanoat zonasi atrofida yashil himoya belbog‘i', description: '12 ga maydonda qurg‘oqchilikka chidamli daraxtlar.', budget: 4200000000, spent: 900000000, status: 'approved', vote_count: 97 },
      { id: 'd4', region: 'karakalpakstan', title: 'Orolbo‘yida saksovul ekish', description: 'Qurigan tubida chang-tuz bo‘ronlarini kamaytirish uchun.', budget: 5000000000, spent: 2750000000, status: 'in_progress', vote_count: 512 }
    ];
    ledger.demo = true;
  }
  async function loadLedger() {
    const sel = $('ledgerRegion');
    const cur = sel.value;
    sel.innerHTML = `<option value="">${h(T('ledger_all'))}</option>` + REGIONS.map((r) => `<option value="${r.code}">${h(r[app.lang] || r.uz)}</option>`).join('');
    sel.value = cur;
    const lawArt25 = lawArt('25');
    $('ledgerLaw').innerHTML = lawArt25 ? `${h(T('ledger_law'))}<a href="#" onclick="app.openLawArt('25'); return false;">${h(T('legal_more'))}</a>` : '';
    if (!SUPABASE_READY) { demoLedger(); app.renderLedger(); return; }
    $('ledgerSummary').innerHTML = '<div class="mini-note">…</div>';
    const [f, p] = await Promise.all([sb.from('eco_funds').select('region,year,quarter,source,amount,note,doc_url'),
      sb.from('eco_projects').select('id,region,title,description,category,budget,spent,status,start_date,end_date,doc_url,vote_count').order('created_at', { ascending: false })]);
    ledger.funds = f.data || []; ledger.projects = p.data || []; ledger.demo = false;
    const s = await session();
    if (s && !s.user.is_anonymous) { const { data } = await sb.from('project_votes').select('project_id'); ledger.myVotes = new Set((data || []).map((x) => x.project_id)); }
    app.renderLedger();
  }
  app.renderLedger = function () {
    const reg = $('ledgerRegion').value;
    const funds = ledger.funds.filter((x) => !reg || x.region === reg);
    const projects = ledger.projects.filter((x) => (!reg || x.region === reg) && x.status !== 'cancelled');
    const collected = funds.reduce((s, x) => s + Number(x.amount || 0), 0);
    const allocated = projects.reduce((s, x) => s + Number(x.budget || 0), 0);
    const spent = projects.reduce((s, x) => s + Number(x.spent || 0), 0);
    const pct = collected ? Math.min(100, Math.round((allocated / collected) * 100)) : 0;
    const bySrc = {}; funds.forEach((x) => { bySrc[x.source] = (bySrc[x.source] || 0) + Number(x.amount || 0); });
    $('ledgerSummary').innerHTML = (ledger.demo ? `<div class="mini-note" style="margin-bottom:8px;">${h(T('ledger_demo'))}</div>` : '') +
      (!funds.length && !projects.length ? `<div class="empty">${h(T('ledger_empty'))}</div>` : `
      <div class="card-block ledger-card">
        <div class="ledger-flow"><div><small>${h(T('ledger_collected'))}</small><b>${h(fmtMoney(collected))}</b></div><span>→</span>
          <div><small>${h(T('ledger_allocated'))}</small><b>${h(fmtMoney(allocated))}</b></div></div>
        <div class="ai-bar" style="margin:10px 0 6px;"><i style="width:${pct}%"></i></div>
        <div class="mini-note">${h(fill(T('ledger_used'), { p: pct }))} · ${h(T('ledger_spent'))}: <b>${h(fmtMoney(spent))}</b></div>
        ${Object.keys(bySrc).length ? `<div class="src-list">${Object.entries(bySrc).map(([k, v]) => `<div><span>${h((T('ledger_src') || {})[k] || k)}</span><b>${h(fmtMoney(v))}</b></div>`).join('')}</div>` : ''}
      </div>`);
    $('ledgerProjects').innerHTML = projects.length ? projects.map((pj) => {
      const sp = pj.budget ? Math.min(100, Math.round((pj.spent / pj.budget) * 100)) : 0;
      const voted = ledger.myVotes.has(pj.id);
      return `<div class="card-block proj">
        <div class="proj-h"><b>${h(pj.title)}</b><span class="proj-st st-${h(pj.status)}">${h((T('ledger_status') || {})[pj.status] || pj.status)}</span></div>
        <div class="mini-note">${h(pj.region ? regionName(pj.region, app.lang) : T('ledger_all'))}${pj.end_date ? ' · ' + h(pj.end_date) : ''}</div>
        ${pj.description ? `<p class="proj-d">${h(pj.description)}</p>` : ''}
        <div class="ai-bar"><i style="width:${sp}%"></i></div>
        <div class="proj-f"><span class="mini-note">${h(T('ledger_spent'))}: ${h(fmtMoney(pj.spent))} / ${h(T('ledger_budget'))}: ${h(fmtMoney(pj.budget))}</span>
          <button class="vote-btn ${voted ? 'on' : ''}" onclick="app.voteProject('${h(pj.id)}', this)">${h(fill(T('ledger_vote'), { n: pj.vote_count || 0 }))}</button></div>
        ${pj.doc_url ? `<a class="mini-note" target="_blank" rel="noopener" href="${h(pj.doc_url)}">${h(T('ledger_doc'))}</a>` : ''}
      </div>`;
    }).join('') : `<div class="empty">${h(T('ledger_empty'))}</div>`;
  };
  app.voteProject = async function (id, btn) {
    const pj = ledger.projects.find((x) => x.id === id); if (!pj) return;
    if (ledger.demo) { const on = !ledger.myVotes.has(id); on ? ledger.myVotes.add(id) : ledger.myVotes.delete(id); pj.vote_count += on ? 1 : -1; this.renderLedger(); return; }
    const s = await session();
    if (!s || s.user.is_anonymous) { alert(T('ledger_vote_login')); return; }
    btn.disabled = true;
    const { data, error } = await sb.rpc('toggle_project_vote', { p_project: id });
    btn.disabled = false;
    if (error) { alert(error.message); return; }
    data.voted ? ledger.myVotes.add(id) : ledger.myVotes.delete(id); pj.vote_count = data.votes; this.renderLedger();
  };
  app.sendSuggestion = async function () {
    const t = $('suggestInput').value.trim(), msg = $('suggestMsg');
    if (t.length < 10) { msg.textContent = T('ledger_short'); return; }
    if (SUPABASE_READY) {
      const s = await session(); if (!s) { msg.textContent = T('ledger_vote_login'); return; }
      const { error } = await sb.from('project_suggestions').insert({ region: $('ledgerRegion').value || null, text: t });
      if (error) { msg.textContent = error.message; return; }
    }
    $('suggestInput').value = ''; msg.textContent = T('ledger_sent');
  };

  // ------------------------------------------------------------------
  // 7. REYTING
  // ------------------------------------------------------------------
  const rating = { tab: 'regions', data: null };
  async function loadRating() {
    $('ratingBody').innerHTML = '<div class="mini-note">…</div>';
    if (!SUPABASE_READY) {
      const mine = app.cases.filter((c) => !c.cancelled);
      const resolved = mine.filter((c) => c.statusIndex >= 3);
      rating.data = {
        regions: REGIONS.slice(0, 8).map((r, i) => ({ region: r.code, total: 40 - i * 4, resolved: 30 - i * 4, avg_days: (2.5 + i * 0.6).toFixed(1) })),
        users: [{ name: 'Dilnoza R.', points: 142, resolved: 13 }, { name: 'Jasur T.', points: 118, resolved: 11 }, { name: 'Madina Y.', points: 96, resolved: 9 }],
        me: { resolved: resolved.length, in_work: mine.filter((c) => c.statusIndex >= 1 && c.statusIndex < 3).length, total: mine.length,
          categories: new Set(resolved.map((c) => c.category)).size, points: resolved.length * 10 + mine.filter((c) => c.statusIndex >= 1 && c.statusIndex < 3).length * 2 },
        show_me: false, demo: true
      };
    } else {
      const { data, error } = await sb.rpc('eco_leaderboard', { p_days: 365 });
      rating.data = error ? { regions: [], users: [], me: null } : data;
    }
    renderRating();
  }
  app.ratingTab = function (t) { rating.tab = t; document.querySelectorAll('[data-rt]').forEach((b) => b.classList.toggle('active', b.dataset.rt === t)); renderRating(); };
  function renderRating() {
    const d = rating.data, box = $('ratingBody'); if (!d) return;
    if (rating.tab === 'regions') {
      const list = (d.regions || []).slice();
      box.innerHTML = list.length ? list.map((r, i) => {
        const pct = r.total ? Math.round((r.resolved / r.total) * 100) : 0;
        return `<div class="rank-row"><span class="rank-n">${i + 1}</span><div class="rank-b"><b>${h(regionName(r.region, app.lang))}</b>
          <div class="ai-bar"><i style="width:${pct}%"></i></div>
          <small>${r.resolved} ${h(T('rating_resolved'))} / ${r.total} · ${pct}%${r.avg_days ? ' · ' + h(fill(T('rating_days'), { d: r.avg_days })) : ''}</small></div>
          <span class="rank-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span></div>`;
      }).join('') : `<div class="empty">${h(T('rating_empty'))}</div>`;
    } else if (rating.tab === 'users') {
      const list = d.users || [];
      box.innerHTML = list.length ? list.map((u, i) => `<div class="rank-row ${u.me ? 'me' : ''}"><span class="rank-n">${i + 1}</span><div class="rank-b"><b>${h(u.name || '—')}</b>
        <small>${u.resolved} ${h(T('rating_resolved'))}</small></div><span class="rank-pts">${u.points} <small>${h(T('rating_points'))}</small></span></div>`).join('')
        : `<div class="empty">${h(T('rating_users_empty'))}</div>`;
    } else {
      const m = d.me || { points: 0, resolved: 0, in_work: 0, total: 0, categories: 0 };
      const guest = !app.user || !app.user.verified;
      box.innerHTML = `<div class="card-block me-card"><div class="me-pts">${m.points || 0}</div><div class="mini-note">${h(T('rating_points'))}</div>
        <div class="stat-row" style="margin:14px 0 0;"><div class="stat-chip"><b>${m.resolved || 0}</b><span>${h(T('rating_resolved'))}</span></div>
        <div class="stat-chip"><b>${m.in_work || 0}</b><span>${h(T('rating_in_work'))}</span></div><div class="stat-chip"><b>${m.total || 0}</b><span>${h(T('rating_total'))}</span></div></div></div>
        <div class="badge-grid">${T('badges').map(([ico, name, desc, key, need]) => { const ok = (m[key] || 0) >= need;
          return `<div class="badge ${ok ? 'ok' : ''}"><span>${ico}</span><b>${h(name)}</b><small>${h(desc)}</small></div>`; }).join('')}</div>
        ${guest ? `<p class="mini-note">${h(T('rating_guest'))}</p>` : `<label class="tb-check card-block"><input type="checkbox" id="showMe" ${d.show_me ? 'checked' : ''} onchange="app.setShowInRating(this.checked)"><span>${h(T('rating_show'))}</span></label>`}`;
    }
  }
  app.setShowInRating = async function (on) {
    if (!SUPABASE_READY) { rating.data.show_me = on; return; }
    const s = await session(); if (!s || s.user.is_anonymous) return;
    await sb.from('profiles').update({ show_in_rating: on }).eq('id', s.user.id);
    loadRating();
  };

  // ------------------------------------------------------------------
  // 8b. AI YORDAMCHI: server orqali, rasm bilan
  // ------------------------------------------------------------------
  app.aiImage = null;
  app.onAiFile = async function (e) {
    const f = e.target.files[0]; e.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    try {
      const { dataUrl } = await reencode(f, 1024, 0.8);
      this.aiImage = { media_type: 'image/jpeg', data: b64(dataUrl), preview: dataUrl };
      const chip = $('aiAttachChip'); chip.innerHTML = `<img src="${dataUrl}" alt=""><button onclick="app.clearAiImage()">✕</button>`; chip.style.display = 'flex';
    } catch (err) { /* noop */ }
  };
  app.clearAiImage = function () { this.aiImage = null; const c = $('aiAttachChip'); c.style.display = 'none'; c.innerHTML = ''; };
  app.sendAI = async function () {
    if (!SUPABASE_READY) { if (this.aiImage) this.clearAiImage(); return _sendAI.call(this); }
    const input = $('aiInput');
    let text = input.value.trim();
    const img = this.aiImage;
    if (!text && !img) return;
    if (!text) text = T('ai_photo_q');
    const s = await session();
    if (!s) { this.aiMessages.push({ role: 'assistant', content: T('ai_login') }); this.renderAI(); return; }
    this.aiMessages.push({ role: 'user', content: (img ? '📷 ' : '') + text });
    input.value = ''; this.clearAiImage();
    $('aiSendBtn').disabled = true;
    this.aiMessages.push({ role: 'assistant', content: '', pending: true });
    this.renderAI();
    const history = this.aiMessages.filter((m) => !m.pending).map((m) => ({ role: m.role, content: m.content }));
    try {
      const { data, error } = await sb.functions.invoke('eco-ai', { body: { mode: 'chat', messages: history, image: img ? { media_type: img.media_type, data: img.data } : undefined, lang: this.lang } });
      const reply = !error && data && data.ok ? data.text : (data && data.error) || T('ai_err');
      this.aiMessages[this.aiMessages.length - 1] = { role: 'assistant', content: reply };
    } catch (err) {
      this.aiMessages[this.aiMessages.length - 1] = { role: 'assistant', content: T('ai_err') };
    }
    $('aiSendBtn').disabled = false;
    this.renderAI();
    safeSet('eco_ai_msgs', this.aiMessages);
  };

  // ------------------------------------------------------------------
  // Ishga tushirish
  // ------------------------------------------------------------------
  document.querySelectorAll('#catGrid .cat').forEach((el) => el.addEventListener('click', () => renderLegal()));
  ['report-1', 'report-2', 'report-3', 'report-4', 'report-5'].forEach((id) => {
    const tb = document.querySelector(`#screen-${id} .topbar`);
    if (tb) tb.insertAdjacentHTML('beforeend', `<span class="anon-pill">${h(P.uz.anon_mode)}</span>`);
  });
  if (app.lang === 'ru') app.applyLang();
  app.renderHome();
})();
