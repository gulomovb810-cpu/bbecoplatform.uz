# bbecoplatform.uz
bbecoplatform.uz — ekologik muammolar haqida bir daqiqada xabar berish ilovasi. Muammoni yozing, joylashuvni belgilang, foto qo‘shing va kategoriyani tanlang: ariza mas’ul tashkilotga yetib boradi. Holatini va tashkilot javobini ilovada kuzating. Ekologiya qonunlari, o‘zbek va rus tillari. Toza atrof-muhit har birimizning qo‘limizda!

## Tuzilma
| Fayl | Vazifasi |
|---|---|
| `index.html` | Mobil ilova (fuqarolar uchun) |
| `admin/` | Idoralar portali (EKO-MUROJAAT): vazirlik va idoralar arizalarni qabul qiladi, ijrochiga biriktiradi, muddatni nazorat qiladi va fuqaroga javob beradi; ijro reytingi, xarita, tahlil, jurnal, sozlamalar |
| `config.js` | Supabase kalitlari (ilova + panel uchun umumiy) |
| `supabase/schema.sql` | Ma’lumotlar bazasi: jadvallar, xavfsizlik (RLS), triggerlar, Storage, Realtime |
| `supabase/functions/ai-chat/` | AI Yordamchi: Google Gemini bilan ishlaydigan server funksiya (jonli javob, surat bo‘yicha savol; API kalit shu yerda yashirin turadi) |
| `docs/SUPABASE_SETUP.md` | Supabase’ga ulash bo‘yicha qadamma-qadam yo‘riqnoma |

## Admin panel bo‘limlari
- **Umumiy holat**: asosiy ko‘rsatkichlar, 30 kunlik dinamika, kechikkan/biriktirilmagan arizalar haqida ogohlantirishlar.
- **📥 ECO REPORTS**: barcha murojaatlar. Qidiruv va filtrlar mavjud, bir nechta arizani birdaniga yangilash va CSV eksport qilish mumkin. Ariza ochilganda foto/video, xarita, fuqaro ma’lumoti va o‘zgarishlar tarixi ko‘rinadi. Holatni, mas’ul tashkilotni, muhimlikni va fuqaroga javobni shu yerdan o‘zgartirasiz.
- **🗺️ ECO MAP**: barcha arizalar xaritada, holat va tur bo‘yicha filtrlanadi.
- **🏢 Tashkilotlar**: mas’ul tashkilotlar ro‘yxati va har birining samaradorligi.
- **👥 Foydalanuvchilar**: ro‘yxatdan o‘tganlar va mehmonlar. Bloklash, rol berish va hisobni o‘chirish mumkin.
- **📊 Statistika**: viloyat × muammo turi (chiqindi, havo, suv...) kesimidagi jadval va grafiklar, kunlik oqim.
- **🧾 Faoliyat jurnali**: arizalardagi barcha o‘zgarishlar tarixi.
- **⚙️ Sozlamalar**: ariza qabulini yoqish/to‘xtatish, tahrirlash muddati, kunlik limit, avtomatik yo‘naltirish, ilovadagi e’lon.

`config.js` to‘ldirilmaguncha panel **demo rejimda** namunaviy ma’lumotlar bilan ochiladi.
Ulash tartibi: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
