# Supabase’ga ulash — to‘liq yo‘riqnoma

Mobil ilova (`index.html`) va idoralar portali (`admin/`) **bitta Supabase loyihasidan** foydalanadi.
Fuqaro ilovadan yuborgan ariza va ro‘yxatdan o‘tgan foydalanuvchi portalda **darhol (realtime)** ko‘rinadi.
Admin holatni o‘zgartirsa yoki javob yozsa, bu fuqaro ilovasida ham darhol ko‘rinadi.

```
 Mobil ilova ──(anon key + RLS)──►  Supabase  ◄──(anon key + admin roli)── Admin panel
   • ro‘yxatdan o‘tish (SMS/Email OTP)    • Auth (auth.users → profiles)
   • ariza yuborish                        • Postgres: reports, organizations, ...
   • foto → Storage                        • Storage: report-media (yopiq)
                                           • Realtime
```

---

## 1. Loyiha yaratish
1. <https://supabase.com> → **New project**. Region: `Central EU (Frankfurt)` (O‘zbekistonga eng yaqin).
2. Ma’lumotlar bazasi parolini saqlab qo‘ying.

## 2. Jadvallarni yaratish (SQL)
1. **SQL Editor → New query**.
2. `supabase/schema.sql` faylini to‘liq nusxalab joylashtiring → **Run**.
3. Skriptni qayta ishga tushirish xavfsiz: mavjud ma’lumotlar o‘chirilmaydi.

Skript yaratadi:

| Jadval | Vazifasi | Asosiy ustunlar |
|---|---|---|
| `profiles` | Mobil ilova foydalanuvchilari. `auth.users` ga yangi foydalanuvchi qo‘shilganda trigger orqali avtomatik yaratiladi | `full_name`, `phone`, `email`, `is_anonymous` (mehmon), `role` (`user`/`moderator`/`admin`), `blocked` |
| `reports` | Arizalar | `case_no` (ECO-000123, avtomatik), `description`, `category`, `region`, `address`, `lat`, `lng`, `media_path`, `media_type`, `status` (0–4), `priority`, `org_id`, `admin_note` (fuqaroga javob), `cancelled`, `edited_at`, `resolved_at` |
| `organizations` | Mas’ul tashkilotlar | `name`, `short_name`, `region`, `categories[]`, `phone`, `email`, `active` |
| `report_status_history` | Har bir o‘zgarish tarixi (trigger yozadi) | `event`, `status`, `note`, `actor` |
| `app_settings` | Admin paneldan boshqariladigan sozlamalar | `accepting_reports`, `edit_days`, `daily_limit`, `auto_assign`, `announcement` |

**Holatlar (`status`)**: 0 — Qabul qilindi, 1 — Tekshirilmoqda, 2 — Mas’ul tashkilotga yuborildi, 3 — Bartaraf etildi, 4 — Yakunlandi.
**Kategoriyalar**: `Chiqindi`, `Havo`, `Suv`, `Daraxt`, `Tuproq`, `Boshqa`.

### Xavfsizlik (RLS) — skriptga kiritilgan
- Fuqaro **faqat o‘z arizalarini** ko‘radi. U faqat tavsif/kategoriyani (`edit_days` muddati ichida) tahrirlay oladi va arizani bekor qila oladi. Holat, tashkilot va javobni o‘zgartirishga urinsa, server bu o‘zgarishlarni e’tiborsiz qoldiradi.
- `moderator` (vazirlik dispetcheri) barcha arizalarni ko‘radi, taqsimlanmaganlarini idoralarga yo‘naltiradi.
- `org_head` (idora rahbari) faqat **o‘z idorasi** arizalarini ko‘radi: ijrochi tayinlaydi, muddatni uzaytiradi (yaratilgandan boshlab ko‘pi bilan 30 kun), muhimlikni belgilaydi, boshqa idoraga yo‘naltiradi, javobni tasdiqlab yopadi.
- `org_staff` (ijrochi/inspektor) o‘z idorasi arizalarini ko‘radi, lekin faqat **o‘ziga biriktirilganlarini** ijro qiladi: holatni o‘zgartiradi, bajarilgan ish suratini yuklaydi, fuqaroga javob yozadi. Ijrochi, idora va muddatni o‘zgartira olmaydi.
- Idora xodimlari fuqaro yozgan matn, surat va joylashuvni o‘zgartira olmaydi. Yopish yoki rad etish faqat fuqaroga javob matni bilan mumkin.
- Boshqa idoraga yo‘naltirish `forward_report(report, org, reason)` funksiyasi orqali bajariladi: ariza yangi idoraga “Yangi” holatida tushadi, sabab ichki izohga yoziladi.
- Har bir ariza yaratilganda muddat (`deadline_at`) toifaga qarab qo‘yiladi: sozlamalardagi `sla_days`, bo‘lmasa 15 kun (“Jismoniy va yuridik shaxslarning murojaatlari to‘g‘risida”gi qonun).
- Ichki izohlar (`report_comments`) va javob shablonlari (`response_templates`) fuqaroga ko‘rinmaydi.
- `admin` bunga qo‘shimcha ravishda tashkilotlar, foydalanuvchilar, rollar va sozlamalarni boshqaradi, ariza o‘chiradi.
- Qabul to‘xtatilgan, foydalanuvchi bloklangan yoki kunlik limit tugagan bo‘lsa, ariza **server tomonida** rad etiladi.
- Fuqaro “Butunlay chiqish” qilsa, `delete_my_account()` hisobni o‘chiradi. Uning arizalari statistikada anonim holda qoladi.

