# bbecoplatform.uz
bbecoplatform.uz — ekologik muammolar haqida bir daqiqada xabar berish ilovasi. Muammoni yozing, joylashuvni belgilang, foto qo‘shing va kategoriyani tanlang: ariza mas’ul tashkilotga yetib boradi. Holatini va tashkilot javobini ilovada kuzating. Ekologiya qonunlari, o‘zbek va rus tillari. Toza atrof-muhit har birimizning qo‘limizda!

## Tuzilma
| Fayl | Vazifasi |
|---|---|
| `index.html` + `eco-plus.js` / `eco-plus.css` | Mobil ilova (fuqarolar uchun) va uning v2 imkoniyatlari |
| `admin/` (`admin.js`, `admin-v2.js`) | Admin panel |
| `config.js` | Supabase kalitlari (ilova + panel uchun umumiy) |
| `supabase/schema.sql` | Ma’lumotlar bazasi: jadvallar, xavfsizlik (RLS), triggerlar, RPC, Storage, Realtime |
| `supabase/functions/` | Edge Functions: `eco-ai` (Claude), `ingest-detections`, `inbound-report` |
| `docs/SUPABASE_SETUP.md` | Ulash va joylash bo‘yicha qadamma-qadam yo‘riqnoma |
| `docs/SATELLITE.md` | Sun’iy yo‘ldosh + ML pipeline’ni ulash |
| `dist/eco-report.html` | **Yuklab olinadigan mobil ilova** — bitta fayl (barcha kod ichida) |
| `dist/eco-admin.html` | **Yuklab olinadigan admin panel** — bitta fayl |
| `tools/build_single.py` | `dist/` fayllarini qayta yig‘ish: `python3 tools/build_single.py` |

## Imkoniyatlar
### Mobil ilova
- **ECO REPORT** — tavsif → joylashuv → foto/video → kategoriya → yuborish, holatni kuzatish, tahrirlash va bekor qilish.
- **🎙️ Ovozli murojaat** — yozish qiyin bo‘lganlar uchun: gapirib beriladi, brauzer nutqni matnga aylantiradi, ovozli yozuv arizaga biriktiriladi (fotosiz ham yuborish mumkin).
- **🤖 AI foto tahlili** — foto yuklanganda Claude muammo turini, ishonch foizini va qisqa tavsifni taklif qiladi; kategoriya bir tugma bilan tanlanadi.
- **⚖️ Qonun ariza oqimida** — kategoriya tanlanganda tegishli qonun moddalari (“Sizning huquqingiz shu moddaga asoslanadi”) ko‘rsatiladi va arizaga biriktiriladi.
- **🕶️ Maxfiy murojaat** — ism, telefon va hisob saqlanmaydi, foto metama’lumotlari o‘chiriladi, joylashuv ~500 m gacha yaxlitlanadi; holat bir martalik kuzatuv kodi bilan kuzatiladi.
  Ixtiyoriy aloqa qurilmada shifrlanadi va faqat yuridik mas’ul maxsus kalit bilan ocha oladi.
- **🌐 Transchegaraviy belgi** — umumiy daryo, chang-tuz bo‘roni, chegaraoldi ifloslanish.
- **💰 Shaffoflik** — hudud bo‘yicha yig‘ilgan kompensatsiya/jarima → qaysi loyihalarga ajratilgani va sarflangani, loyihalarga ovoz berish, taklif yuborish.
- **🏆 Eko-reyting** — faqat real hal qilingan murojaatlar asosida: viloyatlar, faol fuqarolar (ixtiyoriy), shaxsiy natija va nishonlar.
- **🤖 AI yordamchi** — server orqali, rasm bilan savol berish mumkin.

### Admin panel
- **Umumiy holat**, **📥 ECO REPORTS** (kanal, AI, belgilar bo‘yicha filtrlar; holat, tashkilot, javob, asossiz deb belgilash; ovozli yozuv; maxfiy aloqani yuridik ochish),
  **🗺️ ECO MAP** (sun’iy yo‘ldosh qatlamlari, transchegaraviy filtr, aniqlashlar), **🛰️ Sun’iy yo‘ldosh** (aniqlashlarni ko‘rib chiqish, arizaga aylantirish, klaster tahlili, import),
  **🏢 Tashkilotlar** (qo‘shni davlat organlari bilan), **👥 Foydalanuvchilar**, **📊 Statistika** (viloyat × muammo turi, kanallar, AI aniqligi, reyting),
  **💰 Shaffoflik**, **🧾 Faoliyat jurnali**, **⚙️ Sozlamalar**.
- **📞 Murojaat qabul qilish** — telefon, SMS yoki shaxsan kelgan fuqaro arizasini operator kiritadi; SMS/IVR shlyuzi `inbound-report` orqali avtomatik ulanadi.
- **📤 Qo‘shni davlatga signal** — transchegaraviy hodisa bo‘yicha rus/ingliz tilidagi tayyor xabar, jurnalga yoziladi.

`config.js` to‘ldirilmaguncha ilova va panel **demo rejimda** namunaviy ma’lumotlar bilan ishlaydi.
Ulash tartibi: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Bitta faylli versiya
`dist/` papkasidagi fayllar sizga yuborilgan asl ilova kabi **bitta HTML fayl**: yuklab oling va brauzerda oching yoki hostingga qo‘ying.
Supabase’ga ulash uchun fayl boshidagi `window.ECO_CONFIG` blokiga Project URL va anon key’ni yozing (ikkala faylda ham).
Telefonda brauzer menyusidagi **“Bosh ekranga qo‘shish”** orqali ilova sifatida o‘rnatiladi.
Manba fayllar o‘zgarsa, `python3 tools/build_single.py` bilan qayta yig‘ing.
