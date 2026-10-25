# BioPlast Tech — takomillashtirilgan loyiha (v2.0)

Mikroorganizmlar yordamida biologik parchalanadigan plastik (PHA) va undan kompost bo‘ladigan paket/plyonka ishlab chiqarish startapi.
Muallif: Asilbekova Z. (TKTI). Dastlabki 9 slaydli taqdimot asosida qayta ishlangan.

## Fayllar
| Fayl | Nima |
|---|---|
| `BioPlast_Tech_biznes_reja.docx` | To‘liq biznes-reja (21 bet): muammo, ishlash prinsipi, texnologiya, uskunalar va rasmlar manbalari, moliya, xavflar, manbalar |
| `BioPlast_Tech_taqdimot.pptx` | Yangilangan taqdimot (16 slayd) |
| `BioPlast_Tech_moliyaviy_model.xlsx` | Formulali moliyaviy model: Kirish (farazlar), CAPEX, Xodimlar, Tannarx, Prognoz (2027–2034, NPV/IRR), Sezgirlik, Eski vs Yangi |
| `zavod-3d/index.html` | Zavodning interaktiv 3D modeli (Three.js): barcha uskunalar, quvurlardagi oqimlar, 11 bosqichli jarayon, har uskunaning ishlash tamoyili |
| `rasmlar/` | Texnologik sxema va grafiklar (PNG) |
| `scripts/` | Fayllarni qayta yaratish skriptlari |

## Asosiy natijalar (model bo‘yicha)
- Jami CAPEX: **$1 703 972** (1-faza $726 072, 2-faza $977 900); moliyalashtirish ehtiyoji $2,10 mln
- 2031-yil: daromad **$3,33 mln**, EBITDA **$840 ming** (25%), sof foyda **$533 ming**
- Qoplanish **4,6 yil**, IRR (7 yil) **16,2%**, zararsizlik nuqtasi **362 t/yil**

## Modelni o‘zgartirish
`BioPlast_Tech_moliyaviy_model.xlsx` → **Kirish** varag‘idagi ko‘k raqamlarni o‘zgartiring (narxlar, kurs, tarif, chiqish). Qolgan varaqlar avtomatik qayta hisoblanadi.

## Qayta yaratish
```bash
python3 scripts/build_xlsx.py BioPlast_Tech_moliyaviy_model.xlsx 250000,150000,0,0,0,0,0,0
# LibreOffice bilan qayta hisoblang, so‘ng:
python3 scripts/extract.py BioPlast_Tech_moliyaviy_model.xlsx data.json
python3 scripts/charts.py BioPlast_Tech_moliyaviy_model.xlsx rasmlar
node scripts/build_docx.js BioPlast_Tech_biznes_reja.docx rasmlar data.json
PPTX_SKILL=<apply_theme.js joylashgan papka> node scripts/build_pptx.js BioPlast_Tech_taqdimot.pptx rasmlar data.json
```
