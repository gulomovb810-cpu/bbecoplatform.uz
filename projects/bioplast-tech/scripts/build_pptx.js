// BioPlast Tech — yangilangan taqdimot (pptxgenjs, structured deck)
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const OUT = process.argv[2], IMG = process.argv[3];
const D = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));

const THEME = {
  name: "BioPlast Ocean",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "14232E", lt1: "FFFFFF", dk2: "0B3D5C", lt2: "EAF3F1",
    accent1: "1F8A70", accent2: "0B3D5C", accent3: "F2A541", accent4: "5FB49C",
    accent5: "C0504D", accent6: "7A8C99", hlink: "1F6FA8", folHlink: "6B4FA0",
  },
};
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "BioPlast Tech — takomillashtirilgan loyiha";
pres.author = "Asilbekova Z.";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

const usd = (v) => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US").replace(/,/g, " ");
const mln = (v) => "$" + (v / 1e6).toFixed(2).replace(".", ",") + " mln";
const pct = (v) => (v * 100).toFixed(1).replace(".", ",") + "%";

// ---------- layouts
pres.defineSlideMaster({
  title: "BP_TITLE", background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.0, w: 11.7, h: 1.6, fontSize: 60, bold: true, color: C.background1, valign: "bottom" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 3.75, w: 9.5, h: 1.4, fontSize: 22, color: C.background2, valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "BP_CONTENT", background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.accent6, align: "right" },
  objects: [
    { text: { text: "BioPlast Tech", options: { x: 0.6, y: 7.0, w: 4, h: 0.3, fontSize: 10, color: C.accent6, isTextBox: true } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: C.text2, valign: "middle" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "BP_DARK", background: { color: C.text2 },
  slideNumber: { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 10, color: C.background2, align: "right" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: C.background1, valign: "middle" }, text: "" } },
  ],
});

let sec = "";
function slide(master, title, section) {
  if (section) { pres.addSection({ title: section }); sec = section; }
  const s = pres.addSlide({ masterName: master, sectionTitle: sec });
  if (title) s.addText(title, { placeholder: "title" });
  return s;
}
function card(s, x, y, w, h, fill, name) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill }, objectName: name });
}
function stat(s, x, y, w, big, label, opts = {}) {
  s.addText(big, { x, y, w, h: 0.85, fontSize: opts.size || 40, bold: true, color: opts.color || C.accent1, fontFace: THEME.headFontFace, margin: 0, isTextBox: true, valign: "bottom" });
  s.addText(label, { x, y: y + 0.88, w, h: opts.lh || 0.7, fontSize: 14, color: opts.lcolor || C.text1, margin: 0, isTextBox: true, valign: "top" });
}
function table(s, rows, x, y, w, colW, opts = {}) {
  const fs_ = opts.fontSize || 13;
  const data = rows.map((r, ri) => r.map((cell, ci) => ({
    text: String(cell),
    options: ri === 0
      ? { bold: true, color: HEX.lt1, fill: { color: HEX.accent1 }, fontSize: fs_ }
      : { color: HEX.dk1, fill: { color: ri % 2 ? HEX.lt1 : HEX.lt2 }, fontSize: fs_, bold: (opts.boldRows || []).includes(ri), align: (opts.right || []).includes(ci) ? "right" : "left" },
  })));
  s.addTable(data, { x, y, w, colW, border: { type: "solid", pt: 0.5, color: "C9D6DD" }, margin: [3, 6, 3, 6], valign: "middle", rowH: opts.rowH, objectName: opts.name || "table" });
}

// ---------- 1. Titul
let s = slide("BP_TITLE", null, "Kirish");
s.addText("BioPlast Tech", { placeholder: "title" });
s.addText("Mikroorganizmlar yordamida biologik parchalanadigan plastik (PHA) va undan kompost bo‘ladigan paket hamda plyonkalar ishlab chiqarish", { placeholder: "body" });
s.addText("Asilbekova Z. · Toshkent kimyo-texnologiya instituti · 2026 · Versiya 2.0", { x: 0.8, y: 6.3, w: 9, h: 0.4, fontSize: 14, color: C.background2, isTextBox: true, margin: 0 });
s.addShape(pres.shapes.OVAL, { x: 10.6, y: 0.7, w: 2.2, h: 2.2, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "motif circle" });
s.addText("PHA", { x: 10.6, y: 0.7, w: 2.2, h: 2.2, fontSize: 36, bold: true, color: C.background1, align: "center", valign: "middle", fontFace: THEME.headFontFace, isTextBox: true });
s.addNotes("Loyiha yangilangan: real bozor narxlari, real uskuna narxlari va ikki bosqichli rivojlanish rejasi.");

