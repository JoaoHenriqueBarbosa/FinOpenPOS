import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_DOCS_URL: z.string().url().default("http://localhost:3002"),
    NEXT_PUBLIC_API_DOCS_URL: z.string().url().default("http://localhost:3001/api/docs"),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_API_DOCS_URL: process.env.NEXT_PUBLIC_API_DOCS_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  emptyStringAsUndefined: true,
});
