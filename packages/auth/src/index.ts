import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

type DrizzleDb = Parameters<typeof drizzleAdapter>[0];

interface AuthOptions {
  db: DrizzleDb;
  baseURL?: string;
  trustedOrigins?: string[];
}

export function createAuth({ db, baseURL, trustedOrigins }: AuthOptions) {
  return betterAuth({
    baseURL,
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    trustedOrigins,
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
