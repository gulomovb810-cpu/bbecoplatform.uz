// =====================================================================
// inbound-report — internetsiz murojaat: SMS, USSD yoki ovozli qo'ng'iroq (IVR)
// Aloqa operatori / SMS-shlyuz / IVR xizmati fuqaro xabarini shu webhook'ga yuboradi.
// Ovozli qo'ng'iroq bo'lsa, IVR provayderi speech-to-text natijasini "text"da,
// yozuv havolasini "audio_url"da yuboradi.
//
// Sozlash: supabase secrets set INBOUND_SECRET=<uzun-tasodifiy-satr>
//          supabase functions deploy inbound-report --no-verify-jwt
// So'rov:  POST /functions/v1/inbound-report   Header: x-inbound-secret: <INBOUND_SECRET>
//          Body: { "from": "+998901234567", "text": "Chiqindi Samarqand ...", "channel": "sms"|"phone", "audio_url"?: "..." }
// Javob:   { ok, case_no, reply }  — "reply" matnini fuqaroga SMS qilib qaytarish mumkin
// =====================================================================
import { adminClient, corsHeaders, json, REGIONS, safeEqual } from "../_shared/common.ts";

const CATEGORY_WORDS: Record<string, string[]> = {
  Chiqindi: ["chiqindi", "axlat", "musor", "мусор", "отход", "свалк"],
  Havo: ["havo", "tutun", "chang", "hid", "воздух", "дым", "пыль", "запах"],
  Suv: ["suv", "ariq", "kanal", "daryo", "hovuz", "вода", "река", "канал", "арык"],
  Daraxt: ["daraxt", "kesil", "o'rmon", "дерев", "вырубк"],
  Tuproq: ["tuproq", "yer ", "почв", "земл"],
};

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) if (words.some((w) => t.includes(w))) return cat;
  return "Boshqa";
}
function detectRegion(text: string): string | null {
  const t = text.toLowerCase().replace(/[ʻʼ’‘`]/g, "'");
  for (const r of REGIONS) if (r.names.some((n) => t.includes(n))) return r.code;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST kerak" }, 405);
  if (!safeEqual(req.headers.get("x-inbound-secret") ?? "", Deno.env.get("INBOUND_SECRET") ?? "")) {
    return json({ ok: false, error: "Ruxsat yo'q" }, 401);
  }
  let body: { from?: string; text?: string; channel?: string; audio_url?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Noto'g'ri JSON" }, 400); }

  const text = String(body.text ?? "").trim().slice(0, 5000);
  const from = String(body.from ?? "").replace(/[^\d+]/g, "").slice(0, 20) || null;
  const channel = body.channel === "phone" ? "phone" : "sms";
  if (text.length < 5) {
    return json({ ok: false, reply: "Muammoni batafsilroq yozing: nima, qayerda (viloyat, tuman, mo'ljal)." }, 400);
  }

  const db = adminClient();
  const { data: cfg } = await db.from("app_settings").select("value").eq("key", "accepting_reports").maybeSingle();
  if (cfg?.value === false) return json({ ok: false, reply: "Arizalarni qabul qilish vaqtincha to'xtatilgan." }, 503);

  const { data, error } = await db.from("reports").insert({
    user_id: null,
    description: text,
    category: detectCategory(text),
    region: detectRegion(text),
    location_text: "Joylashuv matndan aniqlanadi (operator tekshiradi)",
    channel,
    caller_phone: from,
    address: body.audio_url ? `Ovozli yozuv: ${String(body.audio_url).slice(0, 500)}` : null,
  }).select("case_no").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({
    ok: true,
    case_no: data.case_no,
    reply: `Murojaatingiz qabul qilindi: ${data.case_no}. Holatini bbecoplatform.uz ilovasida yoki shu raqam orqali kuzating.`,
  });
});
