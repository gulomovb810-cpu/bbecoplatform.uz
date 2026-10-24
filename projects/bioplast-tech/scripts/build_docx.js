// BioPlast Tech — takomillashtirilgan biznes-reja (docx-js)
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, LevelFormat, PageBreak, Footer, PageNumber,
  ExternalHyperlink, TableLayoutType,
} = require("docx");

const OUT = process.argv[2];
const IMG = process.argv[3];
const D = JSON.parse(fs.readFileSync(process.argv[4], "utf8")); // model qiymatlari

const FONT = "Arial";
const NAVY = "0B3D5C", TEAL = "1F6F5C", GREY = "555555";
const PAGE_W = 11906, MARGIN = 1134, CW = PAGE_W - 2 * MARGIN; // A4, 2 sm chetlar

const usd = (v) => (v < 0 ? "−$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-US").replace(/,/g, " ");
const th = (v) => { const r = Math.round(v / 1000); return r === 0 ? "–" : (r < 0 ? "(" + Math.abs(r).toLocaleString("en-US").replace(/,/g, " ") + ")" : r.toLocaleString("en-US").replace(/,/g, " ")); };
const k = (v) => "$" + (v / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, " ") + " ming";
const pct = (v) => (v * 100).toFixed(1).replace(".", ",") + "%";

// --- yordamchi funksiyalar
function runs(text, base = {}) {
  // **qalin** belgilash
  const out = [];
  text.split(/(\*\*[^*]+\*\*)/).forEach((p) => {
    if (!p) return;
    if (p.startsWith("**")) out.push(new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: p, font: FONT, ...base }));
  });
  return out;
}
const P = (text, opts = {}) => new Paragraph({ children: runs(text, opts.run || {}), spacing: { after: 120, line: 300 }, alignment: opts.align || AlignmentType.JUSTIFIED, ...(opts.p || {}) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })], spacing: { before: 360, after: 160 }, pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })], spacing: { before: 240, after: 120 } });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })], spacing: { before: 180, after: 80 } });
const B = (text, level = 0) => new Paragraph({ numbering: { reference: "bul", level }, children: runs(text), spacing: { after: 60, line: 288 } });
const N = (text) => new Paragraph({ numbering: { reference: "num", level: 0 }, children: runs(text), spacing: { after: 60, line: 288 } });
const NOTE = (text) => new Paragraph({ children: runs(text, { italics: true, color: GREY, size: 18 }), spacing: { after: 160 } });
const LINK = (label, url) => new Paragraph({
  numbering: { reference: "bul", level: 0 }, spacing: { after: 40 },
  children: [new TextRun({ text: label + " — ", font: FONT }), new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, style: "Hyperlink", font: FONT })] })],
});
function IMGP(file, wpx, hpx, caption) {
  const data = fs.readFileSync(path.join(IMG, file));
  const w = 640, h = Math.round((hpx / wpx) * w);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ type: "png", data, transformation: { width: w, height: h }, altText: { title: caption, description: caption, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: caption, italics: true, size: 18, color: GREY, font: FONT })] }),
  ];
}
const border = { style: BorderStyle.SINGLE, size: 4, color: "B7C4CC" };
const borders = { top: border, bottom: border, left: border, right: border };
function T(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = CW / total;
  const ws = widths.map((w) => Math.floor(w * scale));
  ws[ws.length - 1] += CW - ws.reduce((a, b) => a + b, 0);
  const cell = (t, i, hdr, shade) => new TableCell({
    width: { size: ws[i], type: WidthType.DXA }, borders,
    shading: hdr ? { fill: TEAL, type: ShadingType.CLEAR, color: "auto" } : (shade ? { fill: shade, type: ShadingType.CLEAR, color: "auto" } : undefined),
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: String(t).split("\n").map((line) => new Paragraph({
      alignment: (!hdr && opts.right && opts.right.includes(i)) ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: runs(line, hdr ? { bold: true, color: "FFFFFF", size: 18 } : { size: 18 }),
    })),
  });
  const trs = [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) })];
  rows.forEach((r, ri) => {
    const isTot = opts.totals && opts.totals.includes(ri);
    trs.push(new TableRow({ children: r.map((c, i) => cell(isTot ? `**${c}**` : c, i, false, isTot ? "D9EAD3" : (ri % 2 ? "F4F8FA" : undefined))) }));
  });
  return [new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: ws, layout: TableLayoutType.FIXED, rows: trs }), new Paragraph({ spacing: { after: 120 }, children: [] })];
}
function KEYBOX(items) {
  // 2 ustunli asosiy ko'rsatkichlar
  const w = Math.floor(CW / 2);
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(new TableRow({
      children: [0, 1].map((j) => {
        const it = items[i + j];
        return new TableCell({
          width: { size: w, type: WidthType.DXA }, borders, shading: { fill: "E3EEF3", type: ShadingType.CLEAR, color: "auto" },
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: it ? [
            new Paragraph({ children: [new TextRun({ text: it[0], font: FONT, size: 18, color: GREY })] }),
            new Paragraph({ children: [new TextRun({ text: it[1], font: FONT, size: 30, bold: true, color: NAVY })] }),
            new Paragraph({ children: [new TextRun({ text: it[2] || "", font: FONT, size: 16, color: GREY })] }),
          ] : [new Paragraph("")],
        });
      }),
    }));
  }
  return [new Table({ width: { size: w * 2, type: WidthType.DXA }, columnWidths: [w, w], rows }), new Paragraph({ spacing: { after: 160 }, children: [] })];
}

// ------------------------------------------------------------------ MAZMUN
const c = [];

// Titul
c.push(new Paragraph({ spacing: { before: 2200, after: 200 }, children: [new TextRun({ text: "STARTAP LOYIHA", font: FONT, size: 22, color: TEAL, bold: true })] }));
c.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "BioPlast Tech", font: FONT, size: 64, bold: true, color: NAVY })] }));
c.push(new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: "Mikroorganizmlar yordamida biologik parchalanadigan plastik (PHA) va undan kompost bo‘ladigan paket hamda plyonkalar ishlab chiqarish", font: FONT, size: 30, color: "222222" })] }));
c.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 4 } }, children: [] }));
c.push(new Paragraph({ spacing: { before: 300, after: 80 }, children: [new TextRun({ text: "Takomillashtirilgan biznes-reja: texnologiya, uskunalar, moliyaviy model", font: FONT, size: 24 })] }));
c.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Muallif: Asilbekova Z., Toshkent kimyo-texnologiya instituti talabasi", font: FONT, size: 22 })] }));
c.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Versiya 2.0 — 2026-yil oktabr", font: FONT, size: 22, color: GREY })] }));
c.push(new Paragraph({ spacing: { before: 1600 }, children: runs("Hujjat bilan birga **BioPlast_Tech_moliyaviy_model.xlsx** fayli beriladi: undagi barcha raqamlar formulalar bilan hisoblangan, ko‘k rangli farazlarni o‘zgartirib, natijani darhol ko‘rish mumkin.", { size: 18, color: GREY }) }));

