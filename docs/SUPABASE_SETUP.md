# Supabase’ga ulash — to‘liq yo‘riqnoma

Mobil ilova (`index.html`) va admin panel (`admin/`) **bitta Supabase loyihasidan** foydalanadi.
Fuqaro ilovadan yuborgan ariza va ro‘yxatdan o‘tgan foydalanuvchi admin panelda **darhol (realtime)** ko‘rinadi.
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
| `detections` | Sun’iy yo‘ldosh / ML va klaster aniqlashlari | `lat`, `lng`, `confidence`, `area_m2`, `source`, `status` (new/confirmed/converted/dismissed), `report_id` |
| `eco_funds` | Kompensatsiya, jarima, grant tushumlari (ochiq) | `region`, `year`, `quarter`, `source`, `amount` (so‘m) |
| `eco_projects` | Tushumlar sarflangan loyihalar (ochiq) | `title`, `budget`, `spent`, `status`, `vote_count` |
| `project_votes`, `project_suggestions` | Fuqarolar ovozi va takliflari | — |
| `transboundary_signals` | Qo‘shni davlatlarga yuborilgan signallar jurnali | `country`, `org_id`, `message` |
| `ai_usage` | AI so‘rovlarining kunlik hisobi (faqat server) | `user_id`, `day`, `count` |

`reports` jadvalidagi v2 ustunlari: `channel` (app/voice/anonymous/phone/sms/operator/satellite), `is_anonymous_report`, `anon_token_hash`,
`contact_cipher`, `caller_phone`, `audio_path`, `transboundary`, `countries`, `ai_category`, `ai_confidence`, `ai_summary`, `legal_refs`,
`rejected`, `reject_reason`, `detection_id`. Skript eski bazani ham avtomatik yangilaydi.

**Holatlar (`status`)**: 0 — Qabul qilindi, 1 — Tekshirilmoqda, 2 — Mas’ul tashkilotga yuborildi, 3 — Bartaraf etildi, 4 — Yakunlandi.
**Kategoriyalar**: `Chiqindi`, `Havo`, `Suv`, `Daraxt`, `Tuproq`, `Boshqa`.

### Xavfsizlik (RLS) — skriptga kiritilgan
- Fuqaro **faqat o‘z arizalarini** ko‘radi. U faqat tavsif/kategoriyani (`edit_days` muddati ichida) tahrirlay oladi va arizani bekor qila oladi. Holat, tashkilot va javobni o‘zgartirishga urinsa, server bu o‘zgarishlarni e’tiborsiz qoldiradi.
- `moderator` barcha arizalarni ko‘radi va boshqaradi.
- `admin` bunga qo‘shimcha ravishda tashkilotlar, foydalanuvchilar, rollar va sozlamalarni boshqaradi, ariza o‘chiradi.
- Qabul to‘xtatilgan, foydalanuvchi bloklangan yoki kunlik limit tugagan bo‘lsa, ariza **server tomonida** rad etiladi.
- Fuqaro “Butunlay chiqish” qilsa, `delete_my_account()` hisobni o‘chiradi. Uning arizalari statistikada anonim holda qoladi.

## 3. Foto yuklash (Storage)
Skript `report-media` nomli **yopiq** bucket yaratadi: 50 MB gacha, faqat `image/*` va `video/*`.
- Ilova faylni `<user_id>/<vaqt>-<tasodifiy>.jpg` yo‘liga yuklaydi (rasm oldindan 1600px gacha siqiladi).
- Fuqaro faqat o‘z papkasiga yoza va undan o‘qiy oladi. Admin/moderator hamma fayllarni ko‘radi.
- Fayl ochiq havola orqali emas, **1 soatlik imzolangan havola** (signed URL) orqali ochiladi. Shuning uchun fotolar begonalarga ochiq emas.
- Maxfiy murojaat fayllari `anon/<tasodifiy>.jpg` yo‘liga **sessiyasiz** yuklanadi (fayl egasi ham yozilmaydi). Ovozli xabarlar ham shu bucket’da (`audio/*`).
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

Bu bitta fayl ham ilovani, ham admin panelni ulaydi.
⚠️ **`service_role` kalitini hech qachon bu yerga qo‘ymang**: u barcha himoyani chetlab o‘tadi. `anon` kalitni ochiq qo‘yish xavfsiz, chunki himoyani RLS ta’minlaydi.

## 6. Birinchi adminni yaratish
1. **Authentication → Users → Add user → Create new user**: email + parol, “Auto Confirm User” belgilangan bo‘lsin.
2. **SQL Editor**da ishga tushiring:
   ```sql
   update public.profiles set role = 'admin' where email = 'sizning@email.uz';
   ```
3. `https://bbecoplatform.uz/admin/` sahifasini oching va shu email/parol bilan kiring.

Keyingi admin yoki moderatorlarni panelning o‘zidan qo‘shasiz: **Foydalanuvchilar → Boshqarish → Rol**.
Buning uchun ular avval email+parol bilan (1-qadamdagidek) yaratilgan bo‘lishi kerak.

## 7. Realtime
Skript `reports`, `profiles` va `report_status_history` jadvallarini `supabase_realtime` ga qo‘shadi.
Admin panel yuqori o‘ng burchagida **● Jonli** yozuvi ko‘rinsa, ulanish ishlayapti. Yangi ariza kelganda bildirishnoma chiqadi va “ECO REPORTS” yonida hisoblagich paydo bo‘ladi.

## 8. Saytga joylash
Loyiha statik fayllardan iborat (server kerak emas):
```
index.html        → https://bbecoplatform.uz/        (mobil ilova)
config.js         → umumiy sozlama
admin/            → https://bbecoplatform.uz/admin/  (admin panel)
```
Netlify, Vercel, Cloudflare Pages yoki GitHub Pages’ga repo’ni ulash kifoya. Domen DNS’ini hosting ko‘rsatmasi bo‘yicha yo‘naltiring.

