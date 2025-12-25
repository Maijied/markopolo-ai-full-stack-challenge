import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { pgPool } from "../lib/pg";

const router = Router();

router.post("/dev/run", async (_req, res) => {
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf-8");
    await pgPool.query(sql);
  }

  res.json({ ok: true, applied: files });
});

export default router;
