// =====================================================================
// eco-ai — mobil ilova uchun AI (Claude)
//   mode "classify": foto → muammo turi, ishonch %, qisqa tavsif
//   mode "chat":     AI yordamchi suhbati (ixtiyoriy rasm bilan)
// Sozlash: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          supabase functions deploy eco-ai
// =====================================================================
import Anthropic from "npm:@anthropic-ai/sdk";
import { adminClient, CATEGORIES, corsHeaders, json, requestUser } from "../_shared/common.ts";

const MODEL = "claude-opus-5-5";
const anthropic = new Anthropic(); // ANTHROPIC_API_KEY muhit o'zgaruvchisidan olinadi

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = typeof MEDIA_TYPES[number];

const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    is_environmental: { type: "boolean", description: "Rasmda ekologik muammo ko'rinadimi" },
    category: { type: "string", enum: [...CATEGORIES] },
    confidence: { type: "integer", description: "0-100, category to'g'riligiga ishonch" },
    severity: { type: "integer", enum: [1, 2, 3], description: "1 — kichik, 2 — o'rta, 3 — jiddiy/xavfli" },
    summary_uz: { type: "string", description: "Rasmda ko'ringan muammoning 1-2 gaplik o'zbekcha tavsifi" },
    summary_ru: { type: "string", description: "Xuddi shu tavsif rus tilida" },
    suggested_description: { type: "string", description: "Fuqaro arizasi uchun tayyor matn (o'zbekcha, 1-3 gap)" },
  },
  required: ["is_environmental", "category", "confidence", "severity", "summary_uz", "summary_ru", "suggested_description"],
  additionalProperties: false,
};

const CLASSIFY_SYSTEM = `Sen bbecoplatform.uz ekologik murojaatlar platformasining rasm tahlilchisisan.
Fuqaro yuborgan fotoni ko'rib, ekologik muammo turini aniqla:
- Chiqindi: maishiy/qurilish chiqindilari, noqonuniy axlatxona, to'lib ketgan konteynerlar, chiqindi yoqish
- Havo: tutun, chang, zavod mo'ridan chiqindi, barg yoqish, avtomobil tutuni
- Suv: ifloslangan suv havzasi, oqova tashlash, suv isrofi, quvur yorilishi, baliq o'limi
- Daraxt: daraxt kesish, quritish, shikastlangan yashil hudud
- Tuproq: tuproq ifloslanishi, kimyoviy to'kilish, noqonuniy qazish, eroziya
- Boshqa: yuqoridagilarga kirmaydigan ekologik buzilish
Rasmda ekologik muammo ko'rinmasa is_environmental=false va confidence past bo'lsin.
Ishonchni halol baholang: rasm noaniq bo'lsa confidence 60 dan past bo'lsin.
Rasmdagi odamlar, avtomobil raqamlari yoki shaxsiy ma'lumotlarni tavsifga yozma.`;

const CHAT_SYSTEM = `Sen — bbecoplatform.uz ilovasi ichidagi ekologiya bo'yicha AI yordamchisan.
Foydalanuvchilarning ekologik muammolar, tabiatni asrash, ariza (ECO REPORT) yuborish tartibi va ilova imkoniyatlari haqidagi savollariga
foydalanuvchi yozgan tilda (o'zbek yoki rus) qisqa, aniq va foydali javob ber.
Agar foydalanuvchi rasm yuborsa, undagi ekologik muammoni tavsifla, qaysi kategoriyaga (Chiqindi, Havo, Suv, Daraxt, Tuproq, Boshqa) tegishli ekanini ayt
va uni ilovadagi "ECO REPORT" orqali qanday yuborishni tushuntir.
Qonun moddalariga havola qilganda faqat aniq bilgan narsangni ayt; ishonching komil bo'lmasa, lex.uz saytidan tekshirishni tavsiya qil.`;

interface ImageInput { media_type: string; data: string }

