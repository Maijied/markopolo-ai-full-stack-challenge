import { Router } from "express";
import crypto from "node:crypto";
import { createSession, insertMessage, listMessages, ChatRole } from "../db/chatRepo";

const router = Router();

// Create a new session
router.post("/sessions", async (_req, res) => {
  const sessionId = crypto.randomUUID();
  await createSession(sessionId);
  res.status(201).json({ sessionId });
});

// Add a message to a session
router.post("/sessions/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const { role, content } = req.body as { role: ChatRole; content: string };

  if (!role || !content) return res.status(400).json({ error: "role and content are required" });

  const msgId = crypto.randomUUID();
  const row = await insertMessage({ id: msgId, sessionId, role, content });
  res.status(201).json(row);
});

// List messages
router.get("/sessions/:sessionId/messages", async (req, res) => {
  const { sessionId } = req.params;
  const rows = await listMessages(sessionId);
  res.json({ sessionId, messages: rows });
});

export default router;