## 8b. Server funksiyalari (Edge Functions)
[Supabase CLI](https://supabase.com/docs/guides/cli) o‘rnating va loyihaga ulaning: `supabase login` → `supabase link --project-ref <ref>`.

| Funksiya | Vazifasi | Kerakli maxfiy kalit |
|---|---|---|
| `eco-ai` | Foto tahlili (turi, ishonch %, tavsif) va AI yordamchi (rasm bilan savol). Claude modeli: `claude-opus-5-5` | `ANTHROPIC_API_KEY` |
| `ingest-detections` | ML pipeline’dan sun’iy yo‘ldosh aniqlashlarini qabul qiladi | `INGEST_SECRET` |
| `inbound-report` | SMS / USSD / IVR shlyuzidan internetsiz murojaatlarni qabul qiladi | `INBOUND_SECRET` |

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...           # console.anthropic.com → API Keys
supabase secrets set INGEST_SECRET=$(openssl rand -hex 32)
supabase secrets set INBOUND_SECRET=$(openssl rand -hex 32)
supabase functions deploy eco-ai
supabase functions deploy ingest-detections --no-verify-jwt
supabase functions deploy inbound-report --no-verify-jwt
```

- `eco-ai` faqat tizimga kirgan (mehmon ham) foydalanuvchi so‘roviga javob beradi; kunlik limit admin paneldagi **Sozlamalar → AI kunlik limiti** bilan boshqariladi.
  Xavfsizlik klassifikatori rad etsa, so‘rov server tomonida tavsiya etilgan zaxira modelda qayta bajariladi (`fallbacks: "default"`).
  Maxfiy murojaatda AI **ishlatilmaydi** — foto uchinchi tomonga yuborilmaydi.
- `inbound-report` javobidagi `reply` matnini SMS-shlyuz fuqaroga qaytarishi mumkin (ariza raqami bilan).
  Misol: `curl -X POST https://<ref>.supabase.co/functions/v1/inbound-report -H "x-inbound-secret: …" -H "content-type: application/json" -d '{"from":"+998901234567","text":"Samarqand, ariqqa chiqindi tashlanmoqda","channel":"sms"}'`
- Sun’iy yo‘ldosh pipeline’i: [`docs/SATELLITE.md`](SATELLITE.md).

## 8c. Maxfiy murojaat (whistleblower) — kafolatlar va cheklovlar
- Ariza `user_id`siz saqlanadi, fayl sessiyasiz yuklanadi, tarixda fuqaro harakati hisobga bog‘lanmaydi; kuzatuv kodining faqat SHA-256 xeshi saqlanadi.
- Ixtiyoriy aloqa ma’lumoti telefonning o‘zida RSA-OAEP (3072 bit) bilan shifrlanadi. Kalit juftligini **Admin → Sozlamalar → Maxfiy murojaat shifrlash kaliti** yaratadi;
  yopiq kalit faqat yuklab olinadigan faylda qoladi. Ochish faqat asos yozilgan holda amalga oshadi va **Faoliyat jurnali**ga (`unlock`) yoziladi.
- Cheklov: Supabase infratuzilmasi so‘rov loglarida IP-manzilni vaqtincha saqlashi mumkin. To‘liq himoya kerak bo‘lsa, murojaatni VPN/Tor orqali yuborish tavsiya etiladi
  yoki log saqlash muddatini loyiha sozlamalarida qisqartiring.

## 9. Tekshiruv ro‘yxati
- [ ] `schema.sql` xatosiz bajarildi
- [ ] `config.js` da URL va anon key bor
- [ ] Ilovada ro‘yxatdan o‘tildi → admin panel **Foydalanuvchilar** bo‘limida paydo bo‘ldi
- [ ] Ilovadan foto bilan ariza yuborildi → **ECO REPORTS**da foto bilan ko‘rindi, **ECO MAP**da nuqta paydo bo‘ldi
- [ ] Adminda holat “Bartaraf etildi” qilinib javob yozildi → ilovada holat va “Mas’ul tashkilot javobi” yangilandi
- [ ] Sozlamalarda e’lon yoqildi → ilova bosh sahifasida ko‘rindi
- [ ] Ilovada foto biriktirilganda “🤖 AI tahlili” kartasi chiqdi (Edge Function `eco-ai` joylangan)
- [ ] Maxfiy murojaat yuborildi → kuzatuv kodi bilan holat ko‘rindi; adminda “🕶️ Maxfiy” deb ko‘rindi, fuqaro nomi yo‘q
- [ ] Admin → Shaffoflik’da tushum va loyiha kiritildi → ilovadagi “💰 Shaffoflik”da ko‘rindi
- [ ] Admin → 📞 Murojaat qabul qilish orqali qo‘ng‘iroq arizasi yaratildi

## Muammolar
| Belgi | Sabab / yechim |
|---|---|
| Admin panelga kirganda “kirish huquqi yo‘q” chiqadi | `profiles.role` `admin` yoki `moderator` emas — 6-qadamni bajaring |
| Foto ko‘rinmaydi | Bucket nomi `report-media` emas yoki Storage policy’lar yaratilmagan — `schema.sql` ni qayta ishga tushiring |
| “Jonli” o‘rniga “Ulanmoqda...” turibdi | **Database → Publications → supabase_realtime** da `reports` jadvali borligini tekshiring |
| Ilovada “Arizalarni qabul qilish to‘xtatilgan” | Admin → Sozlamalar → “Arizalarni qabul qilish”ni yoqing |
| Mehmon rejimi ishlamaydi | “Allow anonymous sign-ins” yoqilmagan |
