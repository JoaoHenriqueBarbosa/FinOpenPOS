export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type QueryParams = {
  params: {};
};

export async function GET(req: Request, _ctx: QueryParams) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const typeFilter = url.searchParams.get("type");

    // Construir la consulta base
    let query = supabase
      .from("transactions")
      .select("type, amount");

    // Aplicar filtros de fecha
    if (fromDate) {
      query = query.gte("created_at", new Date(`${fromDate}T00:00:00`).toISOString());
    }
    if (toDate) {
      query = query.lte("created_at", new Date(`${toDate}T23:59:59.999`).toISOString());
    }
    // Aplicar filtro de tipo
    if (typeFilter && typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    const { data: transactions, error: queryError } = await query;

    if (queryError) {
      console.error("transactions query error:", queryError);
      return NextResponse.json(
        { error: queryError.message || "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Hacer GROUP BY y suma en JavaScript
    const summary = (transactions ?? []).reduce((acc: Record<string, number>, row: any) => {
      const type = row.type;
      const amount = Number(row.amount) || 0;
      acc[type] = (acc[type] || 0) + amount;
      return acc;
    }, {});

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("GET /transactions/balance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
