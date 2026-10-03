// =====================================================================
// bbecoplatform.uz — Chiqindi shoxobchalari xaritasi uchun ma'lumot
//
// GitHub Actions (.github/workflows/waste-map.yml) har kuni ishga
// tushiradi: OpenStreetMap (Overpass API) dan O'zbekiston hududidagi
// chiqindi qabul qilish joylarini oladi va waste-points.json ga yozadi.
//   amenity=recycling             — saralangan chiqindi qabul joylari
//   amenity=waste_disposal        — maishiy chiqindi konteynerlari
//   amenity=waste_transfer_station— chiqindi qayta yuklash stansiyalari
//   landuse=landfill              — chiqindi poligonlari
//
// Xavflilik darajasi (ilovadagi rang):
//   g (yashil) — faqat qayta ishlanadigan chiqindi: qog'oz, plastik, shisha, metall, kiyim
//   y (sariq)  — aralash maishiy, yirik, qurilish yoki organik chiqindi
//   r (qizil)  — xavfli chiqindi (batareya, simob lampa, moy, kimyoviy, tibbiy,
//                elektronika) yoki chiqindi poligoni
//
// Ishlatish: node scripts/fetch-waste-points.mjs [chiqish.json]
// =====================================================================
import { writeFile } from "node:fs/promises";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const QUERY = `[out:json][timeout:240];
area["ISO3166-1"="UZ"][admin_level=2]->.uz;
(
  nwr["amenity"="recycling"](area.uz);
  nwr["amenity"="waste_disposal"](area.uz);
  nwr["amenity"="waste_transfer_station"](area.uz);
  nwr["landuse"="landfill"](area.uz);
);
out center tags;`;

// recycling:* teglari → ilovadagi qisqa kodlar
const KIND_MAP = {
  paper: "paper", cardboard: "paper", newspaper: "paper", magazines: "paper", books: "paper", paper_packaging: "paper",
  plastic: "plastic", plastic_bottles: "plastic", plastic_packaging: "plastic", plastic_bags: "plastic", pet: "plastic", PET: "plastic",
  glass: "glass", glass_bottles: "glass",
  cans: "metal", metal: "metal", scrap_metal: "metal", aluminium: "metal", beverage_cartons: "plastic", tetrapak: "plastic",
  clothes: "clothes", shoes: "clothes", textile: "clothes",
  organic: "organic", green_waste: "organic", food_waste: "organic", garden_waste: "organic",
  rubble: "construction", wood: "construction", tyres: "construction", furniture: "bulky", bulky_waste: "bulky",
  batteries: "batteries", car_batteries: "batteries",
  fluorescent_tubes: "lamps", low_energy_bulbs: "lamps", light_bulbs: "lamps",
  engine_oil: "oil", cooking_oil: "oil", oil: "oil",
  electrical_appliances: "electronics", electrical_items: "electronics", small_appliances: "electronics",
  computers: "electronics", mobile_phones: "electronics", printer_cartridges: "electronics", white_goods: "electronics",
  hazardous_waste: "hazardous", chemicals: "hazardous", paint: "hazardous", medicine: "medical", sharps: "medical",
  waste: "mixed",
};
const RED = new Set(["batteries", "lamps", "oil", "electronics", "hazardous", "medical"]);
const YELLOW = new Set(["mixed", "organic", "construction", "bulky"]);

export function classify(tags) {
  const kinds = new Set();
  for (const [k, v] of Object.entries(tags)) {
    if (!k.startsWith("recycling:") || !/^(yes|only)$/i.test(v)) continue;
    const code = KIND_MAP[k.slice(10)];
    if (code) kinds.add(code);
  }
  let type;
  if (tags.landuse === "landfill") type = "landfill";
  else if (tags.amenity === "waste_transfer_station") type = "transfer";
  else if (tags.amenity === "waste_disposal") type = "disposal";
  else type = tags.recycling_type === "centre" ? "centre" : "container";

  if (type === "disposal" || type === "transfer" || type === "landfill") kinds.add("mixed");
  if (type === "landfill") kinds.add("construction");
  if (/hazardous|toxic/i.test(tags.waste || "") || /hazardous/i.test(tags.landfill || "")) kinds.add("hazardous");
  for (const w of (tags.waste || "").split(/[;,]/).map((s) => s.trim())) if (KIND_MAP[w]) kinds.add(KIND_MAP[w]);
  // Teglanmagan qayta ishlash konteyneri: OSMda turi ko'rsatilmagan
  if (!kinds.size) kinds.add("unknown");

  const list = [...kinds];
  const level = type === "landfill" || list.some((k) => RED.has(k)) ? "r" : list.some((k) => YELLOW.has(k)) ? "y" : "g";
  return { type, kinds: list, level };
}

const clean = (s, n = 120) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

export function toPoints(elements) {
  const out = [];
  const seen = new Set();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const t = el.tags || {};
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    const key = lat.toFixed(5) + "," + lon.toFixed(5) + "," + (t.amenity || t.landuse);
    if (seen.has(key)) continue;
    seen.add(key);
    const { type, kinds, level } = classify(t);
    const addr = [t["addr:city"], t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", ");
    const p = { id: el.type[0] + el.id, lat: +lat.toFixed(6), lon: +lon.toFixed(6), type, level, kinds };
    const name = clean(t["name:uz"] || t.name || t["name:ru"] || t.operator || "", 80);
    if (name) p.name = name;
    if (addr) p.addr = clean(addr);
    if (t.opening_hours) p.hours = clean(t.opening_hours, 80);
    if (t.operator && t.operator !== name) p.op = clean(t.operator, 80);
    if (t.phone || t["contact:phone"]) p.phone = clean(t.phone || t["contact:phone"], 40);
    out.push(p);
  }
  return out;
}

async function overpass() {
  let lastErr;
  for (const url of ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "bbecoplatform-waste-map/1.0 (+https://bbecoplatform.uz)" },
          body: "data=" + encodeURIComponent(QUERY),
          signal: AbortSignal.timeout(300_000),
        });
        if (!res.ok) throw new Error(url + " HTTP " + res.status);
        const data = await res.json();
        if (!Array.isArray(data.elements)) throw new Error(url + " bad response");
        return data.elements;
      } catch (e) {
        lastErr = e;
        console.warn("! " + e.message);
        await new Promise((r) => setTimeout(r, 15_000));
      }
    }
  }
  throw lastErr;
}

async function main() {
  const outPath = process.argv[2] || "waste-points.json";
  const elements = await overpass();
  const points = toPoints(elements);
  if (!points.length) {
    console.error("OpenStreetMap'dan birorta ham nuqta olinmadi — eski fayl saqlanadi.");
    process.exit(1);
  }
  const by = { g: 0, y: 0, r: 0 };
  points.forEach((p) => by[p.level]++);
  const out = { updated: new Date().toISOString(), source: "OpenStreetMap", license: "ODbL", count: points.length, by, points };
  await writeFile(outPath, JSON.stringify(out) + "\n");
  console.log(`${outPath}: ${points.length} ta nuqta (yashil ${by.g}, sariq ${by.y}, qizil ${by.r}).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