// ---------- 2. Muammo
s = slide("BP_CONTENT", "Plastik chiqindining atigi 9% i qayta ishlanadi", "Muammo va yechim");
const st = [["460 mln t", "plastik ishlatilgan (2019)"], ["353 mln t", "plastik chiqindi hosil bo‘lgan"], ["9%", "chiqindi qayta ishlangan"], ["22%", "nazoratsiz tashlangan yoki tabiatga chiqqan"]];
st.forEach((t, i) => { card(s, 0.6 + i * 3.08, 1.55, 2.85, 1.95, C.background2, "stat card " + i); stat(s, 0.85 + i * 3.08, 1.7, 2.4, t[0], t[1], { color: i === 2 ? C.accent5 : C.text2, size: 36 }); });
s.addText("Manba: OECD Global Plastics Outlook, 2022", { x: 0.6, y: 3.85, w: 8, h: 0.3, fontSize: 10, color: C.accent6, isTextBox: true, margin: 0 });
card(s, 0.6, 4.4, 12.1, 2.3, C.text2, "uz card");
s.addText([
  { text: "O‘zbekistonda: ", options: { bold: true, color: C.accent3 } },
  { text: "2025-yil yanvarida e’lon qilingan davlat dasturi loyihasida 2027-yildan polietilen paketlarni ishlab chiqarish, import qilish va ishlatishni taqiqlash taklif etilgan (Kun.uz, Gazeta.uz).", options: { color: C.background1, breakLine: true } },
  { text: "Dastur hali yakuniy qabul qilinmagan — shuning uchun moliyaviy model taqiqsiz hisoblangan. Taqiq qabul qilinsa, bu qo‘shimcha imkoniyat.", options: { color: C.background2 } },
], { x: 0.9, y: 4.55, w: 11.5, h: 2.0, fontSize: 17, valign: "middle", isTextBox: true, paraSpaceAfter: 8 });

// ---------- 3. Yechim
s = slide("BP_CONTENT", "Yechim: ikki yo‘nalishni birlashtirgan korxona");
card(s, 0.6, 1.5, 5.9, 4.0, C.background2, "line A");
card(s, 6.8, 1.5, 5.9, 4.0, C.background2, "line B");
s.addText("1. Biotexnologiya: PHA ishlab chiqarish", { x: 0.9, y: 1.7, w: 5.4, h: 0.6, fontSize: 20, bold: true, color: C.accent1, isTextBox: true, margin: 0 });
s.addText([
  { text: "Bakteriya Cupriavidus necator yog‘ chiqindisini PHA ga aylantiradi", options: { bullet: true, breakLine: true } },
  { text: "Xomashyo: ishlatilgan yog‘, yog‘-moy kombinatlari soapstoki", options: { bullet: true, breakLine: true } },
  { text: "PHA tuproqda, uy kompostida va dengizda parchalanadi", options: { bullet: true, breakLine: true } },
  { text: "Quvvat: ~58 t/yil (2 × 10 m³ fermenter)", options: { bullet: true } },
], { x: 0.9, y: 2.4, w: 5.4, h: 2.9, fontSize: 16, color: C.text1, paraSpaceAfter: 8, valign: "top", isTextBox: true });
s.addText("2. Tayyor mahsulot: paket va plyonka", { x: 7.1, y: 1.7, w: 5.4, h: 0.6, fontSize: 20, bold: true, color: C.text2, isTextBox: true, margin: 0 });
s.addText([
  { text: "PHA + PBAT + PLA aralashmasidan kompost bo‘ladigan paket", options: { bullet: true, breakLine: true } },
  { text: "Organik chiqindi qoplari, fermerlar uchun mulcha plyonka", options: { bullet: true, breakLine: true } },
  { text: "Birinchi yildan daromad beradi", options: { bullet: true, breakLine: true } },
  { text: "Quvvat: 1 080 t/yil (2 ta plyonka liniyasi)", options: { bullet: true } },
], { x: 7.1, y: 2.4, w: 5.4, h: 2.9, fontSize: 16, color: C.text1, paraSpaceAfter: 8, valign: "top", isTextBox: true });
s.addText("Nega birga? Kichik masshtabda faqat PHA sotish foyda keltirmaydi. Tayyor mahsulot daromad beradi, o‘z PHA miz esa raqobatchilarda yo‘q xususiyat beradi.", { x: 0.6, y: 5.8, w: 12.1, h: 0.9, fontSize: 16, italic: true, color: C.text2, isTextBox: true, margin: 0 });