// 0. Nima o'zgardi
c.push(H1("0. Dastlabki taqdimotga nisbatan nima o‘zgardi"));
c.push(P("Dastlabki 9 slaydli taqdimotda g‘oya to‘g‘ri tanlangan, ammo bir qator texnik va iqtisodiy ma’lumotlar xato yoki asossiz edi. Investor, grant komissiyasi yoki bank ularni birinchi navbatda tekshiradi, shuning uchun quyidagilar tuzatildi:"));
c.push(...T(["Dastlabki taqdimotda", "Muammo", "Tuzatilgan holat"], [
  ["1 t plastik narxi $250", "Oddiy polietilen ham ≈$1 200/t turadi. PHA bozor narxi $3 400–3 700/t (IMARC, 2025-dekabr).", "Paket/plyonka $3 900/t, toza PHA $4 500/t (QQSsiz)"],
  ["1 t tannarx $95, xomashyo $50", "1 t PHA uchun ~1,8 t yog‘ kerak — faqat xomashyo ≈$900.", `PHA tannarxi ${usd(D.pha_vc)}/t, paket tannarxi ${usd(D.film_vc)}/t`],
  ["$60 000 investitsiya, oyiga 50 t", "Oyiga 50 t PHA uchun ≈600 m³ fermenter hajmi kerak; bitta 10 m³ fermenterning o‘zi $50–90 ming.", `Ikki fazali CAPEX ${usd(D.capex)}; oyiga ~71 t tayyor mahsulot + ~4,8 t PHA`],
  ["Qoplanish muddati 8 oy", "Biotexnologik korxona uchun real emas.", `${D.payback.toFixed(1).replace(".", ",")} yil (model natijasi)`],
  ["Ralstonia eutropha va Cupriavidus «mecator» — ikki xil bakteriya", "Bu bitta tur: Ralstonia eutropha keyinchalik Cupriavidus necator deb qayta nomlangan. «mecator» — imlo xatosi.", "Asosiy shtamm: Cupriavidus necator H16 (DSM 428 / ATCC 17699)"],
  ["Bakteriyalar PHA va PLA ishlab chiqaradi", "PLA bakteriyadan to‘g‘ridan-to‘g‘ri olinmaydi: sut kislotasi bijg‘itiladi, so‘ng kimyoviy polimerlanadi (laktid orqali).", "O‘zimiz PHA ishlab chiqaramiz; PLA va PBAT tayyor granula sifatida sotib olinadi"],
  ["Barcha plastik 6–12 oyda tabiatda parchalanadi", "PLA faqat sanoat kompostida (58 °C) parchalanadi. Tuproq va dengizda faqat PHA tez parchalanadi.", "Har bir mahsulot uchun aniq sertifikat standarti ko‘rsatildi (3-bo‘lim)"],
  ["Genetik modifikatsiyalangan mikroorganizmlar", "GMO shtamm qo‘shimcha biologik xavfsizlik ruxsatlarini talab qiladi va ishga tushirishni sekinlashtiradi.", "1–2-yillarda yovvoyi (GMO bo‘lmagan) shtamm; GMO — keyingi bosqichda ilmiy ish sifatida"],
  ["«100% ekologik toza»", "Tasdiqlanmagan da’vo — reklama talablariga zid bo‘lishi mumkin.", "«EN 13432 bo‘yicha sertifikatlangan, kompostda parchalanadi» kabi aniq da’volar"],
], [24, 40, 36]));

// 1. Rezyume
c.push(H1("1. Loyiha rezyumesi"));
c.push(P("**BioPlast Tech** — Toshkent viloyatida joylashadigan kichik biotexnologik korxona. U ikki narsani birlashtiradi: (1) mahalliy yog‘-moy chiqindilaridan bakteriyalar yordamida **PHA biopolimeri** ishlab chiqarish va (2) PHA, PBAT va PLA aralashmasidan **kompost bo‘ladigan paket, chiqindi qopi va qishloq xo‘jaligi mulcha plyonkasi** tayyorlash."));
c.push(P("Nega ikki yo‘nalish? Kichik masshtabda faqat PHA sotish foyda keltirmaydi: tonnasining tannarxi bozor narxiga yaqin. Tayyor mahsulot (paket, plyonka) esa birinchi yildan daromad beradi, o‘zimiz ishlab chiqargan PHA esa mahsulotga raqobatchilarda yo‘q xususiyat beradi: tuproqda va uy kompostida parchalanish."));
c.push(...KEYBOX([
  ["Jami investitsiya (CAPEX, 2 faza)", usd(D.capex), `1-faza ${usd(D.capex1)} · 2-faza ${usd(D.capex2)}`],
  ["Moliyalashtirish ehtiyoji", usd(D.funding), `kredit ${usd(D.loan)} · grant ${usd(D.grant)} · investor ${usd(D.equity)}`],
  ["Barqaror yil daromadi (2031)", usd(D.rev4), `${D.film4} t paket/plyonka + ${D.phasale4.toFixed(1).replace(".", ",")} t PHA`],
  ["EBITDA (2031)", usd(D.ebitda4), `rentabellik ${pct(D.ebitda4 / D.rev4)}`],
  ["Sof foyda (2031)", usd(D.ni4), "soliq va kredit foizidan keyin"],
  ["Qoplanish muddati", D.payback.toFixed(1).replace(".", ",") + " yil", "2027-yil boshidan hisoblaganda"],
  ["IRR (7 yil, qoldiq qiymatsiz)", pct(D.irr), `NPV (15%) ${usd(D.npv)}; qoldiq qiymat bilan ${usd(D.npv_tv)}`],
  ["Zararsizlik nuqtasi", `${Math.round(D.be)} t/yil`, "paket/plyonka hajmi (quvvatning 34%)"],
  ["Ish o‘rinlari", `${D.staff1} → ${D.staff2}`, "1-yil → 2-yildan boshlab"],
  ["Ishlab chiqarish quvvati", "1 080 t/yil", "paket/plyonka; PHA ~58 t/yil"],
]));
c.push(NOTE("Barcha raqamlar QQSsiz, AQSh dollarida, inflyatsiyasiz (real) ifodada. Manbalar va farazlar «Kirish» varag‘ida ko‘rsatilgan."));

