// =====================================================================
// bbecoplatform.uz — AI Yordamchi (Supabase Edge Function: ai-chat)
//
// Ilova (index.html) savolni shu funksiyaga yuboradi, funksiya Google
// Gemini'dan javob olib qaytaradi. API kalit faqat shu yerda, Supabase
// secrets ichida turadi va brauzerga hech qachon chiqmaydi.
//
// Secrets:
//   GEMINI_API_KEY      — majburiy (aistudio.google.com → Get API key)
//   GEMINI_MODEL        — ixtiyoriy, asosiy model (standart gemini-3.6-flash)
//   GEMINI_FALLBACK     — ixtiyoriy, asosiy model band bo'lsa (standart gemini-3.1-flash-lite)
//   AI_GOOGLE_SEARCH    — "1" bo'lsa javob Google qidiruvi bilan tekshiriladi
//                         va manbalar ko'rsatiladi (faqat Gemini pullik tarifida)
//   AI_DAILY_LIMIT      — har bir foydalanuvchiga kunlik savollar (standart 30)
//   ALLOWED_ORIGIN      — https://bbecoplatform.uz
//   ANTHROPIC_API_KEY   — ixtiyoriy zaxira: Gemini ishlamay qolsa Claude javob beradi
//
// Xavfsizlik:
//   • faqat tizimga kirgan (mehmon ham) foydalanuvchi so'rov yubora oladi;
//   • har bir foydalanuvchiga kunlik limit;
//   • telefon, email, pasport, JShShIR va karta raqamlari AI'ga
//     yuborilishidan oldin yashiriladi;
//   • surat ilovada qayta chizilib yuboriladi, shuning uchun undagi GPS
//     va boshqa EXIF ma'lumotlari Google'ga bormaydi;
//   • savol, surat va javob bazaga ham, logga ham yozilmaydi.
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_TURNS = 12;            // AI'ga yuboriladigan oxirgi xabarlar soni
const MAX_CHARS = 1500;          // bitta xabar uzunligi chegarasi
const MAX_IMAGE_B64 = 1_500_000; // surat (base64) ~1.1 MB gacha
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") || 30);
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODELS = [
  Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash",
  Deno.env.get("GEMINI_FALLBACK") || "gemini-3.1-flash-lite",
].filter((m, i, a) => m && a.indexOf(m) === i);
const USE_SEARCH = Deno.env.get("AI_GOOGLE_SEARCH") === "1";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM_PROMPT = `Sen bbecoplatform.uz ilovasidagi ekologiya bo'yicha AI yordamchisan. Ilova O'zbekiston fuqarolariga ekologik muammolar (chiqindi, havo, suv, daraxt kesish, tuproq) haqida mas'ul tashkilotlarga xabar berish imkonini beradi.

Vazifang:
- Ekologiya, atrof-muhitni asrash, chiqindilarni saralash va topshirish, havo va suv sifati, O'zbekistondagi ekologik qoidalar va ilovadan foydalanish bo'yicha savollarga javob berish.
- Foydalanuvchi surat yuborsa: suratda nima borligini (chiqindi turi, ifloslanish, kesilgan daraxt va h.k.) qisqa ayt, uni qanday saralash yoki qayerga topshirish kerakligini tushuntir. Muammo bo'lsa, ilovada ariza yuborishni taklif qil. Suratdagi odamlarni, yuzlarni, avtomobil raqamlarini aniqlashga yoki tavsiflashga urinma.
- Ilovada ariza (ECO REPORT) yuborish tartibi: bosh sahifada "ECO REPORT" → muammo tavsifi → joylashuv (xaritada belgilash) → rasm yoki video → toifa → tekshirib yuborish. Ariza holatini "Profil" bo'limida kuzatish mumkin. Ariza toifa va hududga qarab mas'ul idoraga tushadi va qonun bo'yicha 15 kun ichida ko'rib chiqiladi.
- Chiqindi topshirish shoxobchalarini ilovadagi "Chiqindi shoxobchalari" xaritasidan topish mumkin.

Qoidalar:
- Foydalanuvchi qaysi tilda yozsa (o'zbek lotin, o'zbek kirill yoki rus), o'sha tilda javob ber.
- Qisqa, aniq va amaliy javob ber: odatda 2-6 jumla yoki qisqa ro'yxat. Kerak bo'lsa **qalin** va "- " ro'yxatdan foydalan, jadval va sarlavha ishlatma.
- Qonun moddalari, jarima miqdorlari, telefon raqamlari yoki sanalarni aniq bilmasang, to'qib chiqarma: aniq bilmasligingni ayt va rasmiy manbani (lex.uz, eco.gov.uz) tekshirishni maslahat ber.
- Foydalanuvchidan shaxsiy ma'lumot (telefon, pasport, manzil, JShShIR) so'rama. Matndagi [telefon], [email] kabi belgilar yashirilgan ma'lumotdir.
- Mavzudan tashqari savollarga muloyimlik bilan ekologiya mavzusiga qaytar.
- Xavfli vaziyatda (yong'in, zaharlanish, kimyoviy chiqindi, simob) birinchi navbatda 101, 103 yoki 112 ga qo'ng'iroq qilishni ayt.`;