// ---------- 4. Materiallar
s = slide("BP_CONTENT", "PHA, PLA va PBAT: qayerda parchalanadi");
table(s, [
  ["", "PHA (PHB/PHBV)", "PLA", "PBAT"],
  ["Qanday olinadi", "Bakteriya hujayrasida to‘planadi", "Shakar → sut kislotasi → kimyoviy polimerlash", "Neft-kimyo sintezi"],
  ["Sanoat kompostida (58 °C)", "Ha", "Ha", "Ha"],
  ["Uy kompostida", "Ha", "Yo‘q", "Aralashmada qisman"],
  ["Tuproqda", "Ha", "Yo‘q", "Aralashmada (EN 17033)"],
  ["Dengizda", "Ha", "Yo‘q", "Yo‘q"],
  ["Narx (2025)", "$3 400–3 700/t +", "$2 000–2 500/t", "≈$1 400/t"],
], 0.6, 1.45, 12.1, [2.9, 3.1, 3.2, 2.9], { fontSize: 14, rowH: 0.48 });
s.addText("Tuzatish: PLA bakteriyadan to‘g‘ridan-to‘g‘ri olinmaydi va tabiatda 6–12 oyda parchalanmaydi — unga 58 °C li sanoat kompostlash kerak. Tabiiy sharoitda tez parchalanadigan polimer — PHA.", { x: 0.6, y: 5.35, w: 12.1, h: 1.0, fontSize: 15, color: C.text2, isTextBox: true, margin: 0 });
s.addText("Standartlar: EN 13432 (sanoat kompost), OK compost HOME, EN 17033 (mulcha plyonka), OK biodegradable MARINE", { x: 0.6, y: 6.4, w: 12.1, h: 0.4, fontSize: 11, color: C.accent6, isTextBox: true, margin: 0 });

// ---------- 5. Ishlash prinsipi
s = slide("BP_CONTENT", "Bakteriya qanday qilib plastik yasaydi", "Texnologiya");
s.addText([
  { text: "Uglerod ko‘p + azot kam = PHA to‘planadi", options: { bold: true, color: C.accent1, breakLine: true } },
  { text: "Odam ortiqcha energiyani yog‘ sifatida saqlagani kabi, bakteriya ortiqcha uglerodni hujayra ichida PHA donachalari sifatida saqlaydi. C. necator da PHA hujayra quruq massasining 70–80% iga yetadi.", options: { color: C.text1 } },
], { x: 0.6, y: 1.45, w: 12.1, h: 1.2, fontSize: 17, isTextBox: true, margin: 0, paraSpaceAfter: 6 });
const enz = [["Atsetil-KoA", "yog‘ parchalanishidan"], ["Atsetoatsetil-KoA", "PhaA (β-ketotiolaza)"], ["3-gidroksibutiril-KoA", "PhaB (reduktaza, NADPH)"], ["PHB donachasi", "PhaC (PHA-sintaza)"]];
enz.forEach((e, i) => {
  const x = 0.6 + i * 3.15;
  card(s, x, 3.0, 2.75, 1.6, i === 3 ? C.accent1 : C.background2, "enzyme " + i);
  s.addText(e[0], { x: x + 0.15, y: 3.1, w: 2.45, h: 0.8, fontSize: 17, bold: true, color: i === 3 ? C.background1 : C.text2, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  s.addText(e[1], { x: x + 0.15, y: 3.85, w: 2.45, h: 0.6, fontSize: 13, color: i === 3 ? C.background1 : C.text1, align: "center", valign: "middle", isTextBox: true, margin: 0 });
  if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.8, y: 3.6, w: 0.3, h: 0.4, fill: { color: C.accent6 }, line: { color: C.accent6 }, objectName: "arrow " + i });
});
card(s, 0.6, 5.0, 5.9, 1.7, C.background2, "phase1");
card(s, 6.8, 5.0, 5.9, 1.7, C.background2, "phase2");
s.addText([{ text: "1-faza: o‘sish (24–30 soat)", options: { bold: true, color: C.text2, breakLine: true } }, { text: "Azot yetarli — bakteriyalar ko‘payadi, biomassa to‘planadi", options: { color: C.text1 } }], { x: 0.85, y: 5.1, w: 5.4, h: 1.5, fontSize: 15, isTextBox: true, margin: 0, valign: "middle" });
s.addText([{ text: "2-faza: to‘planish (24–48 soat)", options: { bold: true, color: C.accent1, breakLine: true } }, { text: "Azot cheklanadi, yog‘ beriladi — hujayra PHA bilan to‘ladi", options: { color: C.text1 } }], { x: 7.05, y: 5.1, w: 5.4, h: 1.5, fontSize: 15, isTextBox: true, margin: 0, valign: "middle" });

