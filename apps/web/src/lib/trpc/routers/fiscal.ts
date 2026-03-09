import { z } from "zod/v4";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import { invoices, invoiceItems, invoiceEvents } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  issueInvoice,
  cancelInvoice,
  voidNumberRange,
  checkSefazStatus,
  syncPendingInvoices,
} from "@/lib/invoice-service";

export const fiscalRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal/invoices", tags: ["Fiscal"], summary: "List invoices" } })
    .input(z.void())
    .output(z.any())
    .query(async ({ ctx }) => {
      return db
        .select()
        .from(invoices)
        .where(eq(invoices.user_uid, ctx.user.id))
        .orderBy(desc(invoices.created_at));
    }),

  get: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal/invoices/{id}", tags: ["Fiscal"], summary: "Get invoice details" } })
    .input(z.object({ id: z.number() }))
    .output(z.any())
    .query(async ({ ctx, input }) => {
      const invoice = await db.query.invoices.findFirst({
        where: and(eq(invoices.id, input.id), eq(invoices.user_uid, ctx.user.id)),
        with: {
          items: true,
          events: {
            orderBy: (events, { desc }) => [desc(events.created_at)],
          },
        },
      });

      if (!invoice) return null;
      return invoice;
    }),

  emit: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal/invoices/emit", tags: ["Fiscal"], summary: "Emit an invoice" } })
    .input(
      z.object({
        order_id: z.number(),
        model: z.number().int(), // 55 or 65
        recipient_tax_id: z.string().optional(),
        recipient_name: z.string().optional(),
      })
    )
    .output(
      z.object({
        invoice_id: z.number(),
        status: z.string(),
        access_key: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await issueInvoice(
        input.order_id,
        input.model as 55 | 65,
        ctx.user.id,
        input.recipient_tax_id,
        input.recipient_name
      );

      return {
        invoice_id: result.invoiceId,
        status: result.status,
        access_key: result.accessKey,
      };
    }),

  cancel: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal/invoices/{id}/cancel", tags: ["Fiscal"], summary: "Cancel an invoice" } })
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(15),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        statusCode: z.number(),
        statusMessage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return cancelInvoice(input.id, input.reason, ctx.user.id);
    }),

  voidRange: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal/invoices/void-range", tags: ["Fiscal"], summary: "Void a number range" } })
    .input(
      z.object({
        model: z.number().int(),
        series: z.number().int(),
        start_number: z.number().int(),
        end_number: z.number().int(),
        reason: z.string().min(15),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        statusCode: z.number(),
        statusMessage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return voidNumberRange(
        input.model as 55 | 65,
        input.series,
        input.start_number,
        input.end_number,
        input.reason,
        ctx.user.id
      );
    }),

  checkStatus: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal/status", tags: ["Fiscal"], summary: "Check SEFAZ status" } })
    .input(z.void())
    .output(
      z.object({
        online: z.boolean(),
        statusCode: z.number(),
        statusMessage: z.string(),
        averageTime: z.number().optional(),
      })
    )
    .query(async ({ ctx }) => {
      return checkSefazStatus(ctx.user.id);
    }),

  syncPending: protectedProcedure
    .meta({ openapi: { method: "POST", path: "/fiscal/invoices/sync", tags: ["Fiscal"], summary: "Sync pending contingency invoices" } })
    .input(z.void())
    .output(
      z.object({
        total: z.number(),
        authorized: z.number(),
        failed: z.number(),
      })
    )
    .mutation(async ({ ctx }) => {
      return syncPendingInvoices(ctx.user.id);
    }),

  downloadXml: protectedProcedure
    .meta({ openapi: { method: "GET", path: "/fiscal/invoices/{id}/xml", tags: ["Fiscal"], summary: "Download invoice XML" } })
    .input(
      z.object({
        id: z.number(),
        type: z.enum(["request", "response", "protocol"]).default("protocol"),
      })
    )
    .output(z.object({ xml: z.string().nullable() }))
    .query(async ({ ctx, input }) => {
      const invoice = await db
        .select({
          request_xml: invoices.request_xml,
          response_xml: invoices.response_xml,
          protocol_xml: invoices.protocol_xml,
        })
        .from(invoices)
        .where(and(eq(invoices.id, input.id), eq(invoices.user_uid, ctx.user.id)))
        .limit(1);

      if (!invoice[0]) return { xml: null };

      const xmlMap = {
        request: invoice[0].request_xml,
        response: invoice[0].response_xml,
        protocol: invoice[0].protocol_xml,
      };

      return { xml: xmlMap[input.type] || null };
    }),
});
