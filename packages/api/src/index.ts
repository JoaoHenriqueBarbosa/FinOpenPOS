import { initTRPC, TRPCError } from "@trpc/server";
import type { OpenApiMeta } from "trpc-to-openapi";
import superjson from "superjson";

export interface BaseUser {
  id: string;
  name: string;
  email: string;
}

export interface TRPCContext {
  user: BaseUser | null;
}

const t = initTRPC.context<TRPCContext>().meta<OpenApiMeta>().create({
  transformer: superjson,
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export type { OpenApiMeta };
