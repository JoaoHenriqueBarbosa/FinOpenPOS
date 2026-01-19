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

    // Construir la consulta base - incluir payment_method_id para calcular balance por método de pago
    let query = supabase
      .from("transactions")
      .select("type, amount, payment_method_id");

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

    // Obtener métodos de pago para tener sus nombres
    const { data: paymentMethods, error: pmError } = await supabase
      .from("payment_methods")
      .select("id, name");

    if (pmError) {
      console.error("payment_methods query error:", pmError);
    }

    const paymentMethodsMap = new Map(
      (paymentMethods ?? []).map((pm: any) => [pm.id, pm.name])
    );

    // Hacer GROUP BY y suma en JavaScript por tipo de transacción
    const summary = (transactions ?? []).reduce((acc: Record<string, number>, row: any) => {
      const type = row.type;
      const amount = Number(row.amount) || 0;
      acc[type] = (acc[type] || 0) + amount;
      return acc;
    }, {});

    // Calcular balance por método de pago
    // Sumar incomes, restar expenses, restar withdrawals, sumar adjustments
    const balanceByPaymentMethod: Record<
      string,
      {
        payment_method_id: number | null;
        payment_method_name: string | null;
        incomes: number;
        expenses: number;
        withdrawals: number;
        adjustments: number;
        balance: number;
      }
    > = {};

    (transactions ?? []).forEach((row: any) => {
      const paymentMethodId = row.payment_method_id;
      const key = paymentMethodId?.toString() ?? "null";
      const amount = Number(row.amount) || 0;

      if (!balanceByPaymentMethod[key]) {
        balanceByPaymentMethod[key] = {
          payment_method_id: paymentMethodId,
          payment_method_name: paymentMethodId
            ? paymentMethodsMap.get(paymentMethodId) ?? null
            : null,
          incomes: 0,
          expenses: 0,
          withdrawals: 0,
          adjustments: 0,
          balance: 0,
        };
      }

      switch (row.type) {
        case "income":
          balanceByPaymentMethod[key].incomes += amount;
          break;
        case "expense":
          balanceByPaymentMethod[key].expenses += amount;
          break;
        case "withdrawal":
          balanceByPaymentMethod[key].withdrawals += amount;
          break;
        case "adjustment":
          balanceByPaymentMethod[key].adjustments += amount;
          break;
      }
    });

    // Calcular balance total por método de pago: incomes + adjustments - expenses - withdrawals
    Object.values(balanceByPaymentMethod).forEach((balance) => {
      balance.balance =
        balance.incomes + balance.adjustments - balance.expenses - balance.withdrawals;
    });

    return NextResponse.json({
      summary,
      balanceByPaymentMethod: Object.values(balanceByPaymentMethod),
    });
  } catch (error) {
    console.error("GET /transactions/balance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
