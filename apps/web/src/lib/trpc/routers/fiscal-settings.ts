import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { fiscalSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCertificateInfo } from "@finopenpos/fiscal/certificate";
import { checkSefazStatus } from "@/lib/invoice-service";

export const fiscalSettingsRouter = router({
  get: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal-settings", tags: ["Fiscal"], summary: "Get fiscal settings" } })
    .input(z.void())
    .output(z.any())
    .query(async ({ ctx }) => {
      const result = await db
        .select()
        .from(fiscalSettings)
        .where(eq(fiscalSettings.user_uid, ctx.user.id))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      // Never return the raw PFX or password to the client
      return {
        ...row,
        certificate_pfx: row.certificate_pfx ? true : null,
        certificate_password: row.certificate_password ? "********" : null,
      };
    }),

  upsert: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal-settings", tags: ["Fiscal"], summary: "Create or update fiscal settings" } })
    .input(
      z.object({
        company_name: z.string().min(1),
        trade_name: z.string().optional(),
        tax_id: z.string().length(14),
        state_tax_id: z.string().min(1),
        tax_regime: z.number().int().min(1).max(3),
        state_code: z.string().length(2),
        city_code: z.string().length(7),
        city_name: z.string().min(1),
        street: z.string().min(1),
        street_number: z.string().min(1),
        district: z.string().min(1),
        zip_code: z.string().length(8),
        address_complement: z.string().optional(),
        environment: z.number().int().min(1).max(2),
        nfe_series: z.number().int().optional(),
        nfce_series: z.number().int().optional(),
        csc_id: z.string().optional(),
        csc_token: z.string().optional(),
        // Certificate as base64 string
        certificate_pfx_base64: z.string().optional(),
        certificate_password: z.string().optional(),
        // Default fiscal fields
        default_ncm: z.string().max(8).optional(),
        default_cfop: z.string().max(4).optional(),
        default_icms_cst: z.string().max(3).optional(),
        default_pis_cst: z.string().max(2).optional(),
        default_cofins_cst: z.string().max(2).optional(),
      })
    )
    .output(z.object({ success: z.boolean(), id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { certificate_pfx_base64, ...data } = input;

      // Prepare certificate data if provided
      let certData: {
        certificate_pfx?: Buffer;
        certificate_valid_until?: Date;
      } = {};

      if (certificate_pfx_base64 && data.certificate_password) {
        const pfxBuffer = Buffer.from(certificate_pfx_base64, "base64");
        const certInfo = getCertificateInfo(pfxBuffer, data.certificate_password);
        certData = {
          certificate_pfx: pfxBuffer,
          certificate_valid_until: certInfo.validUntil,
        };
      }

      // Check if settings already exist
      const existing = await db
        .select({ id: fiscalSettings.id })
        .from(fiscalSettings)
        .where(eq(fiscalSettings.user_uid, ctx.user.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(fiscalSettings)
          .set({
            ...data,
            ...certData,
            updated_at: new Date(),
          })
          .where(eq(fiscalSettings.user_uid, ctx.user.id));

        return { success: true, id: existing[0].id };
      }

      const [row] = await db
        .insert(fiscalSettings)
        .values({
          user_uid: ctx.user.id,
          ...data,
          ...certData,
        })
        .returning({ id: fiscalSettings.id });

      return { success: true, id: row.id };
    }),

  testConnection: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal-settings/test-connection", tags: ["Fiscal"], summary: "Test SEFAZ connection" } })
    .input(z.void())
    .output(
      z.object({
        online: z.boolean(),
        statusCode: z.number(),
        statusMessage: z.string(),
        averageTime: z.number().optional(),
      })
    )
    .mutation(async ({ ctx }) => {
      return checkSefazStatus(ctx.user.id);
    }),

  certificateInfo: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal-settings/certificate", tags: ["Fiscal"], summary: "Get certificate info" } })
    .input(z.void())
    .output(z.any())
    .query(async ({ ctx }) => {
      const result = await db
        .select({
          pfx: fiscalSettings.certificate_pfx,
          password: fiscalSettings.certificate_password,
        })
        .from(fiscalSettings)
        .where(eq(fiscalSettings.user_uid, ctx.user.id))
        .limit(1);

      if (!result[0]?.pfx || !result[0]?.password) {
        return null;
      }

      return getCertificateInfo(result[0].pfx, result[0].password);
    }),
});
