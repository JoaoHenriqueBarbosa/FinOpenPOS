export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const repos = await createRepositories();
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // 1. Cuentas abiertas: cantidad y monto total
    const openOrders = await repos.orders.findAll("open");
    const openOrdersCount = openOrders.length;
    const openOrdersTotal = openOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

    // 2. Ventas del día: monto total diferenciado por tipo de pago
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data: todayTransactions, error: txError } = await supabase
      .from("transactions")
      .select(`
        amount,
        payment_method_id,
        payment_method:payment_method_id (
          id,
          name
        )
      `)
      .eq("type", "income")
      .eq("status", "completed")
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", todayEnd.toISOString())
      .not("order_id", "is", null);

    if (txError) {
      console.error("Error fetching today transactions:", txError);
      return NextResponse.json(
        { error: "Error fetching today transactions" },
        { status: 500 }
      );
    }

    // Agrupar por método de pago
    const salesByPaymentMethod: Record<string, number> = {};
    let totalTodaySales = 0;

    (todayTransactions || []).forEach((tx: any) => {
      const amount = Number(tx.amount);
      totalTodaySales += amount;
      
      const paymentMethodName = tx.payment_method?.name || "Sin método";
      if (!salesByPaymentMethod[paymentMethodName]) {
        salesByPaymentMethod[paymentMethodName] = 0;
      }
      salesByPaymentMethod[paymentMethodName] += amount;
    });

    return NextResponse.json({
      openOrders: {
        count: openOrdersCount,
        totalAmount: openOrdersTotal,
      },
      todaySales: {
        total: totalTodaySales,
        byPaymentMethod: salesByPaymentMethod,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /admin/dashboard/sales error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

