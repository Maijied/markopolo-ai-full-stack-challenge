import express from "express";
import cors from "cors";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import "./realtime/redisFanout";

import { pgPool } from "./lib/pg"; 
// import { redis } from "./lib/redis";
import readyRouter from "./routes/ready";
import migrateRouter from "./routes/migrate";
import healthRouter from "./routes/health";
import sseRouter from "./routes/sse";
import chatRouter from "./routes/chat";
import chatStreamRouter from "./routes/chatStream";
import { redisPub, redisSub } from "./lib/redisPubSub";

const app = express();

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:4200";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/sse", sseRouter);
app.use("/ready", readyRouter);
app.use("/migrate", migrateRouter);
app.use("/chat", chatRouter);
app.use("/chat", chatStreamRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

// process.on("SIGINT", async () => {
//   await pgPool.end();
//   await redis.quit();
//   process.exit(0);
// });

process.on("SIGINT", async () => {
  await pgPool.end();
  await redisPub.quit();
  await redisSub.quit();
  process.exit(0);
});