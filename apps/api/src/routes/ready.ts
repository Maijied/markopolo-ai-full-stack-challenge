import { Router } from "express";
import { pgPool } from "../lib/pg";
import { redis } from "../lib/redis";

const router = Router();

router.get("/", async (_req, res) => {
  const pgNow = await pgPool.query("select now() as now"); // basic query [web:117]
  const redisPong = await redis.ping(); // should be PONG when OK [web:127]

  res.json({
    ok: true,
    postgres: pgNow.rows[0],
    redis: redisPong,
  });
});

export default router;
