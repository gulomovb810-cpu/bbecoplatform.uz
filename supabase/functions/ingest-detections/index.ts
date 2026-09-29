// =====================================================================
// ingest-detections — sun'iy yo'ldosh + ML pipeline natijalarini qabul qilish
// ML skript (masalan Sentinel-2 tasvirlari + U-Net) topgan noqonuniy chiqindixona
// nomzodlarini shu endpoint'ga yuboradi; ular admin panelning "Sun'iy yo'ldosh"
// bo'limida ko'rib chiqiladi va tasdiqlansa ECO REPORT'ga aylanadi.
//
// Sozlash: supabase secrets set INGEST_SECRET=<uzun-tasodifiy-satr>
//          supabase functions deploy ingest-detections --no-verify-jwt
// So'rov:  POST /functions/v1/ingest-detections
//          Header: x-ingest-secret: <INGEST_SECRET>
//          Body:   GeoJSON FeatureCollection (Point) yoki { "detections": [ {lat, lng, ...} ] }
// =====================================================================
import { adminClient, corsHeaders, guessRegion, json, safeEqual } from "../_shared/common.ts";

interface Det {
  lat: number; lng: number; confidence?: number; area_m2?: number; radius_m?: number;
  source?: string; model?: string; image_url?: string; captured_at?: string; category?: string; notes?: string;
}

function fromGeoJSON(fc: { features?: Array<{ geometry?: { type: string; coordinates: number[] }; properties?: Record<string, unknown> }> }): Det[] {
  return (fc.features ?? [])
    .filter((f) => f.geometry?.type === "Point")
    .map((f) => ({ lng: f.geometry!.coordinates[0], lat: f.geometry!.coordinates[1], ...(f.properties ?? {}) } as Det));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST kerak" }, 405);
  if (!safeEqual(req.headers.get("x-ingest-secret") ?? "", Deno.env.get("INGEST_SECRET") ?? "")) {
    return json({ ok: false, error: "Ruxsat yo'q" }, 401);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Noto'g'ri JSON" }, 400); }
  const list: Det[] = body.type === "FeatureCollection" ? fromGeoJSON(body as never) : ((body.detections as Det[]) ?? []);
  if (!Array.isArray(list) || !list.length) return json({ ok: false, error: "Aniqlashlar topilmadi" }, 400);
  if (list.length > 1000) return json({ ok: false, error: "Bir so'rovda ko'pi bilan 1000 ta" }, 413);

  const db = adminClient();
  // Takrorlanishni oldini olish: yaqin (~150 m) va hali rad etilmagan aniqlash bo'lsa — o'tkazib yuboriladi
  const { data: existing } = await db.from("detections").select("lat,lng").neq("status", "dismissed");
  const near = (a: Det) => (existing ?? []).some((e) => Math.hypot(e.lat - a.lat, (e.lng - a.lng) * 0.76) < 0.00135);

  const rows = [];
  let skipped = 0;
  for (const d of list) {
    const lat = Number(d.lat), lng = Number(d.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 37 || lat > 46 || lng < 55.9 || lng > 73.2) { skipped++; continue; }
    if (near({ lat, lng })) { skipped++; continue; }
    let conf = d.confidence == null ? null : Number(d.confidence);
    if (conf != null && conf > 1) conf = conf / 100; // 0–100 berilgan bo'lsa
    rows.push({
      lat, lng, confidence: conf, area_m2: d.area_m2 ?? null, radius_m: d.radius_m ?? null,
      source: d.source ?? "sentinel-2", model: d.model ?? null, image_url: d.image_url ?? null,
      captured_at: d.captured_at ?? null, category: d.category ?? "Chiqindi", notes: d.notes ?? null,
      region: guessRegion(lat, lng),
    });
  }
  if (rows.length) {
    const { error } = await db.from("detections").insert(rows);
    if (error) return json({ ok: false, error: error.message }, 500);
  }
  return json({ ok: true, inserted: rows.length, skipped });
});