// 2. Muammo
c.push(H1("2. Muammo va bozor"));
c.push(H2("2.1. Global muammo"));
c.push(P("OECD ning «Global Plastics Outlook» hisobotiga (2022) ko‘ra, 2019-yilda dunyoda **460 mln t** plastik ishlatilgan va **353 mln t** plastik chiqindi hosil bo‘lgan. Yo‘qotishlarni hisobga olganda chiqindining atigi **9%** i qayta ishlangan, 19% yoqilgan, ~50% poligonlarga ko‘milgan, **22%** esa nazoratsiz tashlangan, ochiq yoqilgan yoki tabiatga chiqib ketgan. Plastik 2019-yilda global issiqxona gazlari chiqindilarining 3,4% ini bergan."));
c.push(NOTE("Eslatma: dastlabki taqdimotdagi «400 mln t chiqindi» raqami 2019-yildagi ishlab chiqarish hajmiga yaqin; chiqindi hajmi esa 353 mln t. Hujjatda manbadagi aniq raqamlar ishlatildi."));
c.push(H2("2.2. O‘zbekistondagi holat"));
c.push(B("2025-yil yanvarida plastik ifloslanishni kamaytirish bo‘yicha 2025–2027-yillarga mo‘ljallangan davlat dasturi **loyihasi** e’lon qilingan. Unda **2027-yildan polietilen paketlarni ishlab chiqarish, import qilish va ishlatishni taqiqlash**, biologik parchalanadigan muqobillarga o‘tish taklif qilingan (Kun.uz, Gazeta.uz, 2025-yil yanvar)."));
c.push(B("Loyihada ishlab chiqaruvchi va importchining kengaytirilgan javobgarligi (qadoq chiqindisini yig‘ish va qayta ishlash yig‘imi) ham ko‘zda tutilgan."));
c.push(B("**Muhim:** ochiq manbalarda dastur yakuniy qabul qilingani tasdiqlanmagan. Biznes-reja taqiq bo‘lmagan holatda ham ishlashi uchun hisoblangan; taqiq kuchga kirsa, talab keskin oshadi (bu qo‘shimcha imkoniyat)."));
c.push(H2("2.3. Maqsadli mijozlar"));
c.push(...T(["Segment", "Mahsulot", "Nega sotib oladi"], [
  ["Supermarket va do‘konlar tarmoqlari", "Kompost bo‘ladigan mayka-paket, fasovka paketi", "Taqiqqa tayyorgarlik, «yashil» imidj, eksport hamkorlar talabi"],
  ["Hokimliklar, obodonlashtirish, chiqindi kompaniyalari", "Organik chiqindi uchun kompost bo‘ladigan qoplar", "Organik chiqindini alohida yig‘ish va kompostlash"],
  ["Fermer va klaster xo‘jaliklari", "Tuproqda parchalanadigan mulcha plyonka (EN 17033)", "Mavsum oxirida plyonkani yig‘ish xarajati yo‘q, tuproq ifloslanmaydi"],
  ["HoReCa, yetkazib berish xizmatlari", "Paket, qadoq plyonkasi", "Mijozlar talabi, brend"],
  ["Ishlab chiqaruvchilar (eksport)", "Toza PHA granula", "Tibbiyot, kosmetika, 3D-printer filamenti uchun xomashyo"],
], [30, 34, 36]));
c.push(NOTE("Mahalliy paket bozori hajmi bo‘yicha ishonchli ochiq statistika topilmadi — bu 1-faza davomida marketing tadqiqoti (savdo tarmoqlari bilan intervyu, niyat xatlari) orqali aniqlanadi. Model 2031-yilda atigi 850 t/yil sotuvni nazarda tutadi."));
c.push(H2("2.4. Raqobat"));
c.push(P("Hozir O‘zbekistonda kompost bo‘ladigan paketlar asosan Xitoy, Turkiya va Rossiyadan import qilinadi. Ko‘plab «eko-paketlar» aslida **oksi-degradatsiyalanuvchi** polietilen (d2w qo‘shimchali) bo‘lib, ular mikroplastikka maydalanadi, biologik parchalanmaydi; Yevropa Ittifoqida 2021-yildan taqiqlangan. BioPlast Tech ning ustunligi: (1) mahalliy ishlab chiqarish — tezroq yetkazish va valyuta xavfi kamroq; (2) xalqaro sertifikat; (3) o‘z PHA si tufayli uyda kompost va tuproqda parchalanadigan mahsulot."));

// 3. Yechim va materiallar
c.push(H1("3. Yechim: materiallar va ularning xususiyatlari"));
c.push(H2("3.1. PHA, PLA va PBAT — farqi nimada"));
c.push(...T(["Ko‘rsatkich", "PHA (PHB/PHBV)", "PLA", "PBAT"], [
  ["Qanday olinadi", "Bakteriyalar hujayra ichida zaxira modda sifatida to‘playdi", "Shakarni sut kislotasiga bijg‘itish → kimyoviy polimerlash", "Neft-kimyo xomashyosidan sintez (biologik parchalanadi)"],
  ["Xomashyo", "Yog‘lar, shakar, glitserin, chiqindilar", "Makkajo‘xori, shakarqamish kraxmali", "Adipin kislota, tereftal kislota, butandiol"],
  ["Sanoat kompostida (58 °C)", "Ha", "Ha", "Ha"],
  ["Uy kompostida (20–30 °C)", "Ha", "Yo‘q", "Qisman (aralashmada)"],
  ["Tuproqda", "Ha", "Yo‘q (juda sekin)", "Aralashmada — EN 17033 bo‘yicha"],
  ["Dengiz suvida", "Ha", "Yo‘q", "Yo‘q"],
  ["Erish harorati", "PHB ~170–175 °C", "~150–175 °C", "~110–120 °C"],
  ["Xususiyati", "Qattiq, mo‘rt (PHB); PHBV elastikroq", "Qattiq, shaffof", "Juda elastik — plyonka uchun asos"],
  ["Narx (2025)", "$3 400–3 700/t va undan yuqori", "$2 000–2 500/t (Xitoy)", "≈$1 400/t (Xitoy, 9 850 yuan)"],
], [19, 27, 27, 27]));
c.push(P("Shuning uchun paket va plyonka uchun eng amaliy yechim — **aralashma (blend)**: PBAT elastiklik beradi, PLA mustahkamlik va qattiqlik beradi, PHA esa past haroratda va tuproqda parchalanishni tezlashtiradi. Bu yondashuv dunyodagi yetakchi kompost bo‘ladigan plyonkalarda ham qo‘llaniladi."));
c.push(H2("3.2. Biologik parchalanishning aniq mezonlari"));
c.push(P("«6–12 oyda parchalanadi» degan umumiy da’vo o‘rniga quyidagi xalqaro standartlar ishlatiladi:"));
c.push(...T(["Sharoit", "Standart / sertifikat", "Talab"], [
  ["Sanoat kompostlash", "EN 13432, ASTM D6400; TÜV AUSTRIA «OK compost INDUSTRIAL»", "58 °C da 6 oyda ≥90% biologik parchalanish"],
  ["Uy kompostlash", "TÜV AUSTRIA «OK compost HOME», AS 5810", "20–30 °C da 12 oyda ≥90%"],
  ["Tuproq", "«OK biodegradable SOIL»; mulcha uchun EN 17033", "25 °C da 2 yilda ≥90%"],
  ["Dengiz", "«OK biodegradable MARINE» (ASTM D6691 asosida)", "30 °C da 6 oyda ≥90%"],
], [22, 44, 34]));
c.push(NOTE("Manba: nova-institute, TÜV AUSTRIA sertifikatlash sxemalari sharhi."));
c.push(H2("3.3. Mahsulotlar qatori"));
c.push(...T(["Mahsulot", "Retsept (taxminiy)", "Sertifikat maqsadi", "Ulushi"], [
  ["Mayka-paket va fasovka paketi (15–30 mkm)", "PBAT 62% + PLA 24% + PHA 6,5% + qo‘shimchalar 8%", "OK compost INDUSTRIAL", "~60%"],
  ["Organik chiqindi qopi", "PBAT 65% + PLA 20% + PHA 7% + CaCO3", "OK compost INDUSTRIAL / HOME", "~20%"],
  ["Mulcha plyonka (12–15 mkm)", "PBAT 70% + PHA 15–20% + UV stabilizator", "EN 17033, OK biodegradable SOIL", "~15%"],
  ["Toza PHA granula", "PHB/PHBV ≥95%", "OK compost HOME, MARINE", "~5%"],
], [28, 36, 24, 12]));