// Shaxsiy ma'lumotlarni AI'ga yuborishdan oldin yashirish
export function redact(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\b(?:\d[ -]?){15,18}\d\b/g, "[karta]")
    .replace(/\b\d{14}\b/g, "[JShShIR]")
    .replace(/\b[A-Z]{2}\s?\d{7}\b/gi, "[pasport]")
    .replace(/(?:\+?998[\s-]?)?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, "[telefon]");
}

type Turn = { role: "user" | "assistant"; content: string };
type Image = { mime: string; data: string };
type Source = { title: string; url: string };

export function cleanTurns(raw: unknown): Turn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: Turn[] = [];
  for (const m of raw.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    turns.push({ role: m.role, content: m.role === "user" ? redact(content) : content });
  }
  // Tarix user xabari bilan boshlanib, user xabari bilan tugashi kerak
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

export function cleanImage(raw: unknown): Image | null | false {
  if (raw == null) return null;
  // deno-lint-ignore no-explicit-any
  const r = raw as any;
  if (typeof r !== "object" || !IMAGE_TYPES.includes(r.mime) || typeof r.data !== "string") return false;
  if (r.data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/]+=*$/.test(r.data)) return false;
  return { mime: r.mime, data: r.data };
}

// ---------------------------------------------------------------- Gemini
function geminiBody(turns: Turn[], image: Image | null, search: boolean) {
  const contents = turns.map((t, i) => {
    // deno-lint-ignore no-explicit-any
    const parts: any[] = [{ text: t.content }];
    if (image && i === turns.length - 1) parts.unshift({ inline_data: { mime_type: image.mime, data: image.data } });
    return { role: t.role === "assistant" ? "model" : "user", parts };
  });
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    ...(search ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { maxOutputTokens: 2048 },
    safetySettings: [
      "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      "HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT",
    ].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
  };
}

class ProviderError extends Error {
  constructor(public code: string, public status = 0) { super(code); }
}

