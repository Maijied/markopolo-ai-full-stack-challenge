import { Router } from "express";
import { pgPool } from "../lib/pg";
import { redisPub, channelForSession } from "../lib/redisPubSub";

import campaignJsonSchema from "../campaign/campaign.schema.json";
import { pplxChatCompletions, pplxStreamChatCompletions } from "../llm/perplexity";

import { getConnectedSources } from "../db/connectionsRepo";
import { loadFixture } from "../connectors/fixtures";
import { CampaignPayloadSchema } from "../campaign/schema";

const router = Router();

function* parseSseEventsFromBuffer(buffer: string): Generator<{ dataLines: string[] }, void> {
  const events = buffer.split("\n\n");
  for (let i = 0; i < events.length - 1; i++) {
    const lines = events[i].split("\n");
    const dataLines: string[] = [];
    for (const l of lines) {
      if (l.startsWith("data:")) dataLines.push(l.slice("data:".length).trim());
    }
    yield { dataLines };
  }
}

async function streamDraftToRedis(params: {
  apiKey: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  publish: (type: string, data: unknown) => Promise<void>;
}) {
  const pplxRes = await pplxStreamChatCompletions({
    apiKey: params.apiKey,
    model: params.model,
    messages: params.messages,
    returnCitations: false,
  });

  const reader = pplxRes.body?.getReader();
  if (!reader) throw new Error("Perplexity response body is empty (no stream)");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let streamedChars = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    const tail = parts.pop() ?? "";
    const completePart = parts.join("\n\n") + "\n\n";
    buffer = tail;

    for (const evt of parseSseEventsFromBuffer(completePart)) {
      for (const dataStr of evt.dataLines) {
        if (!dataStr || dataStr === "[DONE]") continue;

        let chunk: any;
        try {
          chunk = JSON.parse(dataStr);
        } catch {
          continue;
        }

        const delta = chunk?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          streamedChars += delta.length;
          await params.publish("draft.delta", { text: delta });
        }
      }
    }

    // Keep the draft channel lightweight: stop after ~4000 chars
    if (streamedChars >= 4000) break;
  }
}

router.post("/sessions/:sessionId/generate", async (req, res) => {
  const { sessionId } = req.params;
  const { prompt, channels } = req.body as { prompt: string; channels: string[] };

  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  res.json({ ok: true });

  const publish = async (type: string, data: unknown) => {
    await redisPub.publish(channelForSession(sessionId), JSON.stringify({ type, data }));
  };

  await publish("status", { message: "Starting campaign generation..." });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    await publish("error", { message: "PERPLEXITY_API_KEY not set" });
    return;
  }

  const model = process.env.PERPLEXITY_MODEL ?? "sonar-pro";
  const selectedChannels = (channels?.length ? channels : ["email", "sms", "whatsapp", "ads"]) as string[];

  const connectedSources = await getConnectedSources();
  if (connectedSources.length === 0) {
    await publish("error", { message: "No connected sources. Connect at least one source first." });
    return;
  }

  const signals: Record<string, any> = {};
  for (const s of connectedSources) signals[s] = loadFixture(s);

  const signalsSummary = JSON.stringify(
    {
      connectedSources,
      website: signals.website
        ? { eventsLast7d: signals.website.eventsLast7d, topPages: signals.website.topPages }
        : undefined,
      shopify: signals.shopify
        ? {
            ordersLast30d: signals.shopify.ordersLast30d,
            aov: signals.shopify.aov,
            repeatCustomerRate: signals.shopify.repeatCustomerRate,
          }
        : undefined,
      crm: signals.crm ? { segments: signals.crm.segments, consent: signals.crm.consent } : undefined,
    },
    null,
    2
  );

  // Pass A (stream draft) prompt: allow normal natural language, but ask to keep it short.
  const draftSystem = `You are drafting a campaign plan.
Keep it short, bullet-like, and do not include citations.
This is a DRAFT preview only; do not output JSON.`;

  const draftUser = `User prompt: ${prompt}
Selected channels: ${JSON.stringify(selectedChannels)}
Signals: ${signalsSummary}`;

  // Pass B (final JSON) prompt: strict + schema-enforced.
  const finalSystem = `You are a marketing automation planner.
Return ONLY JSON matching the provided JSON Schema.
Do not include citations like [1] and do not include extra keys.`;

  const finalUser = `User prompt: ${prompt}
Selected channels: ${JSON.stringify(selectedChannels)}
Signals (from connected sources): ${signalsSummary}`;

  try {
    // Run draft streaming (don’t fail the whole run if draft fails)
    await publish("status", { message: "Draft streaming started..." });
    streamDraftToRedis({
      apiKey,
      model,
      messages: [
        { role: "system", content: draftSystem },
        { role: "user", content: draftUser },
      ],
      publish,
    }).catch(async (e) => {
      await publish("status", { message: "Draft streaming failed (continuing to final)", detail: String(e?.message ?? e) });
    });

    // Final structured output (authoritative)
    await publish("status", { message: "Final JSON generation started..." });

    const out = await pplxChatCompletions({
      apiKey,
      model,
      returnCitations: false,
      responseFormat: {
        type: "json_schema",
        json_schema: { schema: campaignJsonSchema },
      },
      messages: [
        { role: "system", content: finalSystem },
        { role: "user", content: finalUser },
      ],
    });

    const text: string = out?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) {
      await publish("error", { message: "Empty model response", raw: out });
      return;
    }

    let payloadRaw: any;
    try {
      payloadRaw = JSON.parse(text);
    } catch {
      await publish("error", { message: "Model response was not valid JSON", raw: text });
      return;
    }

    // Force connected sources (prevents hallucination / mismatch)
    payloadRaw.inputs = payloadRaw.inputs ?? {};
    payloadRaw.inputs.connectedSources = connectedSources;

    const parsed = CampaignPayloadSchema.safeParse(payloadRaw);
    if (!parsed.success) {
      await publish("error", {
        message: "Campaign JSON failed validation",
        issues: parsed.error.issues,
        raw: payloadRaw,
      });
      return;
    }

    await pgPool.query(
      "insert into campaign_payloads (session_id, payload_json) values ($1, $2)",
      [sessionId, parsed.data]
    );

    await publish("campaign.generated", parsed.data);
    await publish("status", { message: "Campaign generated" });
  } catch (e: any) {
    await publish("error", { message: "Generation failed", detail: String(e?.message ?? e) });
  }
});

export default router;
