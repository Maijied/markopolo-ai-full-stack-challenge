import { Router } from "express";
import crypto from "node:crypto";
import { pgPool } from "../lib/pg";

const router = Router();

router.get("/", async (_req, res) => {
  const r = await pgPool.query(
    "select id, source, status, metadata, created_at from connections order by source asc"
  );
  res.json({ connections: r.rows });
});

router.post("/:source/connect", async (req, res) => {
  const { source } = req.params;
  if (!["website", "shopify", "crm"].includes(source)) {
    return res.status(400).json({ error: "invalid source" });
  }

  const id = crypto.randomUUID();
  const metadata = req.body?.metadata ?? {};

  await pgPool.query(
    `insert into connections (id, source, status, metadata)
     values ($1, $2, 'connected', $3)
     on conflict (source) do update set status='connected', metadata=$3`,
    [id, source, metadata]
  );

  res.json({ ok: true, source, status: "connected" });
});

router.post("/:source/disconnect", async (req, res) => {
  const { source } = req.params;
  if (!["website", "shopify", "crm"].includes(source)) {
    return res.status(400).json({ error: "invalid source" });
  }

  await pgPool.query(
    `insert into connections (id, source, status)
     values ($1, $2, 'disconnected')
     on conflict (source) do update set status='disconnected'`,
    [crypto.randomUUID(), source]
  );

  res.json({ ok: true, source, status: "disconnected" });
});

export default router;
