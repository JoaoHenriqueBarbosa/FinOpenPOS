import { createAuth } from "@finopenpos/auth";
import { db } from "./db";
import { serverUrls } from "@finopenpos/env/server";

export const auth = createAuth({
  db: db as any,
  baseURL: serverUrls.betterAuthUrl,
});
