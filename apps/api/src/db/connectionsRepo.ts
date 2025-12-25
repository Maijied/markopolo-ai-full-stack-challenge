import { pgPool } from "../lib/pg";

export type SourceName = "website" | "shopify" | "crm";

export async function getConnectedSources(): Promise<SourceName[]> {
  const r = await pgPool.query(
    "select source from connections where status = 'connected' order by source asc"
  );
  return r.rows.map((x: any) => x.source) as SourceName[];
}
