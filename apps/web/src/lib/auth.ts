import { createAuth } from "@finopenpos/auth";
import { db } from "./db";

export const auth = createAuth({
  db: db as any,
  baseURL: process.env.BETTER_AUTH_URL,
});
