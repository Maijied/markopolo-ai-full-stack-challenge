import { Router } from "express";
import { listMessages } from "../db/chatRepo";
import { addClient, removeClient } from "../realtime/sseHub";
import { redisSub, channelForSession } from "../lib/redisPubSub";

// Track which Redis channels this Node process has subscribed to
const subscribedChannels = new Set<string>();

// Track how many SSE clients are connected per session (for optional unsubscribe)
const sessionClientCounts = new Map<string, number>();

const router = Router();

router.get("/sessions/:sessionId/stream", async (req, res) => {
  const { sessionId } = req.params;
  const channel = channelForSession(sessionId);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (type: string, data: unknown) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Register client in hub
  addClient(sessionId, res);

  // Increase connected client count for this session
  sessionClientCounts.set(sessionId, (sessionClientCounts.get(sessionId) ?? 0) + 1);

  // Subscribe (once per process per channel)
  try {
    if (!subscribedChannels.has(channel)) {
      await redisSub.subscribe(channel);
      subscribedChannels.add(channel);
    }
  } catch (e: any) {
    send("error", {
      message: "redis subscribe failed",
      detail: String(e?.message ?? e),
    });

    // Roll back local accounting + cleanup
    removeClient(sessionId, res);
    sessionClientCounts.set(sessionId, Math.max(0, (sessionClientCounts.get(sessionId) ?? 1) - 1));
    if ((sessionClientCounts.get(sessionId) ?? 0) === 0) sessionClientCounts.delete(sessionId);

    return res.end();
  }

  // Handshake + snapshot
  send("status", { sessionId, message: "connected" });

  try {
    const messages = await listMessages(sessionId);
    send("snapshot", { sessionId, messages });
  } catch (e: any) {
    send("error", {
      message: "snapshot failed",
      detail: String(e?.message ?? e),
    });
  }

  // Keep-alive comment
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  // Cleanup
  req.on("close", async () => {
    clearInterval(keepAlive);
    removeClient(sessionId, res);
    res.end();

    // Decrease client count and optionally unsubscribe if last client left
    const nextCount = Math.max(0, (sessionClientCounts.get(sessionId) ?? 1) - 1);

    if (nextCount === 0) {
      sessionClientCounts.delete(sessionId);

      // Optional unsubscribe to reduce Redis subscription set over time
      try {
        await redisSub.unsubscribe(channel);
      } catch {
        // Ignore unsubscribe errors (non-critical)
      } finally {
        subscribedChannels.delete(channel);
      }
    } else {
      sessionClientCounts.set(sessionId, nextCount);
    }
  });
});

export default router;
