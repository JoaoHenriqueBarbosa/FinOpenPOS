import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { cities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { lookupCep } from "@/lib/fiscal/cep-lookup";

const cepResultSchema = z.object({
  zip_code: z.string(),
  street: z.string(),
  district: z.string(),
  city_name: z.string(),
  city_code: z.string(),
  state_code: z.string(),
});

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

  lookupCep: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/cities/cep/{cep}", tags: ["Cities"], summary: "Lookup address by CEP" } })
    .input(z.object({ cep: z.string().min(8).max(9) }))
    .output(cepResultSchema.nullable())
    .query(async ({ input }) => {
      return lookupCep(input.cep);
    }),
});
