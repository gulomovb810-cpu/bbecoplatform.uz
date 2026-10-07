// =====================================================================
// bbecoplatform.uz — Tozalash aksiyalari va ekologik volontyorlik e'lonlari
//
// GitHub Actions (.github/workflows/eco-news.yml) har soatda ishga
// tushiradi: Google News va O'zbekiston saytlari lentalaridan hashar,
// shanbalik, ko'chat ekish, tozalash aksiyalari va ekologik volontyorlik
// haqidagi xabarlarni ajratib, events.json fayliga yozadi. Ilova shu
// faylni o'qiydi, brauzer begona saytlarga murojaat qilmaydi.
//
// Har bir xabar uchun:
//   type      — clean (tozalash, hashar) | tree (ko'chat ekish) | volunteer | action
//   eventDate — matndan topilgan tadbir sanasi (YYYY-MM-DD) yoki null
//   region    — ilovadagi viloyat kodi (tashkent_city, samarkand, ...) yoki null
//
// Ishlatish:  node scripts/fetch-events.mjs [eski.json] [yangi.json]
// =====================================================================
import { readFile, writeFile } from "node:fs/promises";
import { parseFeed, fetchText } from "./fetch-news.mjs";

const gnews = (q, hl, gl, days = 30) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${days}d`)}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`;
const UZ_SITES = "(site:kun.uz OR site:daryo.uz OR site:gazeta.uz OR site:uza.uz OR site:xabar.uz OR site:qalampir.uz OR site:uzdaily.uz OR site:nuz.uz OR site:podrobno.uz OR site:anhor.uz OR site:gov.uz)";
export const SOURCES = [
  { name: "Google News", url: gnews('hashar OR shanbalik OR "tozalash aksiyasi" OR "ekologik aksiya" OR "ko\'chat ekish" OR "daraxt ekish" OR "Yashil makon"', "uz", "UZ"), lang: "uz", region: "uz", filter: false, gnews: true },
  { name: "Google News", url: gnews('(volontyor OR ko\'ngilli OR yoshlar) (ekologik OR tozalash OR ko\'chat OR daraxt OR chiqindi)', "uz", "UZ"), lang: "uz", region: "uz", filter: false, gnews: true },
  { name: "Google News", url: gnews(`(hashar OR shanbalik OR ko'chat OR "tozalash" OR volontyor) ${UZ_SITES}`, "uz", "UZ"), lang: "uz", region: "uz", filter: false, gnews: true },
  { name: "Google News", url: gnews('(субботник OR "экологическая акция" OR "посадка деревьев" OR "посадили деревья" OR "уборка мусора" OR "Яшил макон" OR хашар) Узбекистан', "ru", "UZ"), lang: "ru", region: "uz", filter: false, gnews: true },
  { name: "Google News", url: gnews('(волонтеры OR волонтёры OR экоактивисты) (экология OR мусор OR деревья OR уборка OR озеленение) Узбекистан', "ru", "UZ"), lang: "ru", region: "uz", filter: false, gnews: true },
  { name: "Google News", url: gnews(`(субботник OR хашар OR "посадка деревьев" OR волонтеры OR "экологическая акция") ${UZ_SITES}`, "ru", "UZ"), lang: "ru", region: "uz", filter: false, gnews: true },
  { name: "Kun.uz", url: "https://kun.uz/news/rss", lang: "uz", region: "uz", filter: false },
  { name: "Kun.uz", url: "https://kun.uz/ru/news/rss", lang: "ru", region: "uz", filter: false },
  { name: "Gazeta.uz", url: "https://www.gazeta.uz/oz/rss/", lang: "uz", region: "uz", filter: false },
  { name: "Gazeta.uz", url: "https://www.gazeta.uz/ru/rss/", lang: "ru", region: "uz", filter: false },
  { name: "Daryo", url: "https://daryo.uz/feed/", lang: "uz", region: "uz", filter: false },
  { name: "Daryo", url: "https://daryo.uz/ru/feed/", lang: "ru", region: "uz", filter: false },
];

const MAX_AGE_DAYS = 60;
const MAX_ITEMS = 120;