// ---------- 6. Shtammlar
s = slide("BP_CONTENT", "Shtamm tanlovi: Cupriavidus necator H16");
const str = [
  ["Cupriavidus necator H16", "Asosiy shtamm", "Eski nomi Ralstonia eutropha (bu bitta tur). PHB/PHBV; o‘simlik yog‘ida yuqori chiqish; GMO emas, 1-xavf guruhi.", "DSMZ: DSM 428 · ATCC 17699"],
  ["Pseudomonas putida KT2440", "Qo‘shimcha", "Elastik (kauchuksimon) mcl-PHA; yog‘ kislotalari va glitserinda o‘sadi.", "DSMZ: DSM 6125 · ATCC 47054"],
  ["Haloferax mediterranei", "Kelajak uchun", "Sho‘r muhitda o‘sadi — sterilizatsiyasiz ishlash, energiya tejash. PHBV beradi.", "DSMZ: DSM 1411"],
];
str.forEach((t, i) => {
  const x = 0.6 + i * 4.1;
  card(s, x, 1.5, 3.8, 4.4, i === 0 ? C.text2 : C.background2, "strain " + i);
  const fg = i === 0 ? C.background1 : C.text1;
  s.addText(t[1].toUpperCase(), { x: x + 0.25, y: 1.7, w: 3.3, h: 0.35, fontSize: 12, bold: true, color: i === 0 ? C.accent3 : C.accent1, isTextBox: true, margin: 0 });
  s.addText(t[0], { x: x + 0.25, y: 2.1, w: 3.3, h: 0.9, fontSize: 20, bold: true, italic: true, color: i === 0 ? C.background1 : C.text2, isTextBox: true, margin: 0, valign: "top" });
  s.addText(t[2], { x: x + 0.25, y: 3.05, w: 3.3, h: 1.9, fontSize: 15, color: fg, isTextBox: true, margin: 0, valign: "top" });
  s.addText(t[3], { x: x + 0.25, y: 5.05, w: 3.3, h: 0.6, fontSize: 13, bold: true, color: fg, isTextBox: true, margin: 0 });
});
s.addText("Dastlabki taqdimotdagi «Ralstonia eutropha» va «Cupriavidus mecator» — aslida bitta bakteriya (to‘g‘ri yozilishi: Cupriavidus necator).", { x: 0.6, y: 6.15, w: 12.1, h: 0.6, fontSize: 14, italic: true, color: C.accent5, isTextBox: true, margin: 0 });

