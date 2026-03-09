import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().url().default("http://localhost"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
  emptyStringAsUndefined: true,
});

const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
const isDev = base === "http://localhost";

export const urls = {
  base,
  app: isDev ? "http://localhost:3001" : `${base}/app`,
  docs: isDev ? "http://localhost:3002" : `${base}/docs`,
  apiDocs: isDev ? "http://localhost:3001/api/docs" : `${base}/app/api/docs`,
  landing: base,
} as const;