// 4. Ishlash prinsipi
c.push(H1("4. Ishlash prinsipi: bakteriya qanday qilib plastik yasaydi"));
c.push(H2("4.1. Biologik asos"));
c.push(P("Ba’zi bakteriyalar odam yog‘ to‘plagani kabi «zaxira energiya» to‘playdi. Agar muhitda **uglerod (yog‘, shakar) ko‘p, azot yoki fosfor esa kam** bo‘lsa, hujayra bo‘linishni to‘xtatadi va ortiqcha uglerodni hujayra ichida mayda donachalar ko‘rinishida **polihidroksialkanoat (PHA)** sifatida saqlaydi. Cupriavidus necator da bu donachalar hujayra quruq massasining **70–80%** ini (ba’zi tajribalarda 90% gacha) tashkil etishi mumkin."));
c.push(P("Biokimyoviy yo‘l (PHB uchun) uch fermentdan iborat:"));
c.push(N("**β-ketotiolaza (PhaA):** ikki molekula atsetil-KoA → atsetoatsetil-KoA."));
c.push(N("**Atsetoatsetil-KoA reduktaza (PhaB):** NADPH yordamida → (R)-3-gidroksibutiril-KoA."));
c.push(N("**PHA-sintaza (PhaC):** monomerlarni zanjirga ulaydi → poli-3-gidroksibutirat (PHB) donachasi."));
c.push(P("Muhitga propion kislotasi yoki valerat qo‘shilsa, zanjirga 3-gidroksivalerat birligi kiradi va **PHBV** hosil bo‘ladi — u PHB ga qaraganda elastikroq va qayta ishlashga qulayroq."));
c.push(H2("4.2. Shtammlarni tanlash"));
c.push(...T(["Shtamm", "Polimer turi", "Afzalligi", "Qayerdan olish"], [
  ["**Cupriavidus necator H16** (eski nomi Ralstonia eutropha) — asosiy", "scl-PHA: PHB, PHBV", "Sanoatda eng ko‘p o‘rganilgan; o‘simlik yog‘larida yuqori chiqish; GMO emas", "DSMZ (DSM 428), ATCC (17699), LMG 1201"],
  ["**Pseudomonas putida KT2440** — qo‘shimcha", "mcl-PHA (elastik, kauchuksimon)", "Yog‘ kislotalari va glitserinda o‘sadi; elastik mahsulotlar uchun", "DSMZ (DSM 6125), ATCC (47054)"],
  ["Haloferax mediterranei — kelajak uchun", "PHBV", "Sho‘r muhitda o‘sadi — sterilizatsiyasiz ishlash imkoni, energiya tejaladi", "DSMZ (DSM 1411)"],
], [30, 18, 32, 20]));
c.push(P("Shtamm xalqaro kolleksiyadan xarid qilinadi (DSMZ katalogida DSM 428 uchun Nagoya protokoli cheklovlari yo‘q). Shuningdek, O‘zbekiston FA Mikrobiologiya institutining kolleksiyasi va mahalliy tuproq/yog‘ chiqindilaridan yangi mahalliy shtammlar ajratish TKTI bilan qo‘shma ilmiy ish sifatida rejalashtiriladi."));
c.push(H2("4.3. Xomashyo: nima uchun yog‘ chiqindisi"));
c.push(B("**Ishlatilgan o‘simlik yog‘i** (restoran, oshxona, fabrika-oshxonalardan) va **soapstok** (yog‘-moy kombinatlarida yog‘ni tozalashdan chiqadigan chiqindi) — O‘zbekistonda paxta yog‘i va kungaboqar yog‘i ishlab chiqarish keng tarqalgan, bu chiqindilar doimiy mavjud."));
c.push(B("Yog‘ tarkibida uglerod shakarga nisbatan ko‘p: nazariy chiqish ~0,7–0,8 kg PHA/kg yog‘ (shakarda ~0,48). Modelda ehtiyotkorlik bilan **0,55 kg/kg** olingan."));
c.push(B("Shakar sanoati melassasi, sut zardobi (whey) va biodizel glitserini — zaxira xomashyo. Paxta poyasi va somon (lignotsellyuloza) — oldindan gidroliz talab qiladi, shuning uchun faqat ilmiy ish sifatida."));
c.push(B("Har bir partiya xomashyo uchun kirish nazorati: kislota soni, namlik, mexanik aralashmalar."));

