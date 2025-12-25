import { Router } from "express";
import { pgPool } from "../lib/pg";
import { redisPub, channelForSession } from "../lib/redisPubSub";
import { pplxStreamChatCompletions } from "../llm/perplexity";

const router = Router();

router.post("/sessions/:sessionId/generate", async (req, res) => {
  const { sessionId } = req.params;
  const { prompt, channels } = req.body as { prompt: string; channels: string[] };

  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  // 1) Immediately ACK to the HTTP caller (generation continues async-ish)
  res.json({ ok: true });

  const publish = async (type: string, data: unknown) => {
    await redisPub.publish(
      channelForSession(sessionId),
      JSON.stringify({ type, data })
    );
  };

  await publish("status", { message: "Starting Perplexity generation..." });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    await publish("error", { message: "PERPLEXITY_API_KEY not set" });
    return;
  }

  // 2) Prompt the model to output JSON only
  const system = `You are a marketing automation planner.
Return ONLY valid JSON (no markdown, no prose).
Output must include: objective, audience, timing, channels[].`;

  const user = `Prompt: ${prompt}
Channels: ${JSON.stringify(channels ?? ["email","sms","whatsapp","ads"])}
Return a campaign JSON.`;

  try {
    const pplxRes = await pplxStreamChatCompletions({
      apiKey,
      model: "sonar-pro",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    // 3) Read Perplexity SSE stream and forward partial text as "draft.delta"
    const reader = pplxRes.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Perplexity streams as SSE-like "data: {...}\n\n"
      // We'll parse line-by-line.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const chunk of parts) {
        const line = chunk.split("\n").find(l => l.startsWith("data: "));
        if (!line) continue;

        const dataStr = line.slice("data: ".length).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const json = JSON.parse(dataStr);
          const delta = json?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            await publish("draft.delta", { text: delta });
          }
        } catch {
          // ignore parse errors for non-JSON lines
        }
      }
    }

    // 4) Try to parse the final JSON
    const start = fullText.indexOf("{");
    const end = fullText.lastIndexOf("}");
    if (start === -1 || end === -1) {
      await publish("error", { message: "Model did not return JSON", raw: fullText });
      return;
    }

    const jsonText = fullText.slice(start, end + 1);
    const payload = JSON.parse(jsonText);

    // 5) Emit final
    await publish("campaign.generated", payload);

    // Optional: persist payload
    await pgPool.query(
      "insert into campaign_payloads (session_id, payload_json) values ($1, $2)",
      [sessionId, payload]
    );

    await publish("status", { message: "Campaign generated" });
  } catch (e: any) {
    await publish("error", { message: "Generation failed", detail: String(e?.message ?? e) });
  }
});

export default router;