// ---------- 7. Jarayon
s = slide("BP_CONTENT", "Texnologik jarayon: yog‘dan paketgacha");
s.addImage({ path: path.join(IMG, "process_flow.png"), x: 0.6, y: 1.45, w: 12.1, h: 3.03, altText: "Texnologik sxema: xomashyo, urug‘, fermentatsiya, ajratish, quritish, kompaundlash, mahsulot", objectName: "process flow" });
const prm = [["30 °C · pH 6,8", "fermentatsiya rejimi"], ["48–72 soat", "bir partiya fermentatsiyasi"], ["≥95%", "PHA tozaligi (erituvchisiz)"], ["150–175 °C", "kompaundlash harorati"]];
prm.forEach((t, i) => stat(s, 0.6 + i * 3.08, 4.75, 2.85, t[0], t[1], { size: 28, color: C.text2 }));

// ---------- 8. Partiya balansi
s = slide("BP_DARK", "Bitta 10 m³ fermenter partiyasi");
const bal = [["7 000 L", "ishchi hajm"], ["60 g/L", "yakuniy PHA konsentratsiyasi"], ["≈357 kg", "tayyor PHA (85% ajratish unumi)"], ["≈760 kg", "sarflangan yog‘ (0,55 kg/kg)"], ["4 sutka", "partiya sikli (72 soat + yuvish)"], ["≈57 t/yil", "2 fermenter × 160 partiya"]];
bal.forEach((t, i) => {
  const x = 0.6 + (i % 3) * 4.1, y = 1.6 + Math.floor(i / 3) * 2.5;
  stat(s, x, y, 3.8, t[0], t[1], { size: 44, color: i === 5 ? C.accent3 : C.background1, lcolor: C.background2 });
});
s.addText("Taqqoslash: dastlabki taqdimotdagi «oyiga 50 t» uchun ≈600 m³ fermenter hajmi kerak bo‘lardi.", { x: 0.6, y: 6.4, w: 12.1, h: 0.4, fontSize: 14, italic: true, color: C.background2, isTextBox: true, margin: 0 });