// 5. Texnologik jarayon
c.push(H1("5. Texnologik jarayon — bosqichma-bosqich"));
c.push(...IMGP("process_flow.png", 2560, 640, "1-rasm. BioPlast Tech texnologik sxemasi"));
c.push(...T(["Bosqich", "Nima qilinadi", "Asosiy parametrlar", "Uskuna"], [
  ["1. Xomashyo tayyorlash", "Yog‘ filtrlanadi, isitiladi, emulsiyalanadi; ozuqa tuzlari eritiladi; muhit sterilizatsiya qilinadi", "121 °C, 20–30 daqiqa; yog‘ alohida sterillanadi", "Muhit tayyorlash idishlari, sterilizator, bug‘ qozoni"],
  ["2. Urug‘ (inokulyum) tayyorlash", "Shtamm muzlatilgan zaxiradan kolbaga → 30 L → 1 m³ urug‘ fermenteriga", "30 °C, pH 6,8–7,0; har bosqichda 5–10% inokulyum", "Shaker-inkubator, laminar boks, 30 L va 1 m³ fermenter"],
  ["3. Fermentatsiya (fed-batch)", "1-faza: o‘sish (azot yetarli). 2-faza: azot cheklanadi, yog‘ bosqichma-bosqich beriladi → PHA to‘planadi", "30 °C; pH 6,8 (NH4OH bilan); erigan kislorod >20%; 48–72 soat; yakunda 80–100 g/L biomassa, 60–75% PHA", "2 × 10 m³ fermenter (ishchi hajm 7 m³), havo puflagich, steril filtrlar"],
  ["4. Biomassani ajratish", "Suyuqlik disk separatorda konsentratlanadi", "Biomassa 15–25% quruq modda", "Disk separatori"],
  ["5. PHA ni ajratib olish (erituvchisiz)", "Hujayra devori ishqor (NaOH) va SDS bilan parchalanadi, PHA donachalari qoladi; 2–3 marta suv bilan yuviladi", "pH 11–12, 30–60 daqiqa; PHA tozaligi ≥95%, ajratish unumi ~85%", "Reaktorlar, 2-separator"],
  ["6. Quritish", "PHA suspenziyasi purkab quritiladi", "Kirish 180–200 °C, chiqish 80–90 °C; namlik <0,5%", "Purkab quritgich"],
  ["7. Kompaundlash", "PHA + PBAT + PLA + qo‘shimchalar granulaga aylantiriladi", "150–175 °C; PHA uchun qisqa ushlab turish vaqti (termik parchalanmasligi uchun)", "Ikki shnekli ekstruder, granulyator"],
  ["8. Plyonka va paket", "Plyonka puflanadi, bosma qilinadi, kesiladi", "Qalinlik 12–30 mkm; puflash nisbati 2,5–3,5", "Plyonka liniyasi, fleksobosma, paket mashinasi"],
  ["9. Sifat nazorati", "Har partiya tekshiriladi", "PHA miqdori (GC), MFI, cho‘zilishga mustahkamlik, qalinlik", "GC-FID, MFI asbobi, sinov mashinasi"],
], [16, 30, 30, 24]));
c.push(H2("5.1. Bitta partiyaning moddiy balansi (10 m³ fermenter)"));
c.push(...T(["Ko‘rsatkich", "Qiymat", "Izoh"], [
  ["Ishchi hajm", "7 000 L", "Fermenterning 70% i"],
  ["Yakuniy PHA konsentratsiyasi", "60 g/L", "≈90 g/L biomassa × 67% PHA"],
  ["Fermenterdagi PHA", "420 kg", "7 000 L × 60 g/L"],
  ["Ajratish unumi", "85%", "Yuvish va quritishdagi yo‘qotishlar"],
  ["Tayyor PHA bir partiyadan", "≈357 kg", ""],
  ["Sarflangan yog‘", "≈760 kg", "420 kg / 0,55"],
  ["Partiya davomiyligi", "4 sutka", "72 soat fermentatsiya + 24 soat yuvish, sterillash"],
  ["Yillik partiyalar", "≈160", "2 fermenter × 330 kun / 4 sutka"],
  ["Yillik PHA", "≈57 t", "Modelda 55–58 t olingan"],
], [34, 18, 48]));
c.push(H2("5.2. Ekologik xavfsizlik va chiqindilar"));
c.push(B("Erituvchisiz (xloroform ishlatilmaydigan) ajratish usuli tanlandi — ishchilar uchun xavfsiz, ekologik ekspertizadan o‘tish oson."));
c.push(B("Oqova suv neytrallanadi va dastlabki tozalashdan o‘tkaziladi; hujayra qoldiqlari (oqsilga boy biomassa) — kompost yoki biogaz uchun xomashyo."));
c.push(B("Bug‘ kondensati qozonga qaytariladi; sovutish suvi aylanma tizimda."));
c.push(B("Ishlatilgan shtamm (C. necator H16) — 1-xavf guruhidagi, odam uchun patogen bo‘lmagan bakteriya."));

// 6. Uskunalar
c.push(H1("6. Uskunalar: ro‘yxat, narx va yetkazib beruvchilar"));
c.push(P("Quyidagi jadval ikki fazaga bo‘lingan. Narxlar ochiq bozor e’lonlari va ishlab chiqaruvchilarning narx diapazonlari asosida olingan **taxminiy** qiymatlar: masalan, Xitoy ishlab chiqaruvchisining 5 000 L avtomatik bioreaktori $50 000 atrofida, 500 L laboratoriya-pilot tizimi $18 000 dan e’lon qilingan. Sotib olishdan oldin har bir pozitsiya bo‘yicha kamida 3 ta tijorat taklifi (KP) olinadi."));
c.push(...T(["Uskuna", "Faza", "Soni", "Narx", "Yetkazib beruvchilar (misol)"], D.capex_items.map((r) => [r[0], String(r[1]), String(r[3]), usd(r[4] * r[3]), r[6]]), [40, 7, 7, 12, 34], { right: [3] }));
c.push(...T(["CAPEX jamlanmasi", "1-faza (2027)", "2-faza (2028)", "Jami"], [
  ["Uskunalar", usd(D.cx.eq[0]), usd(D.cx.eq[1]), usd(D.cx.eq[2])],
  ["Yetkazish, bojxona (12%)", usd(D.cx.frt[0]), usd(D.cx.frt[1]), usd(D.cx.frt[2])],
  ["Montaj, quvurlar, elektr (15%)", usd(D.cx.inst[0]), usd(D.cx.inst[1]), usd(D.cx.inst[2])],
  ["Bino ta’miri, sertifikat, loyihalash", usd(D.cx.oth[0]), usd(D.cx.oth[1]), usd(D.cx.oth[2])],
  ["Kutilmagan xarajatlar (10%)", usd(D.cx.cont[0]), usd(D.cx.cont[1]), usd(D.cx.cont[2])],
  ["JAMI CAPEX", usd(D.cx.tot[0]), usd(D.cx.tot[1]), usd(D.cx.tot[2])],
], [40, 20, 20, 20], { right: [1, 2, 3], totals: [5] }));

c.push(H2("6.1. Uskunalar rasmlarini qayerdan olish mumkin"));
c.push(P("Dastlabki taqdimotdagi rasmlarning aksariyati sun’iy intellekt yaratgan tasvirlar edi. Komissiya oldida real uskuna va real mikroskop suratlari ancha ishonchli ko‘rinadi. Rasmlarni quyidagi manbalardan olish tavsiya etiladi:"));
c.push(H3("A) Ishlab chiqaruvchilarning rasmiy saytlari (eng sifatli rasmlar)"));
[
  ["Bioreaktorlar (laboratoriya, pilot): Sartorius BIOSTAT", "https://www.sartorius.com"],
  ["Bioreaktorlar: Eppendorf BioFlo / Innova shakerlar", "https://www.eppendorf.com"],
  ["Disk separatorlar: Alfa Laval", "https://www.alfalaval.com"],
  ["Separatorlar, purkab quritgichlar: GEA", "https://www.gea.com"],
  ["Ikki shnekli ekstruderlar: Coperion ZSK", "https://www.coperion.com"],
  ["Havo kompressor/puflagichlari: Atlas Copco", "https://www.atlascopco.com"],
  ["Gaz xromatograf: Agilent", "https://www.agilent.com"],
  ["Gaz xromatograf, spektrofotometr: Shimadzu", "https://www.shimadzu.com"],
  ["Mexanik sinov mashinalari: ZwickRoell", "https://www.zwickroell.com"],
  ["Avtoklavlar: Tuttnauer", "https://www.tuttnauer.com"],
].forEach(([l, u]) => c.push(LINK(l, u)));
c.push(H3("B) B2B savdo maydonchalari (Xitoy uskunalari, narx bilan birga)"));
[
  ["Alibaba — «stainless steel fermenter 5000L» qidiruvi", "https://www.alibaba.com/trade/search?SearchText=stainless+steel+fermenter+5000L"],
  ["Alibaba — «biodegradable blown film machine»", "https://www.alibaba.com/trade/search?SearchText=biodegradable+blown+film+machine"],
  ["Made-in-China — bioreaktor ishlab chiqaruvchilari", "https://www.made-in-china.com/factory/bioreactor.html"],
  ["Shanghai Bailun / Bailun Biotechnology (Jiangsu) profili", "https://www.cphi-online.com/company/bailun-biotechnology-jiangsu-co-ltd/"],
].forEach(([l, u]) => c.push(LINK(l, u)));
c.push(P("Bu saytlarda har bir mahsulot sahifasida 5–10 ta surat va texnik tavsif bor. Yetkazib beruvchiga so‘rov yuborilganda odatda yuqori aniqlikdagi rasm, chizma va video ham yuboriladi — taqdimot uchun shu eng to‘g‘ri yo‘l."));
c.push(H3("C) Erkin litsenziyali rasmlar"));
c.push(LINK("Wikimedia Commons (CC litsenziyali; «Bioreactor», «Disc stack centrifuge», «Spray dryer», «Blown film extrusion» deb qidiring)", "https://commons.wikimedia.org"));
c.push(H3("D) O‘zingiz yaratadigan rasmlar"));
c.push(B("Shtammning mikroskop surati: PHA donachalarini **Nil qizili (Nile Red)** yoki **Sudan qora B** bo‘yog‘i bilan bo‘yab suratga olish — bu taqdimotdagi eng kuchli dalil bo‘ladi (PHA donachalari hujayra ichida aniq ko‘rinadi)."));
c.push(B("Laboratoriyada olingan birinchi PHA kukuni va undan quyilgan plyonka namunasining surati."));
c.push(NOTE("Litsenziya bo‘yicha eslatma: ishlab chiqaruvchi saytidagi rasmlar mualliflik huquqi bilan himoyalangan. Talabalik taqdimotida manba ko‘rsatilgan holda ishlatish odatda muammo tug‘dirmaydi, lekin rasmiy (tijorat) hujjatlarda yetkazib beruvchidan ruxsat olish yoki CC litsenziyali rasm ishlatish kerak."));

