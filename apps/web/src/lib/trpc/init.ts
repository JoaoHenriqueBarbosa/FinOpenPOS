import {
  router,
  createCallerFactory,
  publicProcedure,
  protectedProcedure,
  type TRPCContext,
} from "@finopenpos/api";
import { getAuthUser } from "@/lib/auth-guard";

export { router, createCallerFactory, publicProcedure, protectedProcedure };
export type { TRPCContext };

export const createTRPCContext = async (): Promise<TRPCContext> => {
  const user = await getAuthUser();
  return { user };
};