function imageBlock(img?: ImageInput): Anthropic.Beta.Messages.BetaImageBlockParam | null {
  if (!img || !img.data) return null;
  if (!MEDIA_TYPES.includes(img.media_type as MediaType)) throw new Error("Rasm turi qo'llab-quvvatlanmaydi");
  if (img.data.length > 5_000_000) throw new Error("Rasm juda katta (≈3.7 MB dan kichik bo'lsin)");
  return { type: "image", source: { type: "base64", media_type: img.media_type as MediaType, data: img.data } };
}

/** Kunlik limit: ai_usage jadvalida hisoblanadi (service role) */
async function checkQuota(userId: string): Promise<string | null> {
  const db = adminClient();
  const { data: rows } = await db.from("app_settings").select("key,value").in("key", ["ai_enabled", "ai_daily_limit"]);
  const cfg = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  if (cfg.ai_enabled === false) return "AI yordamchi vaqtincha o'chirilgan";
  const limit = Number(cfg.ai_daily_limit ?? 20);
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await db.from("ai_usage").select("count").eq("user_id", userId).eq("day", today).maybeSingle();
  const used = usage?.count ?? 0;
  if (limit > 0 && used >= limit) return `Bugungi AI limiti tugadi (${limit} ta so'rov)`;
  await db.from("ai_usage").upsert({ user_id: userId, day: today, count: used + 1 });
  return null;
}

// server-side fallback (Claude API beta): xavfsizlik klassifikatori rad etsa,
// so'rov tavsiya etilgan modelda avtomatik qayta bajariladi.
type Params = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } satisfies Partial<Params>;

async function classify(img: ImageInput, hint: string) {
  const block = imageBlock(img);
  if (!block) throw new Error("Rasm yuborilmadi");
  const params: Params = {
    ...FALLBACK,
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema: CLASSIFY_SCHEMA } },
    system: CLASSIFY_SYSTEM,
    messages: [{
      role: "user",
      content: [block, { type: "text", text: hint ? `Fuqaro izohi: ${hint.slice(0, 500)}` : "Rasmni tahlil qil." }],
    }],
  };
  const response = await anthropic.beta.messages.create(params);
  if (response.stop_reason === "refusal") return { ok: false, error: "AI bu rasmni tahlil qila olmadi" };
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const out = JSON.parse(text);
  out.confidence = Math.max(0, Math.min(100, Number(out.confidence) || 0));
  return { ok: true, result: out, model: response.model };
}

interface ChatTurn { role: "user" | "assistant"; content: string }

async function chat(history: ChatTurn[], img?: ImageInput, lang = "uz") {
  const turns = history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  // Birinchi xabar user bo'lishi shart
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") throw new Error("Savol yuborilmadi");
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = turns.map((m) => ({ role: m.role, content: m.content }));
  const block = imageBlock(img);
  if (block) {
    const last = messages[messages.length - 1];
    last.content = [block, { type: "text", text: last.content as string }];
  }
  const params: Params = {
    ...FALLBACK,
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low" },
    system: CHAT_SYSTEM + (lang === "ru" ? "\nFoydalanuvchi interfeysi rus tilida." : ""),
    messages,
  };
  const response = await anthropic.beta.messages.create(params);
  if (response.stop_reason === "refusal") return { ok: false, error: "Kechirasiz, bu savolga javob bera olmayman." };
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return { ok: true, text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST kerak" }, 405);

  const user = await requestUser(req);
  if (!user) return json({ ok: false, error: "Kirish talab qilinadi" }, 401);

  let body: { mode?: string; image?: ImageInput; hint?: string; messages?: ChatTurn[]; lang?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Noto'g'ri JSON" }, 400); }

  const quota = await checkQuota(user.id);
  if (quota) return json({ ok: false, error: quota }, 429);

  try {
    if (body.mode === "classify") return json(await classify(body.image!, body.hint ?? ""));
    if (body.mode === "chat") return json(await chat(body.messages ?? [], body.image, body.lang));
    return json({ ok: false, error: "mode: classify yoki chat" }, 400);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ ok: false, error: "AI band, birozdan so'ng urinib ko'ring" }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic", err.status, err.message);
      return json({ ok: false, error: "AI xizmatida xatolik" }, 502);
    }
    console.error(err);
    return json({ ok: false, error: err instanceof Error ? err.message : "Xatolik" }, 400);
  }
});
