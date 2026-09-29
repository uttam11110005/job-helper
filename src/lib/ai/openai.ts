import "server-only";

// Provider-agnostic LLM client. Every supported provider speaks the OpenAI
// Chat Completions protocol, so one fetch covers all of them:
//   - Google Gemini   (free tier, no card)  GEMINI_API_KEY   ← default
//   - Groq            (free tier)           GROQ_API_KEY
//   - OpenAI          (paid)                OPENAI_API_KEY
// Without any key the app falls back to the offline demo engine.

type Json = Record<string, unknown>;

export const s = {
  str: (description?: string): Json => ({ type: "string", ...(description ? { description } : {}) }),
  num: (): Json => ({ type: "number" }),
  int: (): Json => ({ type: "integer" }),
  bool: (): Json => ({ type: "boolean" }),
  enm: (values: string[]): Json => ({ type: "string", enum: values }),
  arr: (items: Json): Json => ({ type: "array", items }),
  obj: (properties: Record<string, Json>): Json => ({
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }),
};

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "high" | "low" | "auto" } };

type ProviderId = "gemini" | "groq" | "openai";

interface Provider {
  id: ProviderId;
  label: string;
  baseUrl: string;
  keyEnv: string;
  model: string;
  visionModel: string;
  fallbackModel?: string; // used when the main model is overloaded (503/429)
  jsonSchema: boolean; // supports response_format json_schema reliably
}

const PROVIDERS: Record<ProviderId, Provider> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini (free tier)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyEnv: "GEMINI_API_KEY",
    model: "gemini-2.5-flash",
    visionModel: "gemini-2.5-flash",
    fallbackModel: "gemini-2.5-flash-lite",
    jsonSchema: true,
  },
  groq: {
    id: "groq",
    label: "Groq (free tier)",
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    model: "llama-3.3-70b-versatile",
    visionModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    jsonSchema: false,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyEnv: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4.1",
    visionModel: process.env.OPENAI_MODEL?.trim() || "gpt-4.1",
    jsonSchema: true,
  },
};

const key = (p: Provider) => process.env[p.keyEnv]?.trim() || "";

/** Explicit AI_PROVIDER wins; otherwise the first provider with a key (Gemini → Groq → OpenAI). */
export function activeProvider(): Provider | null {
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase() as ProviderId | undefined;
  if (wanted && PROVIDERS[wanted] && key(PROVIDERS[wanted])) return PROVIDERS[wanted];
  return (["gemini", "groq", "openai"] as ProviderId[]).map((id) => PROVIDERS[id]).find((p) => key(p)) ?? null;
}

export function hasAI() {
  return activeProvider() !== null;
}

export function modelName() {
  const p = activeProvider();
  return p ? process.env.AI_MODEL?.trim() || p.model : "demo";
}

export function providerLabel() {
  const p = activeProvider();
  return p ? `${p.label} · ${modelName()}` : "Offline demo engine";
}

// ───────── response repair ─────────

/** Fills missing fields / fixes types so downstream code can trust the shape. */
function coerce(schema: Json, v: unknown): unknown {
  switch (schema.type) {
    case "object": {
      const src = v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {};
      const props = schema.properties as Record<string, Json>;
      return Object.fromEntries(Object.entries(props).map(([k, sub]) => [k, coerce(sub, src[k])]));
    }
    case "array":
      return Array.isArray(v) ? v.map((x) => coerce(schema.items as Json, x)) : [];
    case "string": {
      const values = schema.enum as string[] | undefined;
      if (values) {
        const hit = values.find((e) => e.toLowerCase() === String(v ?? "").toLowerCase());
        return hit ?? values[0];
      }
      return v == null ? "" : typeof v === "string" ? v : String(v);
    }
    case "integer":
    case "number": {
      const n = Number(v);
      if (!Number.isFinite(n)) return schema.type === "integer" ? -1 : 0;
      return schema.type === "integer" ? Math.round(n) : n;
    }
    case "boolean":
      return typeof v === "boolean" ? v : v === "true";
    default:
      return v;
  }
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(cleaned);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function structured<T>(opts: {
  name: string;
  schema: Json;
  system: string;
  user: string | ContentPart[];
  temperature?: number;
}): Promise<T> {
  const p = activeProvider();
  if (!p) throw new Error("No AI provider configured.");
  const hasImages = Array.isArray(opts.user) && opts.user.some((c) => c.type === "image_url");
  const model = hasImages ? process.env.AI_VISION_MODEL?.trim() || p.visionModel : process.env.AI_MODEL?.trim() || p.model;

  const call = async (mode: "schema" | "object", modelId = model) => {
    const system =
      mode === "object"
        ? `${opts.system}\n\nReply with ONLY a JSON object that matches this JSON Schema exactly (all keys present):\n${JSON.stringify(opts.schema)}`
        : opts.system;
    const body = {
      model: modelId,
      temperature: opts.temperature ?? 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: opts.user },
      ],
      response_format:
        mode === "schema"
          ? { type: "json_schema", json_schema: { name: opts.name, strict: true, schema: opts.schema } }
          : { type: "json_object" },
    };
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${p.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key(p)}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(150_000),
      });
      // Free tiers rate-limit; back off and retry a couple of times.
      if ((res.status === 429 || res.status >= 500) && attempt < 2) {
        await sleep(2500 * (attempt + 1));
        continue;
      }
      return res;
    }
  };

  const mode = p.jsonSchema ? "schema" : "object";
  let res = await call(mode);
  if (res.status === 400 && p.jsonSchema) res = await call("object"); // schema feature rejected → JSON mode
  // Free tiers get overloaded at peak times — switch to the lighter model rather than fail.
  if ((res.status === 503 || res.status === 429) && p.fallbackModel && p.fallbackModel !== model) res = await call(mode, p.fallbackModel);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI ${res.status} (${p.label}): ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string | null; refusal?: string | null } }[] };
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`Model refused: ${msg.refusal}`);
  if (!msg?.content) throw new Error("Empty AI response");
  return coerce(opts.schema, parseJson(msg.content)) as T;
}
