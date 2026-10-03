// =====================================================================
// bbecoplatform.uz — Ekologik yangiliklar yig'uvchi
//
// GitHub Actions (.github/workflows/eco-news.yml) har soatda ishga
// tushiradi: ishonchli saytlarning RSS lentalarini o'qiydi, ekologiya,
// iqlim va tabiatga oid xabarlarni ajratib, news.json fayliga yozadi.
// Ilova (index.html) shu faylni o'qiydi, shuning uchun brauzer begona
// saytlarga to'g'ridan-to'g'ri murojaat qilmaydi.
//
// Ishlatish:  node scripts/fetch-news.mjs [eski.json] [yangi.json]
// Faqat Node 20+ kerak, qo'shimcha paket yo'q.
// =====================================================================
import { readFile, writeFile } from "node:fs/promises";

// region: 'uz' — O'zbekiston manbalari, 'world' — xalqaro manbalar.
// filter: true — umumiy lenta, faqat ekologiyaga oid xabarlar olinadi.
export const SOURCES = [
  { name: "Kun.uz", url: "https://kun.uz/news/rss", lang: "uz", region: "uz", filter: true },
  { name: "Kun.uz", url: "https://kun.uz/ru/news/rss", lang: "ru", region: "uz", filter: true },
  { name: "Gazeta.uz", url: "https://www.gazeta.uz/oz/rss/", lang: "uz", region: "uz", filter: true },
  { name: "Gazeta.uz", url: "https://www.gazeta.uz/ru/rss/", lang: "ru", region: "uz", filter: true },
  { name: "Daryo", url: "https://daryo.uz/feed/", lang: "uz", region: "uz", filter: true },
  { name: "Daryo", url: "https://daryo.uz/ru/feed/", lang: "ru", region: "uz", filter: true },
  { name: "BMT yangiliklari", url: "https://news.un.org/feed/subscribe/ru/news/topic/climate-change/feed/rss.xml", lang: "ru", region: "world", filter: false },
  { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml", lang: "en", region: "world", filter: false },
  { name: "DW", url: "https://rss.dw.com/xml/rss-ru-all", lang: "ru", region: "world", filter: true },
  { name: "The Guardian", url: "https://www.theguardian.com/environment/rss", lang: "en", region: "world", filter: false },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", lang: "en", region: "world", filter: true },
  { name: "Mongabay", url: "https://news.mongabay.com/feed/", lang: "en", region: "world", filter: false },
];

const MAX_AGE_DAYS = 45;        // shundan eski xabarlar o'chiriladi
const MAX_PER_REGION = 60;      // har bir bo'limda saqlanadigan xabarlar soni
const SUMMARY_CHARS = 240;
const FETCH_TIMEOUT = 20_000;
const MAX_BYTES = 3_000_000;

// So'z boshidan qidiriladigan o'zaklar (apostroflar "'" ga keltiriladi)
const KEYWORDS = [
  // o'zbekcha
  "ekolog", "iqlim", "chiqindi", "atrof-muhit", "atrof muhit", "tabiat", "o'rmon", "daraxt",
  "havo sifat", "havoning ifloslan", "ifloslan", "chang bo'ron", "smog", "orol", "suv tanqis",
  "suv resurs", "qurg'oqchil", "ko'kalamzor", "yashil makon", "yashil hudud", "bioxilma", "yovvoyi",
  "qizil kitob", "global isish", "issiqxona gaz", "qayta tiklanuvchi", "qayta ishla", "plastik",
  "zaharli", "suv toshqin", "sel ", "muzlik", "brakonyer", "qo'riqxona", "milliy bog'",
  // ruscha
  "эколог", "климат", "отход", "мусор", "загрязн", "выброс", "вырубк", "лесн", "лесов", "лесах", "лес ",
  "арал", "природ", "засух", "водн ресурс", "водных ресурс", "водные ресурс", "нехватк вод", "нехватка вод", "дефицит вод", "смог", "пыльн", "озеленен",
  "биоразнообраз", "красн книг", "красную книг", "красной книг", "потеплен", "парников", "возобновля", "пластик", "качеств воздух",
  "качество воздух", "экосистем", "заповедн", "ледник", "наводнен", "браконь",
  // inglizcha
  "climate", "environment", "pollut", "emission", "wildlife", "forest", "deforest", "biodivers",
  "carbon", "plastic", "drought", "ocean", "species", "conservation", "renewable", "heatwave",
  "glacier", "flood", "air quality", "recycl", "endangered",
];
// Ekologiyaga aloqasi yo'q, lekin kalit so'zga tushib qoladigan iboralar
const EXCLUDE = [
  "plastik karta", "пластиков карт", "пластиковой карт", "пластиковую карт", "природный газ", "природного газа",
  "tabiiy gaz", "carbon copy",
];

const norm = (s) => s.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
const keyRe = new RegExp(
  "(?:^|[^\\p{L}'])(?:" + KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
  "u",
);
export function isEco(text) {
  const t = " " + norm(text) + " ";
  if (EXCLUDE.some((e) => t.includes(e))) {
    // istisno iborani olib tashlab, yana tekshiramiz
    let rest = t;
    for (const e of EXCLUDE) rest = rest.split(e).join(" ");
    return keyRe.test(rest);
  }
  return keyRe.test(t);
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
export function decode(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
      }
      return ENT[e.toLowerCase()] ?? m;
    });
}
const stripTags = (s) => decode(decode(s).replace(/<[^>]*>/g, " ")).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}
function attr(block, name, at) {
  const re = new RegExp(`<${name}\\s[^>]*?${at}\\s*=\\s*["']([^"']+)["'][^>]*>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(block))) out.push({ tag: m[0], val: decode(m[1]) });
  return out;
}
const httpsUrl = (u) => {
  try {
    const x = new URL(u.trim());
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : "";
  } catch { return ""; }
};

function findImage(block) {
  for (const e of attr(block, "enclosure", "url")) if (/image|\.(jpe?g|png|webp)/i.test(e.tag)) return e.val;
  for (const n of ["media:content", "media:thumbnail"]) {
    const list = attr(block, n, "url");
    if (list.length) return list[list.length > 1 && n === "media:content" ? list.length - 1 : 0].val;
  }
  const html = decode(tag(block, "content:encoded") + " " + tag(block, "description"));
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img ? decode(img[1]) : "";
}

function shorten(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 30)).replace(/[\s,.;:–—-]+$/, "") + "…";
}

// RSS 2.0 va Atom lentalarini o'qish
export function parseFeed(xml, src) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const items = [];
  for (const b of blocks) {
    const title = stripTags(tag(b, "title"));
    let link = stripTags(tag(b, "link"));
    if (!link) {
      const alt = attr(b, "link", "href");
      link = (alt.find((l) => /rel=["']alternate/i.test(l.tag)) || alt[0] || { val: "" }).val;
    }
    link = httpsUrl(link);
    if (!title || !link) continue;
    const summaryRaw = tag(b, "description") || tag(b, "summary") || tag(b, "content");
    const summary = shorten(stripTags(summaryRaw), SUMMARY_CHARS);
    const when = stripTags(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    const d = new Date(when);
    const date = isNaN(d) ? new Date().toISOString() : d.toISOString();
    if (src.filter && !isEco(title + " " + summary)) continue;
    const image = httpsUrl(findImage(b)).replace(/^http:/, "https:");
    items.push({ title: shorten(title, 220), summary, link, image, date, source: src.name, lang: src.lang, region: src.region });
  }
  return items;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; bbecoplatform-news/1.0; +https://bbecoplatform.uz)", Accept: "application/rss+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    redirect: "follow",
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("too large");
  return new TextDecoder("utf-8").decode(buf);
}

export function merge(prev, fresh, now = Date.now()) {
  const byLink = new Map();
  const key = (u) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  for (const it of [...prev, ...fresh]) {
    const k = key(it.link);
    const old = byLink.get(k);
    // yangi nusxa ustun, lekin birinchi ko'rilgan sanasi saqlanadi
    byLink.set(k, old ? { ...old, ...it, date: old.date < it.date ? old.date : it.date } : it);
  }
  const minDate = new Date(now - MAX_AGE_DAYS * 864e5).toISOString();
  const maxDate = new Date(now + 3600e3).toISOString();
  const seenTitle = new Set();
  const all = [...byLink.values()]
    .filter((it) => it.date >= minDate)
    .map((it) => (it.date > maxDate ? { ...it, date: new Date(now).toISOString() } : it))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((it) => {
      const t = it.source + "|" + norm(it.title).replace(/[^\p{L}\p{N}]+/gu, "");
      if (seenTitle.has(t)) return false;
      seenTitle.add(t);
      return true;
    });
  const out = [];
  for (const r of ["uz", "world"]) out.push(...all.filter((it) => it.region === r).slice(0, MAX_PER_REGION));
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function main() {
  const [prevPath, outPath = "news.json"] = process.argv.slice(2);
  let prev = [];
  if (prevPath) {
    try { prev = JSON.parse(await readFile(prevPath, "utf8")).items || []; } catch { prev = []; }
  }
  const fresh = [];
  const status = [];
  await Promise.all(SOURCES.map(async (src) => {
    try {
      const items = parseFeed(await fetchText(src.url), src);
      fresh.push(...items);
      status.push({ name: src.name, lang: src.lang, ok: true, count: items.length });
    } catch (e) {
      status.push({ name: src.name, lang: src.lang, ok: false });
      console.warn(`! ${src.name} (${src.lang}): ${e.message}`);
    }
  }));
  const okCount = status.filter((s) => s.ok).length;
  console.log(`Manbalar: ${okCount}/${SOURCES.length} ishladi, ${fresh.length} ta mos xabar topildi.`);
  if (!okCount && !prev.length) {
    console.error("Hech bir manbadan ma'lumot olinmadi.");
    process.exit(1);
  }
  const items = merge(prev, fresh);
  const out = { updated: new Date().toISOString(), sources: status.sort((a, b) => a.name.localeCompare(b.name)), items };
  await writeFile(outPath, JSON.stringify(out, null, 1) + "\n");
  console.log(`${outPath}: ${items.length} ta xabar.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
