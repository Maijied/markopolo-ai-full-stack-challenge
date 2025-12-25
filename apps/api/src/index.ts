import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import healthRouter from "../routes/health";
import sseRouter from "../routes/sse";

dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:4200";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use("/health", healthRouter);
app.use("/sse", sseRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