// 7. Joylashuv va xodimlar
c.push(H1("7. Joylashuv, infratuzilma va xodimlar"));
c.push(H2("7.1. Joylashuv"));
c.push(P("Tavsiya: **Toshkent viloyatidagi sanoat zonasi yoki erkin iqtisodiy zona** (masalan, Chirchiq, Olmaliq, Yangiyo‘l yo‘nalishlari). Sabablari: TKTI va laboratoriyalarga yaqinlik, asosiy mijozlar (Toshkent savdo tarmoqlari) 50 km radiusda, yog‘-moy korxonalari va HoReCa chiqindilari ko‘p, gaz va uch fazali elektr ulanishi mavjud. Farg‘ona vodiysi — qishloq xo‘jaligi mulcha plyonkasi bozori uchun ikkinchi bosqichdagi filial."));
c.push(...T(["Talab", "Miqdor"], [
  ["Ishlab chiqarish maydoni", "1 500 m² (shundan ~150 m² laboratoriya va toza xona)"],
  ["Elektr quvvati", "≈400–500 kVt o‘rnatilgan quvvat, uch faza 0,4 kV"],
  ["Tabiiy gaz", "≈60–80 m³/soat (1 t/soat bug‘ qozoni)"],
  ["Suv", "≈30–50 m³/sutka; kanalizatsiyaga ulanish"],
  ["Transport", "Yuk mashinasi kirishi, avtomobil yo‘liga yaqinlik"],
], [40, 60]));
c.push(H2("7.2. Xodimlar"));
c.push(...T(["Lavozim", "1-yil", "2-yildan", "Oylik ($)"], D.staff.map((s) => [s[0], String(s[1]), String(s[2]), usd(s[3])]).concat([["Jami", String(D.staff1), String(D.staff2), ""]]), [52, 14, 14, 20], { right: [1, 2, 3], totals: [D.staff.length] }));
c.push(NOTE(`Ish haqi fondi ijtimoiy soliq (12%) bilan: 1-yil ${usd(D.pay1)}, 2-yildan ${usd(D.pay2)}. Taqqoslash uchun: 2026-yil I choragida O‘zbekistonda o‘rtacha oylik 6,8 mln so‘m (~$570).`));

// 8. Moliyaviy reja
c.push(H1("8. Moliyaviy reja"));
c.push(H2("8.1. Asosiy farazlar"));
c.push(...T(["Faraz", "Qiymat", "Manba"], [
  ["Valyuta kursi", "12 000 so‘m/$", "O‘zR MB, 22.10.2026: 11 966 so‘m"],
  ["Elektr energiya (yuridik shaxslar)", "1 100 so‘m/kVt·soat", "VM qarori, 01.06.2026 dan"],
  ["Tabiiy gaz (yuridik shaxslar)", "2 000 so‘m/m³", "01.06.2026 dan"],
  ["Foyda solig‘i / ijtimoiy soliq", "15% / 12%", "O‘zR Soliq kodeksi"],
  ["PBAT narxi (yetkazilgan)", "$1 700/t", "Xitoy: 9 850 yuan/t (CICC, 09.2025) + logistika"],
  ["PLA narxi (yetkazilgan)", "$2 600/t", "Xitoy: $2 010–2 520/t (Intratec, 2025) + logistika"],
  ["Yog‘ chiqindisi narxi", "$500/t", "Faraz — yetkazib beruvchi bilan shartnoma orqali tasdiqlanadi"],
  ["Paket/plyonka sotish narxi", "$3 900/t", "Oddiy PE paketdan ~2 baravar qimmat; importdan arzon"],
  ["Toza PHA sotish narxi", "$4 500/t", "IMARC: $3 443–3 712/t (2025-dek.); Mordor: $4 000–15 000/t"],
  ["Diskont stavkasi", "15%", "Startap xavfi hisobga olingan"],
], [36, 22, 42]));
c.push(H2("8.2. Tannarx"));
c.push(...T(["1 t toza PHA", "$/t", "", "1 t kompost bo‘ladigan paket", "$/t"],
  D.pha_lines.map((r, i) => [r[0], usd(r[1]), "", D.film_lines[i] ? D.film_lines[i][0] : "", D.film_lines[i] ? usd(D.film_lines[i][1]) : ""])
    .concat([["PHA tannarxi", usd(D.pha_vc), "", "Paket tannarxi", usd(D.film_vc)]]),
  [30, 14, 4, 36, 16], { right: [1, 4], totals: [D.pha_lines.length] }));
