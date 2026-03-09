#!/usr/bin/env bun
/**
 * prepare-prod.ts
 *
 * Converts the project from PGLite (embedded PostgreSQL WASM) to a real
 * PostgreSQL server, following the migration steps documented in README.md.
 *
 * What it does:
 *   1. Installs `pg` and removes `@electric-sql/pglite`
 *   2. Rewrites `src/lib/db/index.ts` to use node-postgres
 *   3. Rewrites `drizzle.config.ts` to use a DATABASE_URL
 *   4. Removes `db:ensure` from dev/build scripts in package.json
 *   5. Removes `serverExternalPackages` from next.config.mjs
 *   6. Deletes `scripts/ensure-db.ts`
 *   7. Adds DATABASE_URL to .env.example
 *
 * Usage:
 *   bun scripts/prepare-prod.ts
 */

import { $ } from "bun";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

function writeFile(relativePath: string, content: string): void {
  writeFileSync(join(ROOT, relativePath), content, "utf-8");
}

function deleteFile(relativePath: string): void {
  const fullPath = join(ROOT, relativePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
    console.log(`  Deleted ${relativePath}`);
  }
}

async function main() {
  console.log("\n=== prepare-prod: Converting PGLite → PostgreSQL ===\n");

  // Step 1: Install pg, remove pglite
  console.log("1. Installing pg and removing @electric-sql/pglite...");
  await $`cd ${ROOT} && bun add pg && bun add -d @types/pg && bun remove @electric-sql/pglite`.quiet();
  console.log("  Done.\n");

  // Step 2: Rewrite src/lib/db/index.ts
  console.log("2. Rewriting src/lib/db/index.ts...");
  writeFile(
    "src/lib/db/index.ts",
    `import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Set it in your .env file.");
}

export const db = drizzle(process.env.DATABASE_URL, { schema });
`
  );
  console.log("  Done.\n");

  // Step 3: Rewrite drizzle.config.ts
  console.log("3. Rewriting drizzle.config.ts...");
  writeFile(
    "drizzle.config.ts",
    `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`
  );
  console.log("  Done.\n");

  // Step 4: Update package.json scripts
  console.log("4. Updating package.json scripts...");
  const pkg = JSON.parse(readFile("package.json"));

  // Remove db:ensure from dev and build scripts
  if (pkg.scripts.dev) {
    pkg.scripts.dev = pkg.scripts.dev.replace("bun run db:ensure && ", "");
  }
  if (pkg.scripts.build) {
    pkg.scripts.build = pkg.scripts.build.replace("bun run db:ensure && ", "");
  }

  // Remove db:ensure script itself
  delete pkg.scripts["db:ensure"];

  // Add prepare-prod script if not present
  pkg.scripts["prepare-prod"] = "bun scripts/prepare-prod.ts";

  writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");
  console.log("  Done.\n");

  // Step 5: Remove serverExternalPackages from next.config.mjs
  console.log("5. Updating next.config.mjs...");
  let nextConfig = readFile("next.config.mjs");
  // Remove the serverExternalPackages line
  nextConfig = nextConfig.replace(
    /\s*serverExternalPackages:\s*\[.*?\],?\n?/,
    "\n"
  );
  // Clean up empty config object
  nextConfig = nextConfig.replace(
    /const nextConfig = \{\s*\n\s*\};/,
    "const nextConfig = {};"
  );
  writeFile("next.config.mjs", nextConfig);
  console.log("  Done.\n");

  // Step 6: Delete scripts/ensure-db.ts
  console.log("6. Deleting scripts/ensure-db.ts...");
  deleteFile("scripts/ensure-db.ts");
  console.log("");

  // Step 7: Add DATABASE_URL to .env.example
  console.log("7. Updating .env.example...");
  let envExample = readFile(".env.example");
  if (!envExample.includes("DATABASE_URL")) {
    envExample += "DATABASE_URL=postgresql://user:password@localhost:5432/finopenpos\n";
    writeFile(".env.example", envExample);
  }
  console.log("  Done.\n");

  console.log("=== Migration complete! ===\n");
  console.log("Next steps:");
  console.log("  1. Set DATABASE_URL in your .env file");
  console.log("  2. Run: bun run db:push");
  console.log("  3. Run: bun run dev");
  console.log("");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
