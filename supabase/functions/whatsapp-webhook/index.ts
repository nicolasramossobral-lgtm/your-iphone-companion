import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

type ParsedOffer = {
  model: string;
  storage_gb: number | null;
  color: string;
  price: number | null;
  condition: "new" | "used" | "refurbished" | "unknown";
  stock_quantity: number | null;
  confidence: number;
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function parsePrice(value: string) {
  const normalized = value.replace(/R\$\s*/gi, "").trim();
  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLine(text: string): ParsedOffer {
  const normalized = normalize(text).replace(/\s+/g, " ").trim();
  const model =
    /17\s*PRO\s*MAX|17PM/.test(normalized) ? "iPhone 17 Pro Max" :
    /17\s*PRO/.test(normalized) ? "iPhone 17 Pro" :
    /\bIPHONE\s*17\b/.test(normalized) || /\b17\b/.test(normalized) ? "iPhone 17" :
    /16\s*PRO\s*MAX|16PM/.test(normalized) ? "iPhone 16 Pro Max" :
    /16\s*PRO/.test(normalized) ? "iPhone 16 Pro" :
    /\bIPHONE\s*16\b/.test(normalized) || /\b16\b/.test(normalized) ? "iPhone 16" : "";

  const storage = normalized.match(/\b(128|256|512|1024)\s*(?:GB|G)?\b/);
  const stock = normalized.match(/(?:ESTOQUE|QTD|QTDE|QUANTIDADE)?\s*(\d+)\s*(?:UN|UND|PCS|PC|UNIDADES?)\b/);
  const prices = [...normalized.matchAll(/R?\$?\s*(\d{1,2}(?:\.\d{3})+(?:,\d{2})?|\d{3,6}(?:,\d{2})?)/g)]
    .map((match) => parsePrice(match[1]))
    .filter((value): value is number => value !== null && value > 100);

  const colorMap: Array<[RegExp, string]> = [
    [/TITANIO\s+NATURAL|\bNATURAL\b|\bNAT\b/, "Natural"],
    [/LARANJA|ORANGE/, "Laranja"],
    [/AZUL|BLUE/, "Azul"],
    [/PRETO|BLACK/, "Preto"],
    [/BRANCO|WHITE/, "Branco"],
    [/VERDE|GREEN/, "Verde"],
    [/ROSA|PINK/, "Rosa"],
    [/ROXO|PURPLE/, "Roxo"],
  ];
  const color = colorMap.find(([pattern]) => pattern.test(normalized))?.[1] ?? "";
  const condition =
    /SEMI[N]?OVO|USADO/.test(normalized) ? "used" :
    /VITRINE|OPEN\s*BOX|REFURB/.test(normalized) ? "refurbished" :
    /NOVO|LACRADO/.test(normalized) ? "new" : "unknown";

  const price = prices[0] ?? null;
  const confidence = [
    Boolean(model),
    Boolean(storage),
    Boolean(color),
    price !== null,
    condition !== "unknown",
    Boolean(stock),
  ].filter(Boolean).length / 6;

  return {
    model,
    storage_gb: storage ? Number(storage[1]) : null,
    color,
    price,
    condition,
    stock_quantity: stock ? Number(stock[1]) : null,
    confidence,
  };
}

function parseOffers(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = (lines.length > 1 ? lines : text.split(/(?=IPHONE\s*\d+|\b(?:17|16)\s*PRO)/i))
    .map((line) => parseLine(line))
    .filter((item) => item.model && item.storage_gb && item.price !== null);

  return candidates.length ? candidates : [parseLine(text)];
}

async function verifySignature(req: Request, rawBody: string) {
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret) return false;

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = "sha256=" + [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < signature.length; index += 1) diff |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const token = url.searchParams.get("hub.verify_token");
    if (token && challenge && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) return new Response(challenge);
    return json({ ok: false }, 403);
  }

  if (req.method !== "POST") return json({ ok: false }, 405);

  const rawBody = await req.text();
  if (!(await verifySignature(req, rawBody))) return json({ ok: false, error: "Webhook não autenticado." }, 401);

  try {
    const body = JSON.parse(rawBody);
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey = keys.default;
    if (!secretKey) return json({ ok: false, error: "Chave interna do Supabase não configurada." }, 500);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      secretKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    let inserted = 0;
    let ignored = 0;
    let offersCreated = 0;

    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (change?.field !== "messages" || !Array.isArray(value?.messages)) continue;

        for (const message of value.messages) {
          const text =
            message?.text?.body ??
            message?.image?.caption ??
            message?.video?.caption ??
            message?.document?.caption ??
            "";

          if (!text.trim()) {
            ignored += 1;
            continue;
          }

          const externalId = message?.id ?? null;
          if (externalId) {
            const { data: existing } = await supa
              .from("whatsapp_messages")
              .select("id")
              .eq("external_message_id", externalId)
              .maybeSingle();
            if (existing) {
              ignored += 1;
              continue;
            }
          }

          const senderPhone = message?.from ?? null;
          const { data: supplierContact } = senderPhone
            ? await supa
                .from("supplier_contacts")
                .select("supplier_id")
                .eq("whatsapp", senderPhone)
                .eq("is_primary", true)
                .maybeSingle()
            : { data: null };

          const chatId = message?.group_id ?? senderPhone ?? value?.metadata?.phone_number_id ?? null;
          const receivedAt = message?.timestamp
            ? new Date(Number(message.timestamp) * 1000).toISOString()
            : new Date().toISOString();

          const { data: stored, error: storeError } = await supa
            .from("whatsapp_messages")
            .insert({
              supplier_id: supplierContact?.supplier_id ?? null,
              external_message_id: externalId,
              chat_id: chatId,
              sender_name: value?.contacts?.[0]?.profile?.name ?? null,
              sender_phone: senderPhone,
              message_text: text.trim(),
              received_at: receivedAt,
              raw_payload: message,
            })
            .select("id")
            .single();

          if (storeError || !stored) continue;
          inserted += 1;

          const parsedOffers = parseOffers(text);
          const confidence = parsedOffers.length
            ? Math.max(...parsedOffers.map((item) => item.confidence))
            : 0;

          await supa.from("message_processing").upsert({
            message_id: stored.id,
            status: confidence >= 0.75 ? "processed" : "pending",
            parser_version: "2.0",
            processed_at: confidence >= 0.75 ? new Date().toISOString() : null,
            extracted_data: { offers: parsedOffers, source: message?.group_id ? "group" : "direct" },
            error_message: null,
          });

          if (!supplierContact?.supplier_id) continue;

          for (const parsed of parsedOffers) {
            if (parsed.confidence < 0.75 || !parsed.model || !parsed.storage_gb || !parsed.color || parsed.price === null) continue;

            const { data: product } = await supa
              .from("products")
              .select("id")
              .eq("model", parsed.model)
              .eq("active", true)
              .maybeSingle();

            if (!product) continue;

            const { data: variant } = await supa
              .from("product_variants")
              .select("id")
              .eq("product_id", product.id)
              .eq("storage_gb", parsed.storage_gb)
              .eq("color", parsed.color)
              .eq("condition", parsed.condition)
              .maybeSingle();

            if (!variant) continue;

            const { data: existingOffer } = await supa
              .from("supplier_prices")
              .select("id")
              .eq("source_message_id", stored.id)
              .eq("product_variant_id", variant.id)
              .maybeSingle();

            if (existingOffer) continue;

            const { error: offerError } = await supa.from("supplier_prices").insert({
              supplier_id: supplierContact.supplier_id,
              product_variant_id: variant.id,
              price: parsed.price,
              stock_quantity: parsed.stock_quantity,
              source_message_id: stored.id,
              observed_at: receivedAt,
              active: true,
            });

            if (!offerError) offersCreated += 1;
          }
        }
      }
    }

    return json({ ok: true, inserted, ignored, offers_created: offersCreated });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Erro interno.",
    }, 500);
  }
});
