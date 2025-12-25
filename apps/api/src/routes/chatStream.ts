import { Router } from "express";
import { listMessages } from "../db/chatRepo";

const router = Router();

router.get("/sessions/:sessionId/stream", async (req, res) => {
  const { sessionId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (type: string, data: unknown) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("status", { sessionId, message: "connected" });

  // For now: just emit current messages once (Step 5+ will push live updates)
  const messages = await listMessages(sessionId);
  send("snapshot", { sessionId, messages });

  req.on("close", () => res.end());
});

export default router;
