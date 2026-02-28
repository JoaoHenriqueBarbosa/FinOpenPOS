import { existsSync, rmSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const DATA_DIR = "./data/pglite";

async function main() {
  if (!existsSync(DATA_DIR)) return;

  try {
    const pg = new PGlite(DATA_DIR);
    await pg.query("SELECT 1");
    await pg.close();
  } catch {
    console.warn("⚠ PGLite corrompido — limpando para recriação automática...");
    rmSync(DATA_DIR, { recursive: true, force: true });
  }
}

main();
