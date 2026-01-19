export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  amount: number;
  description: string;
  player_id: number;
  payment_method_id?: number | null;
};

export async function POST(req: Request) {
  try {
    const { amount, description, player_id, payment_method_id } = (await req.json()) as Body;
    if (!description || typeof amount !== "number" || Number.isNaN(amount) || !player_id) {
      return NextResponse.json({ error: "amount, description and player_id required" }, { status: 400 });
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
        type: "withdrawal",
        status: "completed",
        player_id,
        payment_method_id: payment_method_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating withdrawal:", error);
      return NextResponse.json({ error: "Failed to register withdrawal" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /transactions/withdrawal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