// ---------- 9. Uskunalar
s = slide("BP_CONTENT", "Asosiy uskunalar va yetkazib beruvchilar", "Uskunalar");
const norm = (t) => t.replace(/[‘’']/g, "'");
const grp = (names) => D.capex_items.filter((r) => names.some((n) => norm(r[0]).startsWith(norm(n)))).reduce((a, r) => a + r[3] * r[4], 0);
table(s, [
  ["Uskuna guruhi", "Faza", "Narx", "Yetkazib beruvchilar (misol)"],
  ["Laboratoriya: 5 L bioreaktorlar, GC-FID, avtoklav, shaker", "1", usd(grp(["Stol usti", "Avtoklav", "Chayqatuvchi", "Laminar", "Laboratoriya sent", "Mikroskop", "Spektrofotometr", "Gaz xromatograf", "Quritish shkafi", "Erish", "Universal"])), "Sartorius, Eppendorf, Agilent, Shimadzu"],
  ["Pilot fermenter 300 L + pilot ajratish", "1", usd(grp(["Pilot"])), "Bailun, T&J Bio-engineering"],
  ["Kompaundlash ekstruderi + 2 plyonka liniyasi", "1–2", usd(grp(["Ikki shnekli", "Biodegradable plyonka"])), "Coperion, Nanjing Kerke, Ruian Ruipai"],
  ["Paket mashinalari, fleksobosma", "1", usd(grp(["Paket tayyorlash", "Fleksografik"])), "Ruian Xinye, Ruian Changhong"],
  ["Fermenterlar: 1 m³ urug‘ + 2 × 10 m³", "2", usd(grp(["Urug‘ fermenteri", "Asosiy fermenter"])), "Bailun, T&J, Bioengineering AG"],
  ["Ajratish: 2 separator, reaktorlar, purkab quritgich", "2", usd(grp(["Disk separatori", "Hujayrani", "Yuvish uchun", "Purkab"])), "Alfa Laval, GEA, Changzhou Lemar"],
  ["Utilitalar: bug‘ qozoni, havo, sovutish, suv, oqova", "2", usd(grp(["Havo puflagich", "Bug‘ qozoni", "Sovutish", "Suv tayyorlash", "Oqova", "Muhit tayyorlash", "PLC", "Elektr tarmog‘i"])), "Atlas Copco, Bosch, Siemens"],
  ["Jami CAPEX (montaj, logistika, zaxira bilan)", "", usd(D.capex), ""],
], 0.6, 1.45, 12.1, [5.0, 0.9, 1.6, 4.6], { fontSize: 13, right: [2], boldRows: [8], rowH: 0.5 });
s.addText("Narxlar — ochiq bozor e’lonlari asosidagi taxmin. Har bir pozitsiya bo‘yicha kamida 3 ta tijorat taklifi (KP) olinadi.", { x: 0.6, y: 6.35, w: 12.1, h: 0.4, fontSize: 11, color: C.accent6, isTextBox: true, margin: 0 });

// ---------- 10. Rasmlar
s = slide("BP_CONTENT", "Uskuna rasmlarini qayerdan olish mumkin");
const src = [
  ["Rasmiy saytlar", "sartorius.com · eppendorf.com · alfalaval.com · gea.com · coperion.com · agilent.com", "Eng sifatli rasmlar va texnik tavsif"],
  ["B2B maydonchalar", "alibaba.com · made-in-china.com (fermenter, blown film machine)", "Narx bilan birga; so‘rovga HD rasm va video yuboriladi"],
  ["Erkin litsenziya", "commons.wikimedia.org — «Bioreactor», «Spray dryer», «Blown film extrusion»", "CC litsenziya — muallifni ko‘rsatish kifoya"],
  ["O‘z laboratoriyangiz", "PHA donachalarini Nil qizili yoki Sudan qora B bilan bo‘yab mikroskopda suratga olish", "Eng kuchli dalil: real natija"],
];
src.forEach((t, i) => {
  const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 2.55;
  card(s, x, y, 5.95, 2.3, i === 3 ? C.text2 : C.background2, "src " + i);
  const dark = i === 3;
  s.addText(t[0], { x: x + 0.3, y: y + 0.2, w: 5.4, h: 0.5, fontSize: 20, bold: true, color: dark ? C.accent3 : C.accent1, isTextBox: true, margin: 0 });
  s.addText(t[1], { x: x + 0.3, y: y + 0.75, w: 5.4, h: 0.9, fontSize: 15, color: dark ? C.background1 : C.text1, isTextBox: true, margin: 0, valign: "top" });
  s.addText(t[2], { x: x + 0.3, y: y + 1.65, w: 5.4, h: 0.5, fontSize: 13, italic: true, color: dark ? C.background2 : C.accent6, isTextBox: true, margin: 0 });
});
s.addText("Dastlabki taqdimotdagi AI-rasmlar o‘rniga real uskuna va real mikroskop suratlarini qo‘ying — komissiya ishonchi oshadi.", { x: 0.6, y: 6.6, w: 12.1, h: 0.35, fontSize: 12, color: C.text2, isTextBox: true, margin: 0 });

// ---------- 11. Tannarx (native chart)
s = slide("BP_CONTENT", "1 t paket tannarxi $2 195, sotish narxi $3 900", "Iqtisodiyot");
const fl = D.film_lines.slice().sort((a, b) => b[1] - a[1]);
s.addChart(pres.charts.BAR, [{ name: "$ / t", labels: fl.map((r) => r[0]), values: fl.map((r) => Math.round(r[1])) }], {
  x: 0.6, y: 1.45, w: 7.4, h: 5.2, barDir: "bar", catAxisOrientation: "maxMin",
  chartColors: [HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: '"$"#,##0', dataLabelFontSize: 12, dataLabelColor: HEX.dk1,
  catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 13, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
  showLegend: false, showTitle: true, title: "Paket tannarxi tarkibi, $ / t", titleFontSize: 14, titleColor: HEX.dk2,
  catAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", objectName: "unit cost chart",
});
stat(s, 8.5, 1.6, 4.2, usd(D.film_margin), "marjinal foyda 1 t paketdan (" + pct(D.film_margin / 3900) + ")", { size: 40 });
stat(s, 8.5, 3.3, 4.2, usd(D.pha_vc), "1 t PHA ning o‘z tannarxi (bozor narxi $3 400–4 500)", { size: 40, color: C.text2 });
s.addText("Dastlabki taqdimotda: tannarx $95/t, narx $250/t — bu hatto polietilendan (~$1 200/t) ham 5 baravar arzon edi.", { x: 8.5, y: 5.15, w: 4.2, h: 1.4, fontSize: 14, italic: true, color: C.accent5, isTextBox: true, margin: 0 });

// ---------- 12. Prognoz (native chart)
s = slide("BP_CONTENT", "2031-yilda $3,3 mln daromad va $0,84 mln EBITDA");
s.addChart(pres.charts.BAR, [
  { name: "Daromad", labels: D.years, values: D.rev.map((v) => Math.round(v / 1000)) },
  { name: "EBITDA", labels: D.years, values: D.ebitda.map((v) => Math.round(v / 1000)) },
], {
  x: 0.6, y: 1.45, w: 8.4, h: 5.3, barDir: "col", barGapWidthPct: 60,
  chartColors: [HEX.dk2, HEX.accent1], showValue: false,
  catAxisLabelColor: HEX.dk1, valAxisLabelColor: HEX.accent6, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11,
  valGridLine: { color: "E1E8EC", size: 0.75 }, catGridLine: { style: "none" }, valAxisLabelFormatCode: "#,##0",
  showLegend: true, legendPos: "t", legendFontSize: 12, legendColor: HEX.dk1,
  showTitle: true, title: "ming $", titleFontSize: 12, titleColor: HEX.accent6,
  catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt", titleFontFace: "+mn-lt", objectName: "forecast chart",
});
stat(s, 9.4, 1.6, 3.3, pct(D.ebitda4 / D.rev4), "EBITDA rentabelligi (2031)", { size: 36 });
stat(s, 9.4, 3.2, 3.3, usd(D.ni4), "sof foyda (2031)", { size: 36, color: C.text2 });
stat(s, 9.4, 4.8, 3.3, "850 t", "paket/plyonka + ~3 t toza PHA sotuvi", { size: 36, color: C.text2 });

// ---------- 13. Investitsiya
s = slide("BP_DARK", "Investitsiya va samaradorlik");
const inv = [[mln(D.capex), "jami CAPEX (2 faza)"], [mln(D.funding), "moliyalashtirish ehtiyoji (aylanma mablag‘ bilan)"], [D.payback.toFixed(1).replace(".", ",") + " yil", "qoplanish muddati"], [pct(D.irr), "IRR (7 yil, qoldiq qiymatsiz)"], [usd(D.npv_tv), "NPV 15% (qoldiq qiymat bilan)"], [Math.round(D.be) + " t/yil", "zararsizlik nuqtasi"]];
inv.forEach((t, i) => {
  const x = 0.6 + (i % 3) * 4.1, y = 1.5 + Math.floor(i / 3) * 2.05;
  stat(s, x, y, 3.8, t[0], t[1], { size: 38, color: i === 2 ? C.accent3 : C.background1, lcolor: C.background2 });
});
table(s, [
  ["Manba", "Summa", "Ulush"],
  ["Bank krediti (10%, 1,5 yil imtiyoz, 5 yil)", usd(D.loan), pct(D.loan / D.funding)],
  ["Innovatsion grant", usd(D.grant), pct(D.grant / D.funding)],
  ["Investor / ta’sischi (seed + A raund)", usd(D.equity), pct(D.equity / D.funding)],
], 0.6, 5.55, 12.1, [7.1, 2.6, 2.4], { fontSize: 13, right: [1, 2], rowH: 0.32 });

// ---------- 14. Eski vs yangi
s = slide("BP_CONTENT", "Dastlabki raqamlar va tuzatilgan model");
table(s, [
  ["Ko‘rsatkich", "Dastlabki", "Tuzatilgan", "Asos"],
  ["1 t sotish narxi", "$250", "$3 900", "Kompost paket bozori; PHA $3 400–3 700/t (IMARC)"],
  ["1 t tannarx", "$95", usd(D.film_vc), "Faqat yog‘ xomashyosi ≈$900 / t PHA"],
  ["Investitsiya", "$60 000", usd(D.capex), "10 m³ fermenter $50–90 ming, separator ≈$70 ming"],
  ["Oylik hajm", "50 t PHA", "71 t paket + 4,8 t PHA", "Real uskuna quvvati"],
  ["Yillik foyda", "$93 000", usd(D.ni4), "Barqaror yil, soliq va foiz bilan"],
  ["Qoplanish", "8 oy", D.payback.toFixed(1).replace(".", ",") + " yil", "Biotexnologiya uchun odatiy"],
  ["Bakteriyalar", "3 xil tur", "C. necator H16 asosiy", "R. eutropha = C. necator"],
], 0.6, 1.45, 12.1, [2.4, 1.8, 2.6, 5.3], { fontSize: 14, rowH: 0.56 });
s.addText("Yangi raqamlar kamtarroq, lekin investor, bank va grant komissiyasi tekshiruvidan o‘ta oladi.", { x: 0.6, y: 6.25, w: 12.1, h: 0.5, fontSize: 15, italic: true, color: C.text2, isTextBox: true, margin: 0 });

// ---------- 15. Reja va xavflar
s = slide("BP_CONTENT", "Amalga oshirish rejasi", "Reja");
const tl = [["2026 IV", "MChJ, TKTI bilan shartnoma, shtamm, grant arizasi"], ["2027", "Laboratoriya, 300 L pilot, 1-plyonka liniyasi, sertifikatlash"], ["2028", "Sotuv 300 t, OK compost sertifikati, A raund"], ["2029", "2 × 10 m³ fermenter, PHA zavodi ishga tushadi"], ["2030–31", "850 t/yil, mulcha plyonka, eksport"]];
s.addShape(pres.shapes.LINE, { x: 0.9, y: 2.35, w: 11.5, h: 0, line: { color: C.accent6, width: 1.5 }, objectName: "timeline" });
tl.forEach((t, i) => {
  const x = 0.6 + i * 2.45;
  s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: 2.15, w: 0.4, h: 0.4, fill: { color: i === 3 ? C.accent3 : C.accent1 }, line: { color: C.background1, width: 2 }, objectName: "dot " + i });
  s.addText(t[0], { x, y: 1.5, w: 2.3, h: 0.5, fontSize: 18, bold: true, color: C.text2, isTextBox: true, margin: 0 });
  s.addText(t[1], { x, y: 2.75, w: 2.25, h: 1.3, fontSize: 14, color: C.text1, isTextBox: true, margin: 0, valign: "top" });
});
table(s, [
  ["Asosiy xavf", "Kamaytirish choralari"],
  ["Paket narxi past (arzon import, soxta «eko-paket»)", "Xalqaro sertifikat, markirovka, sinov protokollari"],
  ["PBAT/PLA narxi va valyuta kursi", "2–3 yetkazib beruvchi, 2–3 oylik zaxira"],
  ["Fermentatsiyada kontaminatsiya", "SIP/CIP, steril filtrlar, urug‘ zaxirasi"],
  ["2-faza uchun mablag‘ jalb qilinmasligi", "Bosqichli jalb qilish: 1-faza o‘zi daromad keltiradi"],
], 0.6, 4.3, 12.1, [5.6, 6.5], { fontSize: 13, rowH: 0.42 });

// ---------- 16. Xulosa
s = slide("BP_DARK", "Xulosa", "Xulosa");
s.addText([
  { text: "Real narxlar, real uskunalar, bosqichma-bosqich rivojlanish", options: { bullet: true, breakLine: true } },
  { text: "1-faza: sertifikatlangan kompost paketdan daromad + PHA pilot", options: { bullet: true, breakLine: true } },
  { text: "2-faza: o‘z PHA zavodi — tuproqda va uy kompostida parchalanadigan mahsulot", options: { bullet: true, breakLine: true } },
  { text: `${mln(D.capex)} investitsiya → 2031-yilda ${mln(D.rev4)} daromad, ${D.staff2} ish o‘rni`, options: { bullet: true } },
], { x: 0.6, y: 1.6, w: 12.1, h: 3.2, fontSize: 22, color: C.background1, paraSpaceAfter: 12, isTextBox: true, valign: "top" });
s.addText("BioPlast Tech: kelajakni bugundan yaratamiz!", { x: 0.6, y: 5.3, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: C.accent3, fontFace: THEME.headFontFace, isTextBox: true, margin: 0 });

pres.writeFile({ fileName: OUT }).then(async () => { await applyTheme(OUT, THEME); console.log("saved", OUT); });
