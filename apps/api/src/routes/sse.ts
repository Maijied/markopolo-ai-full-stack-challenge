import { Router } from "express";

const router = Router();

router.get("/ping", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // important for some proxies
  });

  const send = (type: string, data: unknown) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // initial handshake
  send("status", { message: "connected" });

  // main stream
  const tick = setInterval(() => {
    send("tick", { at: new Date().toISOString() });
  }, 1000);

  // keep-alive comment (prevents idle disconnects)
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n"); // SSE comment
  }, 15000);

  req.on("close", () => {
    clearInterval(tick);
    clearInterval(keepAlive);
    res.end();
  });
});

export default router;
