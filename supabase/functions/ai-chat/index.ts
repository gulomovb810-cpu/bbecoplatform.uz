// =====================================================================
// bbecoplatform.uz — AI Yordamchi (Supabase Edge Function: ai-chat)
//
// Ilova (index.html) savolni shu funksiyaga yuboradi, funksiya AI
// provayderdan javob olib qaytaradi. API kalit faqat shu yerda,
// Supabase secrets ichida turadi va brauzerga hech qachon chiqmaydi.
//
// Provayder qaysi secret qo'yilganiga qarab tanlanadi:
//   ANTHROPIC_API_KEY  → Claude (pullik; ma'lumotlar o'qitishga ishlatilmaydi)
//   GEMINI_API_KEY     → Google Gemini (bepul tarif bor)
// Ikkalasi ham bo'lsa, Claude ishlatiladi.
//
// Xavfsizlik:
//   • faqat tizimga kirgan (mehmon ham) foydalanuvchi so'rov yubora oladi;
//   • har bir foydalanuvchiga kunlik limit (AI_DAILY_LIMIT, standart 30);
//   • telefon, email, pasport, JShShIR va karta raqamlari AI'ga
//     yuborilishidan oldin yashiriladi;
//   • savol va javob matnlari bazaga ham, logga ham yozilmaydi.
// =====================================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_TURNS = 12;        // AI'ga yuboriladigan oxirgi xabarlar soni
const MAX_CHARS = 1500;      // bitta xabar uzunligi chegarasi
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") || 30);
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `Sen bbecoplatform.uz ilovasidagi ekologiya bo'yicha AI yordamchisan. Ilova O'zbekiston fuqarolariga ekologik muammolar (chiqindi, havo, suv, daraxt kesish, tuproq) haqida mas'ul tashkilotlarga xabar berish imkonini beradi.

Vazifang:
- Ekologiya, atrof-muhitni asrash, chiqindilarni saralash, havo va suv sifati, O'zbekistondagi ekologik qoidalar va ilovadan foydalanish bo'yicha savollarga javob berish.
- Ilovada ariza (ECO REPORT) yuborish tartibi: bosh sahifada "ECO REPORT" → muammo tavsifi → joylashuv (xaritada belgilash) → rasm yoki video → toifa → tekshirib yuborish. Ariza holatini "Profil" bo'limida kuzatish mumkin.

Qoidalar:
- Foydalanuvchi qaysi tilda yozsa (o'zbek yoki rus), o'sha tilda javob ber.
- Qisqa, aniq va amaliy javob ber: odatda 2-6 jumla yoki qisqa ro'yxat.
- Qonun moddalari, jarima miqdorlari, telefon raqamlari yoki sanalarni aniq bilmasang, to'qib chiqarma: aniq bilmasligingni ayt va rasmiy manbani (lex.uz, Ekologiya vazirligi) tekshirishni maslahat ber.
- Foydalanuvchidan shaxsiy ma'lumot (telefon, pasport, manzil, JShShIR) so'rama. Matndagi [telefon], [email] kabi belgilar yashirilgan ma'lumotdir.
- Mavzudan tashqari savollarga muloyimlik bilan ekologiya mavzusiga qaytar.
- Xavfli vaziyatda (yong'in, zaharlanish, kimyoviy chiqindi) birinchi navbatda 101, 103 yoki 112 ga qo'ng'iroq qilishni ayt.`;

// Shaxsiy ma'lumotlarni AI'ga yuborishdan oldin yashirish
function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b(?:\d[ -]?){15,18}\d\b/g, "[karta]")
    .replace(/\b\d{14}\b/g, "[JShShIR]")
    .replace(/\b[A-Z]{2}\s?\d{7}\b/gi, "[pasport]")
    .replace(/(?:\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, "[telefon]");
}

type Turn = { role: "user" | "assistant"; content: string };

function cleanTurns(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: Turn[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    turns.push({ role: m.role, content: m.role === "user" ? redact(content) : content });
  }
  // AI tarixi user xabari bilan boshlanib, user xabari bilan tugashi kerak
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  // Ketma-ket bir xil rolli xabarlarni birlashtirish
  const merged: Turn[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content += "\n\n" + t.content;
    else merged.push({ ...t });
  }
  return merged;
}

async function askClaude(key: string, turns: Turn[]): Promise<string> {
  const client = new Anthropic({ apiKey: key, timeout: 45_000, maxRetries: 1 });
  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: Deno.env.get("CLAUDE_MODEL") || "claude-opus-5-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: turns,
    output_config: { effort: "low" }, // tez javob uchun
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  };
  const res = await client.beta.messages.create(params);
  if (res.stop_reason === "refusal") throw new Error("refusal");
  return res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();
}

async function askGemini(key: string, turns: Turn[]): Promise<string> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (res.status === 429) throw new Error("provider_limit");
  if (!res.ok) throw new Error("upstream_" + res.status);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p: { text?: string }) => p.text || "").join("").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "bad_request" }, 405);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!anthropicKey && !geminiKey) return json({ error: "not_configured" }, 503);

  // 1) Foydalanuvchini tekshirish (Supabase sessiyasi bo'lishi shart)
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  if (!user) return json({ error: "auth" }, 401);

  // 2) So'rovni tekshirish
  let body: { messages?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const turns = cleanTurns(body.messages);
  if (!turns) return json({ error: "bad_request" }, 400);

  // 3) Kunlik limit
  const { data: allowed, error: limitErr } = await admin.rpc("ai_consume", { p_user: user.id, p_limit: DAILY_LIMIT });
  if (limitErr) return json({ error: "upstream" }, 502);
  if (!allowed) return json({ error: "limit" }, 429);

  // 4) AI'dan javob olish (matnlar logga yozilmaydi)
  try {
    const reply = anthropicKey ? await askClaude(anthropicKey, turns) : await askGemini(geminiKey!, turns);
    if (!reply) return json({ error: "upstream" }, 502);
    return json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("ai-chat provider error:", msg.split("\n")[0].slice(0, 120));
    if (msg === "provider_limit") return json({ error: "busy" }, 503);
    if (msg === "refusal") return json({ error: "refusal" }, 200);
    return json({ error: "upstream" }, 502);
  }
});
