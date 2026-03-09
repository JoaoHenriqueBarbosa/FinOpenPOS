import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().min(1).default("dev-secret-key-change-in-production"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
    CORS_ORIGIN: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    LANDING_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
