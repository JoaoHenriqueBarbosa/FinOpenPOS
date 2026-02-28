import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

const globalForPGlite = globalThis as unknown as {
  pglite: PGlite | undefined;
};

function createPGlite() {
  if (process.env.NODE_ENV === "production") {
    return new PGlite();
  }
  return new PGlite("./data/pglite");
}

// Always reuse the same instance — critical for in-memory mode in production,
// and to avoid duplicates during HMR in development.
export const pglite = globalForPGlite.pglite ??= createPGlite();

export const db = drizzle({ client: pglite, schema });