## 3. Foto yuklash (Storage)
Skript `report-media` nomli **yopiq** bucket yaratadi: 50 MB gacha, faqat `image/*` va `video/*`.
- Ilova faylni `<user_id>/<vaqt>-<tasodifiy>.jpg` yo‘liga yuklaydi (rasm oldindan 1600px gacha siqiladi).
- Fuqaro faqat o‘z papkasiga yoza va undan o‘qiy oladi. Admin/moderator hamma fayllarni ko‘radi.
- Fayl ochiq havola orqali emas, **1 soatlik imzolangan havola** (signed URL) orqali ochiladi. Shuning uchun fotolar begonalarga ochiq emas.
- Tekshirish: **Storage → report-media** bo‘limida yuklangan fayllar ko‘rinadi.

## 4. Autentifikatsiya sozlamalari
**Authentication → Sign In / Providers**:
1. **Email** — yoqilgan. Ilova email orqali 6 xonali kod yuboradi.
   **Authentication → Email Templates → Magic Link** shablonida `{{ .Token }}` bo‘lishi kerak, masalan: `Tasdiqlash kodingiz: {{ .Token }}`.
2. **Phone** — SMS orqali ro‘yxatdan o‘tish uchun SMS provayderni ulang (Twilio, MessageBird, Vonage yoki Textlocal). Provayder ulanmaguncha foydalanuvchilar Gmail orqali ro‘yxatdan o‘tishi mumkin.
3. **Allow anonymous sign-ins** — yoqing. “Mehmon sifatida ko‘rish” shunga bog‘liq.
4. **Authentication → URL Configuration → Site URL**: `https://bbecoplatform.uz`.

## 5. Kalitlarni ulash
**Project Settings → API** bo‘limidan oling va repodagi `config.js` ga yozing:

```js
window.ECO_CONFIG = {
  SUPABASE_URL: 'https://abcdxyz.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',   // anon public
  MEDIA_BUCKET: 'report-media'
};
```

Bu bitta fayl ham ilovani, ham portalni ulaydi.
⚠️ **`service_role` kalitini hech qachon bu yerga qo‘ymang**: u barcha himoyani chetlab o‘tadi. `anon` kalitni ochiq qo‘yish xavfsiz, chunki himoyani RLS ta’minlaydi.

## 6. Birinchi adminni yaratish
1. **Authentication → Users → Add user → Create new user**: email + parol, “Auto Confirm User” belgilangan bo‘lsin.
2. **SQL Editor**da ishga tushiring:
   ```sql
   update public.profiles set role = 'admin' where email = 'sizning@email.uz';
   ```
3. `https://bbecoplatform.uz/admin/` sahifasini oching va shu email/parol bilan kiring.

### Idora xodimlarini qo‘shish
1. Portalda **Tashkilotlar** bo‘limida idorani yarating (toifalar va hudud belgilansa, arizalar unga avtomatik tushadi).
2. Xodimni **Authentication → Users → Add user** orqali email+parol bilan yarating.
3. Portalda **Xodimlar → Xodim qo‘shish**: email, rol (`Idora rahbari` yoki `Ijrochi`), idora va lavozimni kiriting.

Rol va idorani faqat `admin` o‘zgartira oladi (server buni tekshiradi).