c.push(...IMGP("chart_unitcost.png", 1600, 704, "2-rasm. Paket tannarxining tarkibi: asosiy xarajat — sotib olinadigan PBAT va PLA"));
c.push(P(`Har bir tonna paketdan marjinal foyda (sotish xarajatidan oldin) **${usd(D.film_margin)}** yoki ${pct(D.film_margin / 3900)}. PHA ning o‘z tannarxi (${usd(D.pha_vc)}/t) bozor narxidan ($3 400–4 500/t) past — demak, PHA ni o‘zimiz ishlab chiqarish uni sotib olishdan arzon.`));
c.push(H2("8.3. Daromad va foyda prognozi"));
const yrs = D.years;
const rowOf = (lab, arr, f = th) => [lab].concat(arr.map((v) => f(v)));
c.push(...T(["ming $"].concat(yrs), [
  rowOf("Paket/plyonka, t", D.film, (v) => (v ? String(Math.round(v)) : "–")),
  rowOf("PHA ishlab chiqarish, t", D.pha, (v) => (v ? String(Math.round(v)) : "–")),
  rowOf("Daromad", D.rev),
  rowOf("Marjinal foyda", D.gp),
  rowOf("Doimiy xarajatlar", D.fc),
  rowOf("EBITDA", D.ebitda),
  rowOf("Amortizatsiya", D.dep),
  rowOf("Kredit foizi", D.int),
  rowOf("Sof foyda", D.ni),
  rowOf("Erkin pul oqimi", D.fcf),
  rowOf("Kumulyativ FCF", D.cfcf),
], [24, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5], { right: [1, 2, 3, 4, 5, 6, 7, 8], totals: [5, 8] }));
c.push(NOTE("Qavs ichidagi raqamlar — manfiy qiymat (zarar yoki pul chiqishi)."));
c.push(...IMGP("chart_revenue.png", 1600, 800, "3-rasm. Daromad va EBITDA dinamikasi"));
c.push(...IMGP("chart_cashflow.png", 1600, 736, "4-rasm. Kumulyativ erkin pul oqimi: 2031-yil o‘rtasida nolga chiqadi"));
c.push(H2("8.4. Investitsiya samaradorligi"));
c.push(...T(["Ko‘rsatkich", "Qiymat", "Izoh"], [
  ["NPV (15%, 7 yil, qoldiq qiymatsiz)", usd(D.npv), "Musbat — loyiha 15% talab qilingan daromadlilikni qoplaydi"],
  ["NPV qoldiq qiymat bilan", usd(D.npv_tv), "7-yildan keyin korxona ishlashda davom etadi (5× FCF)"],
  ["IRR (7 yil)", pct(D.irr), "Qoldiq qiymat hisobga olinmagan — konservativ"],
  ["Oddiy qoplanish muddati", D.payback.toFixed(1).replace(".", ",") + " yil", "2027-yil boshidan"],
  ["Zararsizlik nuqtasi", Math.round(D.be) + " t/yil paket", "Quvvatning ~34% i"],
  ["DSCR (qarzni qoplash), 2029–2033", D.dscr.map((v) => v.toFixed(2).replace(".", ",")).join(" · "), "Banklar odatda ≥1,2 talab qiladi"],
], [36, 24, 40]));
c.push(H2("8.5. Moliyalashtirish tuzilmasi"));
c.push(...T(["Manba", "Summa", "Ulush", "Shartlar"], [
  ["Bank krediti (USD)", usd(D.loan), pct(D.loan / D.funding), "10%, 1,5 yil imtiyozli davr, 5 yilda qaytarish; garov — uskunalar"],
  ["Innovatsion grant", usd(D.grant), pct(D.grant / D.funding), "Oliy ta’lim, fan va innovatsiyalar vazirligi va boshqa grant dasturlari (tanlov orqali)"],
  ["Investor / ta’sischi kapitali", usd(D.equity), pct(D.equity / D.funding), "1-faza: ~$563 ming (seed), 2-faza: ~$639 ming (A raund)"],
  ["JAMI", usd(D.funding), "100%", `CAPEX ${usd(D.capex)} + aylanma mablag‘ $400 000`],
], [24, 16, 10, 50], { right: [1, 2], totals: [3] }));
c.push(P("Investitsiyani bosqichma-bosqich jalb qilish xavfni kamaytiradi: 2-faza (PHA zavodi) uchun mablag‘ faqat 1-fazada pilot natijalari (PHA miqdori ≥60%, laboratoriyada ≥0,5 kg/kg chiqish) va birinchi sotuvlar tasdiqlangandan keyin so‘raladi."));
c.push(H2("8.6. Sezgirlik tahlili (2031-yil EBITDA)"));
c.push(...T(["Paket narxi \\ PBAT narxi", "−20%", "−10%", "0", "+10%", "+20%"],
  D.sens.map((r, i) => [["−20%", "−10%", "0", "+10%", "+20%"][i]].concat(r.map((v) => usd(v)))), [24, 15, 15, 15, 15, 16], { right: [1, 2, 3, 4, 5] }));
c.push(P("Eng katta xavf — **sotish narxi**: narx 20% pasayib, PBAT 20% qimmatlashsa, EBITDA deyarli nolga tushadi. Shuning uchun yirik mijozlar bilan 1 yillik narx kelishuvlari va PBAT ni bir nechta yetkazib beruvchidan olish rejalashtiriladi."));

// 9. Reja va xavflar
c.push(H1("9. Amalga oshirish rejasi va xavflar"));
c.push(H2("9.1. Kalendar reja"));
c.push(...T(["Davr", "Ishlar", "Natija (KPI)"], [
  ["2026 IV chorak", "MChJ ro‘yxatdan o‘tkazish; TKTI bilan hamkorlik shartnomasi; shtamm xarid qilish; grantga ariza", "Shtamm olingan, grant arizasi topshirilgan"],
  ["2027 I–II chorak", "Bino ijarasi va ta’miri; laboratoriya; kolbada va 5 L reaktorda tajribalar", "PHA miqdori ≥60% quruq massada"],
  ["2027 III–IV chorak", "Ekstruder va 1-plyonka liniyasini o‘rnatish; 300 L pilot; sertifikatlash namunalarini yuborish", "Birinchi 10 t paket, 5 ta mijoz bilan niyat xati"],
  ["2028", "Sotuvni boshlash (300 t); OK compost INDUSTRIAL sertifikati; 2-faza uchun investitsiya jalb qilish", "Daromad ≈$1,2 mln; EBITDA musbat"],
  ["2028 II yarmi – 2029", "2 × 10 m³ fermenter, ajratish liniyasi, 2-plyonka liniyasi", "PHA ≈25 t (2029), 55 t (2030)"],
  ["2030–2031", "To‘liq quvvat; mulcha plyonka (EN 17033); eksport (Qozog‘iston, Qirg‘iziston)", "850 t mahsulot, EBITDA ≈$840 ming"],
  ["2032+", "3-faza: 50–100 m³ fermenterlar, PHA ≈500 t/yil — tannarxni $2 000/t dan pasaytirish", "Alohida investitsiya loyihasi"],
], [18, 52, 30]));
c.push(H2("9.2. Xavflar va ularni kamaytirish"));
c.push(...T(["Xavf", "Ehtimol", "Ta’sir", "Kamaytirish choralari"], [
  ["Paket narxi past bo‘lishi (arzon import, soxta «eko-paket»lar)", "O‘rta", "Yuqori", "Sertifikat va markirovka; mijozlarga sinov protokollari; davlat xaridlari"],
  ["Paketlar taqiqi qabul qilinmasligi yoki kechikishi", "O‘rta", "O‘rta", "Model taqiqsiz hisoblangan; korporativ ESG mijozlariga yo‘nalish"],
  ["PBAT/PLA narxi va valyuta kursi o‘zgarishi", "O‘rta", "O‘rta", "2–3 yetkazib beruvchi; 2–3 oylik zaxira; narxni dollarga bog‘lash"],
  ["Fermentatsiyada ifloslanish (kontaminatsiya)", "O‘rta", "O‘rta", "SIP/CIP, steril filtrlar, GMP tartiblari; urug‘ zaxirasi"],
  ["PHA chiqishi rejadan past", "O‘rta", "Past", "PHA ulushi kichik; yetishmasa sotib olinadi (model buni hisoblaydi)"],
  ["Yog‘ chiqindisi sifati o‘zgaruvchan", "Yuqori", "Past", "Kirish nazorati, aralashtirish, zaxira xomashyo (melassa, glitserin)"],
  ["Kredit va investitsiya jalb qilinmasligi", "O‘rta", "Yuqori", "Faza bo‘yicha jalb qilish; 1-faza o‘zi daromad keltiradi"],
], [34, 11, 11, 44]));

