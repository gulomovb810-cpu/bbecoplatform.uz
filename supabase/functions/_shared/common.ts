// Edge Function'lar uchun umumiy yordamchilar
import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret, x-inbound-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Service role mijoz — RLS'ni chetlab o'tadi, faqat server tomonida ishlatiladi */
export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** So'rov yuborgan foydalanuvchini JWT orqali aniqlash (mehmon/anonim sessiya ham hisoblanadi) */
export async function requestUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

/** Konstant-vaqtli satr solishtirish (maxfiy kalitlar uchun) */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const CATEGORIES = ["Chiqindi", "Havo", "Suv", "Daraxt", "Tuproq", "Boshqa"] as const;

export const REGIONS = [
  { code: "tashkent_city", names: ["toshkent shahri", "toshkent sh", "ташкент"], lat: 41.3111, lng: 69.2797 },
  { code: "tashkent", names: ["toshkent viloyati", "ташкентская"], lat: 41.2, lng: 69.9 },
  { code: "andijan", names: ["andijon", "андижан"], lat: 40.7821, lng: 72.3442 },
  { code: "bukhara", names: ["buxoro", "бухар"], lat: 39.9, lng: 64.2 },
  { code: "fergana", names: ["farg'ona", "fargona", "farg‘ona", "фергана", "ферган"], lat: 40.3864, lng: 71.7864 },
  { code: "jizzakh", names: ["jizzax", "джизак"], lat: 40.1158, lng: 67.8422 },
  { code: "khorezm", names: ["xorazm", "urganch", "хорезм"], lat: 41.55, lng: 60.6333 },
  { code: "namangan", names: ["namangan", "наманган"], lat: 40.9983, lng: 71.6726 },
  { code: "navoi", names: ["navoiy", "навои"], lat: 40.7, lng: 64.6 },
  { code: "kashkadarya", names: ["qashqadaryo", "qarshi", "кашкадар"], lat: 38.86, lng: 65.79 },
  { code: "karakalpakstan", names: ["qoraqalpog", "nukus", "каракалпак", "нукус"], lat: 42.46, lng: 59.6 },
  { code: "samarkand", names: ["samarqand", "самарканд"], lat: 39.6542, lng: 66.9597 },
  { code: "syrdarya", names: ["sirdaryo", "guliston", "сырдар"], lat: 40.4897, lng: 68.7842 },
  { code: "surkhandarya", names: ["surxondaryo", "termiz", "сурхандар"], lat: 37.94, lng: 67.57 },
];

/** Koordinata bo'yicha eng yaqin viloyat markazi (mobil ilovadagi guessRegion bilan bir xil) */
export function guessRegion(lat: number, lng: number): string {
  if (Math.hypot(lat - 41.3111, (lng - 69.2797) * 0.75) < 0.16) return "tashkent_city";
  let best = "tashkent", bd = Infinity;
  for (const r of REGIONS) {
    if (r.code === "tashkent_city") continue;
    const d = Math.hypot(lat - r.lat, (lng - r.lng) * 0.75);
    if (d < bd) { bd = d; best = r.code; }
  }
  return best;
}
