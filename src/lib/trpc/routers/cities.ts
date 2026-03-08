import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { cities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const citiesRouter = router({
  listByState: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/cities", tags: ["Cities"], summary: "List cities by state" } })
    .input(z.object({ state_code: z.string().length(2) }))
    .output(z.array(z.object({ id: z.number(), name: z.string(), state_code: z.string() })))
    .query(async ({ input }) => {
      return db
        .select()
        .from(cities)
        .where(eq(cities.state_code, input.state_code.toUpperCase()));
    }),
});