// 10. Huquqiy
c.push(H1("10. Huquqiy va sertifikatlash masalalari"));
c.push(B("Tashkiliy-huquqiy shakl: MChJ; faoliyat kodi — plastmassa mahsulotlari va birlamchi plastmassa ishlab chiqarish."));
c.push(B("Davlat ekologik ekspertizasi xulosasi (Ekologiya, atrof-muhitni muhofaza qilish va iqlim o‘zgarishi vazirligi)."));
c.push(B("Sanitariya-epidemiologiya xulosasi; oziq-ovqat bilan aloqa qiladigan mahsulot uchun qo‘shimcha sinovlar (Yevropa me’yori EU 10/2011 ga muvofiqlik — eksport uchun)."));
c.push(B("Mahsulot sertifikati — O‘zstandart agentligi tizimida."));
c.push(B("Xalqaro sertifikatlar: TÜV AUSTRIA (OK compost INDUSTRIAL/HOME, OK biodegradable SOIL), DIN CERTCO (Seedling) — eksport va yirik tarmoqlar uchun."));
c.push(B("Mikroorganizm bilan ishlash: 1-xavf guruhidagi shtamm, GMO emas — standart laboratoriya biologik xavfsizlik qoidalari yetarli."));
c.push(B("Intellektual mulk: retsept va jarayon «nou-xau» sifatida himoyalanadi; mahalliy shtamm ajratilsa — patent (O‘zbekiston Adliya vazirligi huzuridagi Intellektual mulk markazi)."));

// 11. Xulosa
c.push(H1("11. Xulosa"));
c.push(P("BioPlast Tech ning takomillashtirilgan modeli quyidagilarga asoslanadi: real bozor narxlari, real uskuna narxlari va bosqichma-bosqich rivojlanish. Birinchi bosqichda korxona tayyor biopolimerlardan sertifikatlangan kompost bo‘ladigan mahsulot ishlab chiqarib daromad oladi, parallel ravishda mahalliy yog‘ chiqindilaridan PHA olish texnologiyasini pilot darajasida isbotlaydi. Ikkinchi bosqichda o‘z PHA zavodi ishga tushadi va mahsulotlar tuproqda va uy kompostida parchalanadigan bo‘ladi."));
c.push(P(`Natija: ${usd(D.capex)} investitsiya bilan 2031-yilda ${usd(D.rev4)} daromad, ${usd(D.ebitda4)} EBITDA, ${D.staff2} ta ish o‘rni va ${D.payback.toFixed(1).replace(".", ",")} yillik qoplanish muddati. Bu dastlabki taqdimotdagi raqamlardan kamtarroq, lekin tekshiruvdan o‘ta oladigan va investor ishonadigan raqamlar.`));
c.push(P("**BioPlast Tech: kelajakni bugundan yaratamiz!**", { align: AlignmentType.CENTER }));

// Manbalar
c.push(H1("Manbalar"));
[
  ["OECD Global Plastics Outlook (2022) bo‘yicha AFP xabari", "https://www.africanews.com/2022/02/23/only-nine-percent-of-plastic-recycled-worldwide-oecd/"],
  ["Kun.uz — O‘zbekiston 2027-yildan paketlarni taqiqlashni rejalashtirmoqda (10.01.2025)", "https://kun.uz/en/news/2025/01/10/uzbekistan-plans-to-ban-plastic-bags-starting-in-2027"],
  ["Gazeta.uz — plastik paketlar bo‘yicha dastur loyihasi (11.01.2025)", "https://gazeta.uz/en/2025/01/11/plastic-bags"],
  ["Kun.uz — elektr va gaz tariflari 1-iyundan (15.05.2026)", "https://kun.uz/en/news/2026/05/15/uzbekistan-to-raise-electricity-and-natural-gas-tariffs-from-june-1"],
  ["Interfax — tariflar oshishi (15.05.2026)", "https://interfax.com/newsroom/top-stories/117593/"],
  ["Zamin.uz — valyuta kurslari, 22.10.2026", "https://zamin.uz/en/economy/225140-exchange-rates-for-october-22-were-announced.html"],
  ["IMARC — PHA narx indeksi", "https://www.imarcgroup.com/polyhydroxyalkanoates-pricing-report"],
  ["Mordor Intelligence — PHA bozori", "https://www.mordorintelligence.com/industry-reports/polyhydroxyalkanoate-market"],
  ["Intratec — PLA narxlari", "https://www.intratec.us/chemical-markets/polylactic-acid-price"],
  ["CICC — PBAT narxi (Longbridge)", "https://longbridge.com/en/news/259015731"],
  ["DSMZ — Cupriavidus necator H16 (DSM 428)", "https://www.dsmz.de/collection/catalogue/details/culture/DSM-428"],
  ["Frontiers in Bioeng. & Biotech. (2022) — C. necator dan PHB olish sharhi", "https://www.frontiersin.org/articles/10.3389/fbioe.2022.946085/full"],
  ["nova-institute — biologik parchalanish sertifikatlari sharhi", "https://nova-institute.eu/wp-content/plugins/nova-pr/pr_download.php?id=1917"],
  ["TÜV AUSTRIA — Green Marks (OK compost)", "https://en.tuv.at/tag/green-marks"],
  ["WageIndicator — O‘zbekistonda eng kam ish haqi", "https://wageindicator.org/salary/minimum-wage/uzbekistan"],
  ["Kun.uz — o‘rtacha ish haqi 6,8 mln so‘m (28.04.2026)", "https://kun.uz/ru/news/2026/04/28/srednyaya-zarplata-v-uzbekistane-dostigla-68-mln-sumov"],
].forEach(([l, u]) => c.push(LINK(l, u)));

const doc = new Document({
  creator: "BioPlast Tech", title: "BioPlast Tech — takomillashtirilgan biznes-reja",
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: NAVY, font: FONT }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: TEAL, font: FONT }, paragraph: { outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: "333333", font: FONT }, paragraph: { outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BioPlast Tech — biznes-reja · ", font: FONT, size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GREY })] })] }) },
    children: c,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("saved", OUT); });