// Model va qidiruv sozlamalarini navbat bilan sinab, birinchi ishlagan oqimni qaytaradi.
// Javob boshlangandan keyin boshqa modelga o'tilmaydi.
async function openGemini(key: string, turns: Turn[], image: Image | null): Promise<Response> {
  const tries: { model: string; search: boolean }[] = [];
  for (const model of MODELS) {
    if (USE_SEARCH) tries.push({ model, search: true });
    tries.push({ model, search: false });
  }
  let last: ProviderError = new ProviderError("upstream");
  for (const t of tries) {
    let res: Response;
    try {
      res = await fetch(`${GEMINI_BASE}${t.model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(geminiBody(turns, image, t.search)),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      last = new ProviderError("upstream"); continue;
    }
    if (res.ok && res.body) return res;
    await res.body?.cancel();
    // 400 — so'rov noto'g'ri (masalan, qidiruv bu tarifda yo'q), 404 — model yo'q,
    // 429/500/503 — band: keyingi variantga o'tamiz. 401/403 — kalit xato.
    if (res.status === 401 || res.status === 403) throw new ProviderError("key", res.status);
    last = new ProviderError(res.status === 429 || res.status === 503 ? "provider_limit" : "upstream", res.status);
  }
  throw last;
}

// Gemini SSE oqimidan matn bo'laklari va manbalarni ajratib olish
async function* readGemini(res: Response): AsyncGenerator<{ text?: string; sources?: Source[]; blocked?: boolean }> {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let ev;
      try { ev = JSON.parse(line.slice(5)); } catch { continue; }
      if (ev?.promptFeedback?.blockReason) { yield { blocked: true }; continue; }
      const c = ev?.candidates?.[0];
      if (!c) continue;
      const text = (c.content?.parts || [])
        .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
        .map((p: { text: string }) => p.text).join("");
      if (text) yield { text };
      if (c.finishReason === "SAFETY" || c.finishReason === "PROHIBITED_CONTENT") yield { blocked: true };
      const chunks = c.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks) && chunks.length) {
        const sources: Source[] = [];
        for (const g of chunks as { web?: { uri?: unknown; title?: unknown } }[]) {
          const uri = g?.web?.uri;
          if (typeof uri === "string" && uri.startsWith("https://") && sources.length < 5) {
            sources.push({ url: uri, title: String(g.web!.title || uri).slice(0, 120) });
          }
        }
        if (sources.length) yield { sources };
      }
    }
  }
}

// ------------------------------------------------- Claude (ixtiyoriy zaxira)
async function askClaude(key: string, turns: Turn[], image: Image | null): Promise<string> {
  const content = turns.map((t, i) => ({
    role: t.role,
    content: image && i === turns.length - 1
      ? [{ type: "image", source: { type: "base64", media_type: image.mime, data: image.data } }, { type: "text", text: t.content }]
      : t.content,
  }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: Deno.env.get("CLAUDE_MODEL") || "claude-haiku-4-5",
      max_tokens: 2048, system: SYSTEM_PROMPT, messages: content,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new ProviderError(res.status === 429 ? "provider_limit" : "upstream", res.status);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new ProviderError("refusal");
  return (data.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
}

// ------------------------------------------------------------------ HTTP
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "bad_request" }, 405);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const claudeKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!geminiKey && !claudeKey) return json({ error: "not_configured" }, 503);

  // 1) Foydalanuvchini tekshirish (Supabase sessiyasi bo'lishi shart)
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } };
  if (!user) return json({ error: "auth" }, 401);

  // 2) So'rovni tekshirish
  let body: { messages?: unknown; image?: unknown; stream?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const turns = cleanTurns(body.messages);
  const image = cleanImage(body.image);
  if (!turns || image === false) return json({ error: "bad_request" }, 400);
  const stream = body.stream === true;

  // 3) Kunlik limit
  const { data: allowed, error: limitErr } = await admin.rpc("ai_consume", { p_user: user.id, p_limit: DAILY_LIMIT });
  if (limitErr) return json({ error: "upstream" }, 502);
  if (!allowed) return json({ error: "limit" }, 429);

  const fail = (e: unknown) => {
    const code = e instanceof ProviderError ? e.code : "upstream";
    // Faqat xato turi logga yoziladi, matn emas
    console.error("ai-chat provider error:", code, e instanceof ProviderError ? e.status : "");
    if (code === "provider_limit") return { error: "busy", status: 503 };
    if (code === "refusal") return { error: "refusal", status: 200 };
    return { error: "upstream", status: 502 };
  };

  // 4) Gemini oqimini ochish; ishlamasa Claude zaxirasi (agar kalit bo'lsa)
  let gem: Response | null = null;
  let fallbackText: string | null = null;
  try {
    if (geminiKey) gem = await openGemini(geminiKey, turns, image);
    else fallbackText = await askClaude(claudeKey!, turns, image);
  } catch (e) {
    if (claudeKey && geminiKey) {
      try { fallbackText = await askClaude(claudeKey, turns, image); } catch (e2) { const f = fail(e2); return json({ error: f.error }, f.status); }
    } else { const f = fail(e); return json({ error: f.error }, f.status); }
  }

  // 5a) Jonli oqim: ilova javobni yozilayotgan paytida ko'radi
  if (stream) {
    const enc = new TextEncoder();
    const out = new ReadableStream({
      async start(ctrl) {
        const send = (o: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        try {
          if (fallbackText !== null) { send({ t: fallbackText }); send({ done: true, sources: [] }); return; }
          let got = false, blocked = false, sources: Source[] = [];
          for await (const ev of readGemini(gem!)) {
            if (ev.text) { got = true; send({ t: ev.text }); }
            if (ev.sources) sources = ev.sources;
            if (ev.blocked) blocked = true;
          }
          if (!got) send({ error: blocked ? "refusal" : "upstream" });
          else send({ done: true, sources });
        } catch (e) {
          send({ error: fail(e).error });
        } finally { ctrl.close(); }
      },
    });
    return new Response(out, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }

  // 5b) Oddiy javob (eski ilova versiyalari uchun)
  if (fallbackText !== null) return fallbackText ? json({ reply: fallbackText, sources: [] }) : json({ error: "upstream" }, 502);
  try {
    let reply = "", blocked = false, sources: Source[] = [];
    for await (const ev of readGemini(gem!)) {
      if (ev.text) reply += ev.text;
      if (ev.sources) sources = ev.sources;
      if (ev.blocked) blocked = true;
    }
    reply = reply.trim();
    if (!reply) return blocked ? json({ error: "refusal" }) : json({ error: "upstream" }, 502);
    return json({ reply, sources });
  } catch (e) {
    const f = fail(e); return json({ error: f.error }, f.status);
  }
});
