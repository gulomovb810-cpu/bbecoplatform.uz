// ============================================================
// bbecoplatform.uz — umumiy sozlama (mobil ilova + admin panel)
// Supabase Dashboard → Project Settings → API bo'limidan oling:
//   • Project URL      → SUPABASE_URL
//   • anon public key  → SUPABASE_ANON_KEY
// DIQQAT: bu yerga hech qachon "service_role" kalitini qo'ymang!
// Kalitlar qo'yilmaguncha ilova va admin panel DEMO rejimida ishlaydi.
// ============================================================
window.ECO_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',
  MEDIA_BUCKET: 'report-media',
  // Ixtiyoriy: Google Maps JavaScript API kaliti (Google Cloud Console → APIs & Services).
  // Bo'sh qolsa, joylashuv xaritasi OpenStreetMap orqali ishlaydi.
  GOOGLE_MAPS_API_KEY: ''
};
