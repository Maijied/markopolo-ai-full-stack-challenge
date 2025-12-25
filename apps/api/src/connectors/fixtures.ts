import fs from "node:fs";
import path from "node:path";

export type SourceName = "website" | "shopify" | "crm";

export function loadFixture(source: SourceName): any {
  const file = path.join(process.cwd(), "fixtures", `${source}.json`);
  const raw = fs.readFileSync(file, "utf-8");
  return JSON.parse(raw);
}
