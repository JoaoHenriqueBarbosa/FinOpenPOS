import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";

const globalForPGlite = globalThis as unknown as {
  pglite: PGlite | undefined;
};

export const pglite =
  globalForPGlite.pglite ?? new PGlite("./data/pglite");

globalForPGlite.pglite = pglite;

export const db = drizzle({ client: pglite, schema });