## 7. Realtime
Skript `reports`, `profiles`, `report_status_history` va `report_comments` jadvallarini `supabase_realtime` ga qo‘shadi.
Yangi ariza kelganda portalda ovozli bildirishnoma chiqadi va “Kiruvchi arizalar” yonidagi hisoblagich yangilanadi.

## 8. Saytga joylash
Loyiha statik fayllardan iborat (server kerak emas):
```
index.html        → https://bbecoplatform.uz/        (mobil ilova)
config.js         → umumiy sozlama
admin/            → https://bbecoplatform.uz/admin/  (idoralar portali)
```
Netlify, Vercel, Cloudflare Pages yoki GitHub Pages’ga repo’ni ulash kifoya. Domen DNS’ini hosting ko‘rsatmasi bo‘yicha yo‘naltiring.

## 9. Tekshiruv ro‘yxati
- [ ] `schema.sql` xatosiz bajarildi
- [ ] `config.js` da URL va anon key bor
- [ ] Ilovadan foto bilan ariza yuborildi → portalning **Kiruvchi arizalar** bo‘limida foto bilan ko‘rindi, **Xarita**da nuqta paydo bo‘ldi
- [ ] Idora rahbari ijrochi tayinladi → ijrochi o‘z hisobida **Mening topshiriqlarim**da ko‘rdi
- [ ] Ijrochi “Hal qilindi — fuqaroga javob” bosdi → ilovada holat va “Mas’ul tashkilot javobi” yangilandi
- [ ] Sozlamalarda e’lon yoqildi → ilova bosh sahifasida ko‘rindi

## 10. AI Yordamchi (Google Gemini)
AI Yordamchi `supabase/functions/ai-chat` Edge Function orqali Google Gemini bilan ishlaydi. Gemini API kaliti faqat Supabase secrets ichida turadi va brauzerga, `config.js` ga yoki ilovaga hech qachon tushmaydi.

**Imkoniyatlar**
- Javob yozilayotgan paytida jonli ko‘rinadi.
- Fuqaro surat yuborib so‘rashi mumkin (masalan, “bu chiqindini qayerga topshiraman?”). Surat ilovada kichraytirilib qayta chiziladi, shuning uchun undagi GPS va boshqa yashirin ma’lumotlar Google’ga bormaydi.
- Asosiy model band bo‘lsa yoki limiti tugasa, zaxira modelga avtomatik o‘tadi.
- Pullik tarifda javobni Google qidiruvi bilan tekshirib, manbalarini ko‘rsatadi (ixtiyoriy).
- O‘zbek (lotin va kirill) va rus tillarida javob beradi.

**1. Bazani yangilang.** `schema.sql` ni SQL Editor’da qayta ishga tushiring: unda kunlik limit uchun `ai_usage` jadvali va `ai_consume` funksiyasi bor. Savol, surat va javoblar bazaga ham, logga ham yozilmaydi.

