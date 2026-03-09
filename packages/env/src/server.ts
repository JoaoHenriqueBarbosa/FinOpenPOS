import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(1).default("dev-secret-key-change-in-production"),
    BASE_URL: z.string().url().default("http://localhost"),
    CORS_ORIGIN: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

const base = env.BASE_URL.replace(/\/$/, "");
const isDev = base === "http://localhost";

export const serverUrls = {
  betterAuthUrl: isDev ? "http://localhost:3001" : `${base}/app`,
  landingUrl: isDev ? undefined : base,
} as const;