export const norm = (s) => " " + String(s || "").toLowerCase().replace(/[ʻʼ‘’`´]/g, "'").replace(/ё/g, "е") + " ";
const has = (t, list) => list.some((k) => t.includes(k));

// Turi bo'yicha kalit so'zlar (o'zak, kichik harflarda)
const TYPE_WORDS = {
  clean: ["hashar", "shanbalik", "tozalash aksiya", "tozalash ishlari", "tozalash tadbir", "chiqindi yig'", "axlat yig'", "obodonlashtirish hashar",
    "субботник", "хашар", "уборк", "сбор мусора", "собрали мусор", "очистк", "очистили", "clean-up", "cleanup", "clean up"],
  tree: ["ko'chat", "daraxt ek", "daraxt o'tqaz", "daraxtlar ekil", "yashil makon", "o'rmon barpo", "ihota daraxt",
    "посадк", "саженц", "высадил", "высадят", "высажен", "озеленен", "яшил макон", "зеленое пространство", "зелёное пространство"],
  volunteer: ["volontyor", "volontor", "ko'ngilli", "волонтер", "волонтёр", "экоактивист", "эко-активист", "volunteer"],
  action: ["ekologik aksiya", "ekoaksiya", "eko-aksiya", "ekologik marafon", "ekologik tadbir", "ekologik flesh",
    "экологическ акци", "экологическая акция", "экологической акции", "экоакци", "эко-акци", "экологический марафон", "экомарафон"],
};
// Volontyorlik xabari ekologiyaga oid bo'lishi kerak (saylov, sport volontyorlari emas)
const ECO_CONTEXT = ["ekolog", "tabiat", "chiqindi", "axlat", "daraxt", "ko'chat", "tozala", "yashil", "atrof-muhit", "plastik", "orol",
  "эколог", "природ", "мусор", "отход", "дерев", "саженц", "уборк", "озелен", "зелен", "пластик", "арал", "чист"];
// "aksiya" yolg'iz ishlatilmaydi: o'zbek tilida qimmatli qog'oz ham "aksiya"
const EXCLUDE = ["aksiyalar narx", "aksiyalari narx", "aksiyalar paket", "aksiyador", "fond bozor", "birja", "акции компании", "пакет акций", "акционер", "биржа", "скидк", "chegirma",
  "uy qurish hashar", " to'y", "свадьб", " dtm", "saylov", "выборы", "выборах"];

export function classify(title, summary = "") {
  const t = norm(title), all = norm(title + " " + summary);
  if (has(all, EXCLUDE)) return null;
  const found = Object.keys(TYPE_WORDS).filter((k) => has(t, TYPE_WORDS[k]));
  if (!found.length) {
    // sarlavhada bo'lmasa, tavsifda kamida 2 marta uchrashi kerak
    const inSum = Object.keys(TYPE_WORDS).filter((k) => TYPE_WORDS[k].filter((w) => all.includes(w)).length >= 2);
    if (!inSum.length) return null;
    found.push(...inSum);
  }
  if (found.length === 1 && found[0] === "volunteer" && !has(all, ECO_CONTEXT)) return null;
  // ustuvorlik: tozalash > ko'chat > volontyorlik > umumiy aksiya
  for (const k of ["clean", "tree", "volunteer", "action"]) if (found.includes(k)) return k;
  return null;
}

// ---------------------------------------------------------- hududlar
const REGION_WORDS = {
  tashkent_city: ["toshkent shahr", "toshkent shahar", "poytaxt", "г. ташкент", "ташкенте", "в столице", "столичн", "chilonzor", "yunusobod", "mirzo ulug'bek", "yakkasaroy", "olmazor", "sergeli", "shayxontohur", "yashnobod", "mirobod", "uchtepa", "bektemir", "yangihayot", "чиланзар", "юнусабад", "мирзо-улугбек", "яккасарай", "алмазар", "сергели", "шайхантахур", "яшнабад", "мирабад", "учтепа", "бектемир", "янгихаят"],
  tashkent: ["toshkent viloyat", "ташкентской области", "ташкентская область", "chirchiq", "olmaliq", "angren", "nurafshon", "bekobod", "ohangaron", "bo'stonliq", "chorvoq", "чирчик", "алмалык", "ангрен", "нурафшан", "бекабад", "ахангаран", "бостанлык", "чарвак"],
  andijan: ["andijon", "андижан"],
  bukhara: ["buxoro", "бухар"],
  fergana: ["farg'ona", "fargona", "qo'qon", "marg'ilon", "ферган", "коканд", "маргилан"],
  jizzakh: ["jizzax", "джизак"],
  khorezm: ["xorazm", "urganch", "xiva", "хорезм", "ургенч", "хива"],
  namangan: ["namangan", "наманган"],
  navoi: ["navoiy", "zarafshon", "навои", "зарафшан"],
  kashkadarya: ["qashqadaryo", "qarshi", "shahrisabz", "кашкадар", "карши", "шахрисабз"],
  karakalpakstan: ["qoraqalpog'", "nukus", "mo'ynoq", "orolbo'yi", "каракалпак", "нукус", "муйнак", "приарал"],
  samarkand: ["samarqand", "самарканд"],
  syrdarya: ["sirdaryo", "guliston", "сырдар", "гулистан"],
  surkhandarya: ["surxondaryo", "termiz", "сурхандар", "термез"],
};
export function findRegion(text) {
  const t = norm(text);
  for (const [code, words] of Object.entries(REGION_WORDS)) if (has(t, words)) return code;
  // "Toshkent" yolg'iz — ko'pincha poytaxt
  if (/[\s(«"]toshkent|ташкент/.test(t)) return "tashkent_city";
  return null;
}

// ------------------------------------------------------- tadbir sanasi
const MONTHS = [
  ["yanvar", "январ"], ["fevral", "феврал"], ["mart", "март"], ["aprel", "апрел"], ["may", "мая", "май"], ["iyun", "июн"],
  ["iyul", "июл"], ["avgust", "август"], ["sentabr", "sentyabr", "сентябр"], ["oktabr", "oktyabr", "октябр"], ["noyabr", "ноябр"], ["dekabr", "декабр"],
];
const ymd = (d) => d.toISOString().slice(0, 10);
const dayUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
// Matndan tadbir sanasini topish. pub — xabar chiqqan vaqt. Faqat pub-1 kundan pub+90 kungacha bo'lgan sana olinadi.
export function findEventDate(text, pub) {
  const t = norm(text), p = dayUTC(new Date(pub));
  const ok = (d) => d >= new Date(p.getTime() - 864e5) && d <= new Date(p.getTime() + 90 * 864e5);
  const re = /(\d{1,2})\s*(?:-|–|\s)\s*(?:chi\s+|inchi\s+)?([a-zа-я']{3,9})/g;
  let m;
  while ((m = re.exec(t))) {
    const day = +m[1], word = m[2];
    if (/^(marta|martab|mayd|mayor|mart\w*lik)/.test(word)) continue;
    const mi = MONTHS.findIndex((alts) => alts.some((a) => word.startsWith(a)));
    if (mi < 0 || day < 1 || day > 31) continue;
    for (const y of [p.getUTCFullYear(), p.getUTCFullYear() + 1]) {
      const d = new Date(Date.UTC(y, mi, day));
      if (d.getUTCMonth() === mi && ok(d)) return ymd(d);
    }
  }
  const dm = t.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
  if (dm) {
    const y = dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : p.getUTCFullYear();
    const d = new Date(Date.UTC(y, +dm[2] - 1, +dm[1]));
    if (d.getUTCMonth() === +dm[2] - 1 && ok(d)) return ymd(d);
  }
  if (/\bertaga\b|\bзавтра\b/.test(t)) return ymd(new Date(p.getTime() + 864e5));
  if (/shanba kuni|\bshanbada\b|в субботу|в эту субботу/.test(t)) {
    const add = (6 - p.getUTCDay() + 7) % 7;
    return ymd(new Date(p.getTime() + add * 864e5));
  }
  return null;
}

export function toEvent(it) {
  const type = classify(it.title, it.summary);
  if (!type) return null;
  const text = it.title + " " + it.summary;
  return {
    title: it.title, summary: it.summary, link: it.link, image: it.image, date: it.date,
    source: it.source, lang: it.lang, type,
    eventDate: findEventDate(text, it.date),
    region: findRegion(text),
  };
}

export function mergeEvents(prev, fresh, now = Date.now()) {
  const key = (u) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  const byLink = new Map();
  for (const it of [...prev, ...fresh]) {
    const k = key(it.link), old = byLink.get(k);
    byLink.set(k, old ? { ...old, ...it, date: old.date < it.date ? old.date : it.date } : it);
  }
  const minDate = new Date(now - MAX_AGE_DAYS * 864e5).toISOString();
  const maxDate = new Date(now + 3600e3).toISOString();
  const seen = new Set();
  return [...byLink.values()]
    .filter((it) => it.date >= minDate)
    .map((it) => (it.date > maxDate ? { ...it, date: new Date(now).toISOString() } : it))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((it) => {
      const t = norm(it.title).replace(/[^\p{L}\p{N}]+/gu, "");
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .slice(0, MAX_ITEMS);
}

async function main() {
  const [prevPath, outPath = "events.json"] = process.argv.slice(2);
  let prev = [];
  if (prevPath) {
    try { prev = JSON.parse(await readFile(prevPath, "utf8")).items || []; } catch { prev = []; }
    // qoidalar o'zgargan bo'lsa, eski yozuvlar qayta tasniflanadi
    prev = prev.map((it) => toEvent({ ...it, summary: it.summary || "" })).filter(Boolean);
  }
  const fresh = [], status = [];
  await Promise.all(SOURCES.map(async (src) => {
    try {
      const items = parseFeed(await fetchText(src.url), src).map(toEvent).filter(Boolean);
      fresh.push(...items);
      status.push({ name: src.name, lang: src.lang, ok: true, count: items.length });
    } catch (e) {
      status.push({ name: src.name, lang: src.lang, ok: false });
      console.warn(`! ${src.name} (${src.lang}): ${e.message}`);
    }
  }));
  const okCount = status.filter((s) => s.ok).length;
  console.log(`Manbalar: ${okCount}/${SOURCES.length} ishladi, ${fresh.length} ta aksiya xabari topildi.`);
  if (!okCount && !prev.length) { console.error("Hech bir manbadan ma'lumot olinmadi."); process.exit(1); }
  const items = mergeEvents(prev, fresh);
  await writeFile(outPath, JSON.stringify({ updated: new Date().toISOString(), sources: status.sort((a, b) => a.name.localeCompare(b.name)), items }, null, 1) + "\n");
  console.log(`${outPath}: ${items.length} ta yozuv.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
