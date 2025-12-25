import { Pool } from "pg";

export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: String(process.env.POSTGRES_PASSWORD),
});
