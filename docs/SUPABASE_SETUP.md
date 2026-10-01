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

## 9. Tekshiruv ro‘yxati
- [ ] `schema.sql` xatosiz bajarildi
- [ ] `config.js` da URL va anon key bor
- [ ] Ilovada ro‘yxatdan o‘tildi → admin panel **Foydalanuvchilar** bo‘limida paydo bo‘ldi
- [ ] Ilovadan foto bilan ariza yuborildi → **ECO REPORTS**da foto bilan ko‘rindi, **ECO MAP**da nuqta paydo bo‘ldi
- [ ] Adminda holat “Bartaraf etildi” qilinib javob yozildi → ilovada holat va “Mas’ul tashkilot javobi” yangilandi
- [ ] Sozlamalarda e’lon yoqildi → ilova bosh sahifasida ko‘rindi

## 10. AI Yordamchi
AI Yordamchi `supabase/functions/ai-chat` Edge Function orqali ishlaydi. API kalit faqat Supabase secrets ichida turadi va brauzerga chiqmaydi.

**1. Bazani yangilang.** `schema.sql` ni SQL Editor'da qayta ishga tushiring: unda kunlik limit uchun `ai_usage` jadvali va `ai_consume` funksiyasi bor. Savol va javob matnlari bazaga yozilmaydi.

**2. API kalit oling (bittasini tanlang):**
| Provayder | Narxi | Qayerdan | Secret nomi |
|---|---|---|---|
| Google Gemini | Bepul tarif bor (kunlik limit bilan) | aistudio.google.com → **Get API key** | `GEMINI_API_KEY` |
| Claude (Anthropic) | Pullik, ishlatilganiga qarab | console.anthropic.com → **API Keys** | `ANTHROPIC_API_KEY` |

⚠️ Gemini'ning bepul tarifida Google yuborilgan matnlardan o‘z mahsulotlarini yaxshilash uchun foydalanishi mumkin. Shuning uchun funksiya telefon, email, pasport, JShShIR va karta raqamlarini AI'ga yuborishdan oldin yashiradi. Fuqarolar ma’lumotlari uchun eng ishonchli variant pullik tarif (Claude yoki Gemini’ning pullik tarifi): unda ma’lumotlar o‘qitishga ishlatilmaydi.
Ikkala kalit ham qo‘yilsa, Claude ishlatiladi.

**3. Secret'larni qo‘ying:** **Edge Functions → Secrets** (yoki CLI: `supabase secrets set GEMINI_API_KEY=...`):
- `GEMINI_API_KEY` yoki `ANTHROPIC_API_KEY` — majburiy
- `AI_DAILY_LIMIT` — har bir foydalanuvchiga kunlik savollar soni (standart `30`)
- `ALLOWED_ORIGIN` — `https://bbecoplatform.uz` (boshqa saytlar funksiyani chaqira olmasligi uchun)
- `GEMINI_MODEL` / `CLAUDE_MODEL` — ixtiyoriy, model nomini almashtirish uchun

**4. Funksiyani joylang:**
- Dashboard: **Edge Functions → Deploy a new function → Via Editor**, nomi `ai-chat`, `supabase/functions/ai-chat/index.ts` matnini joylab **Deploy** bosing.
- yoki CLI: `supabase functions deploy ai-chat`

“Verify JWT” yoqilgan qolsin: funksiyani faqat ilovaga kirgan (mehmon ham) foydalanuvchilar chaqira oladi.

**5. Tekshiring:** ilovada 🤖 AI Yordamchi'ga savol yozing. “AI yordamchi hozircha ulanmagan” chiqsa, secret qo‘yilmagan yoki funksiya joylanmagan.

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
