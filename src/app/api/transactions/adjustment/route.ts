export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  amount: number;
  description: string;
  payment_method_id?: number | null;
  order_id?: number | null;
  player_id?: number | null;
};

export async function POST(req: Request) {
  try {
    const { amount, description, payment_method_id, order_id, player_id } = (await req.json()) as Body;
    if (!description || typeof amount !== "number" || Number.isNaN(amount)) {
      return NextResponse.json({ error: "amount and description required" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_uid: user.id,
        amount,
        description,
        type: "adjustment",
        status: "completed",
        payment_method_id: payment_method_id ?? null,
        order_id: order_id ?? null,
        player_id: player_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating adjustment:", error);
      return NextResponse.json({ error: "Failed to register adjustment" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /transactions/adjustment error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
