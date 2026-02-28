import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

const globalForPGlite = globalThis as unknown as {
  pglite: PGlite | undefined;
};

function createPGlite() {
  // In production (Vercel), use in-memory — no filesystem access at runtime.
  // In development, persist to ./data/pglite for convenience.
  if (process.env.NODE_ENV === "production") {
    return new PGlite();
  }
  return new PGlite("./data/pglite");
}

export const pglite = globalForPGlite.pglite ?? createPGlite();

if (process.env.NODE_ENV !== "production") {
  globalForPGlite.pglite = pglite;
}

export const db = drizzle({ client: pglite, schema });