**2. Gemini API kalitini oling.** [aistudio.google.com](https://aistudio.google.com) → **Get API key** → **Create API key**.

**Bepul yoki pullik tarif**
- Bepul tarifda Google yuborilgan matn va suratlardan o‘z mahsulotlarini yaxshilash uchun foydalanishi mumkin. Shuning uchun funksiya telefon, email, pasport, JShShIR va karta raqamlarini AI’ga yuborishdan oldin yashiradi.
- Fuqarolar ma’lumotlari uchun eng ishonchli variant pullik tarif: AI Studio’da loyihaga **Billing** ulang. Unda ma’lumotlar o‘qitishga ishlatilmaydi, limitlar katta bo‘ladi va Google qidiruvi bilan tekshirish ishlaydi.

**3. Secret’larni qo‘ying:** **Edge Functions → Secrets** (yoki CLI: `supabase secrets set GEMINI_API_KEY=...`)

| Secret | Majburiymi | Qiymati |
|---|---|---|
| `GEMINI_API_KEY` | ha | AI Studio’dagi kalit |
| `ALLOWED_ORIGIN` | tavsiya | `https://bbecoplatform.uz` (boshqa saytlar funksiyani chaqira olmaydi) |
| `AI_DAILY_LIMIT` | yo‘q | har bir foydalanuvchiga kunlik savollar soni, standart `30` |
| `GEMINI_MODEL` | yo‘q | asosiy model, standart `gemini-3.6-flash` |
| `GEMINI_FALLBACK` | yo‘q | zaxira model, standart `gemini-3.1-flash-lite` |
| `AI_GOOGLE_SEARCH` | yo‘q | `1` bo‘lsa, javob Google qidiruvi bilan tekshiriladi va manbalar ko‘rsatiladi (faqat pullik tarifda) |
| `ANTHROPIC_API_KEY` | yo‘q | Gemini butunlay ishlamay qolsa javob beradigan zaxira (Claude) |

**4. Funksiyani joylang:**
- Dashboard: **Edge Functions → Deploy a new function → Via Editor**, nomi `ai-chat`, `supabase/functions/ai-chat/index.ts` matnini joylab **Deploy** bosing.
- yoki CLI: `supabase functions deploy ai-chat`

“Verify JWT” yoqilgan qolsin: funksiyani faqat ilovaga kirgan (mehmon ham) foydalanuvchilar chaqira oladi.

**5. Tekshiring:** ilovada 🤖 AI Yordamchi’ni oching va tayyor savollardan birini bosing. Javob yozila boshlasa, hammasi ishlayapti.
- “AI yordamchi hozircha ulanmagan” chiqsa, `GEMINI_API_KEY` qo‘yilmagan yoki funksiya joylanmagan.
- “AI yordamchi hozir band” chiqsa, Gemini’ning daqiqalik yoki kunlik limiti tugagan. Bir ozdan keyin qayta urinib ko‘ring yoki pullik tarifga o‘ting.
- Supabase → **Edge Functions → ai-chat → Logs** bo‘limida faqat xato turi ko‘rinadi (masalan, `provider error: key 403` — kalit noto‘g‘ri). Savol matnlari logga yozilmaydi.

## 11. Tozalash aksiyalari (rasmiy e’lonlar va “Qatnashaman”)

`schema.sql` `eco_events` (aksiyalar) va `event_participants` (kim qatnashadi) jadvallarini yaratadi.

- **E’lon qilish:** portalda **🧹 Tozalash aksiyalari → ➕ Aksiya e’lon qilish**. Administrator, moderator va idora rahbari e’lon qila oladi; idora rahbari faqat o‘z idorasi nomidan.
- **Fuqarolar ilovasida:** “Tozalash aksiyalari” bo‘limida e’lon darhol (Realtime orqali) ko‘rinadi. Fuqaro “Qatnashaman” tugmasini bosadi, kalendarga qo‘shadi, xaritada ko‘radi yoki ulashadi.
- **Maxfiylik:** fuqarolar ishtirokchilar ro‘yxatini ko‘rmaydi, faqat sonini (`event_counts`). Ro‘yxatni faqat administrator va moderator ko‘radi. Bloklangan foydalanuvchi qatnasha olmaydi, joy tugaganda yozilish to‘xtaydi.
- **Qoralama** fuqarolarga ko‘rinmaydi; **Bekor qilish** e’lonni ilovada “Bekor qilindi” deb ko‘rsatadi.

Bo‘limdagi **“Saytlardan xabarlar”** qismi Supabase’siz ham ishlaydi: `scripts/fetch-events.mjs` har soatda Google News, Kun.uz, Gazeta.uz, Daryo, UzA va boshqa saytlardan hashar, ko‘chat ekish va volontyorlik xabarlarini yig‘ib, `news-data` branchidagi `events.json` ga yozadi. Har soatlik yangilanish faqat workflow `main` branchida bo‘lganda ishlaydi.

## Muammolar
| Belgi | Sabab / yechim |
|---|---|
| Admin panelga kirganda “kirish huquqi yo‘q” chiqadi | `profiles.role` `admin` yoki `moderator` emas — 6-qadamni bajaring |
| Foto ko‘rinmaydi | Bucket nomi `report-media` emas yoki Storage policy’lar yaratilmagan — `schema.sql` ni qayta ishga tushiring |
| “Jonli” o‘rniga “Ulanmoqda...” turibdi | **Database → Publications → supabase_realtime** da `reports` jadvali borligini tekshiring |
| Ilovada “Arizalarni qabul qilish to‘xtatilgan” | Admin → Sozlamalar → “Arizalarni qabul qilish”ni yoqing |
| Mehmon rejimi ishlamaydi | “Allow anonymous sign-ins” yoqilmagan |
| AI “hozircha ulanmagan” deydi | `ai-chat` funksiyasi joylanmagan yoki `GEMINI_API_KEY`/`ANTHROPIC_API_KEY` secret qo‘yilmagan — 10-bo‘lim |
| AI “bugungi limit tugadi” deydi | `AI_DAILY_LIMIT` secret qiymatini oshiring |
