import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getAuthUser } from "@/lib/auth-guard";

export const createTRPCContext = async () => {
  const user = await getAuthUser();
  return { user };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
