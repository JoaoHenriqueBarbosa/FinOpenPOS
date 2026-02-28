import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  driver: "pglite",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: "./data/pglite",
  },
});
