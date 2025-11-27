import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const slotDate = dateParam || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const { data, error } = await supabase
      .from("court_slots")
      .select(
        `
        id,
        user_uid,
        slot_date,
        start_time,
        end_time,
        was_played,
        notes,
        player1_payment_method_id,
        player1_note,
        player2_payment_method_id,
        player2_note,
        player3_payment_method_id,
        player3_note,
        player4_payment_method_id,
        player4_note,
        created_at,
        court:court_id (
          id,
          name
        )
      `
      )
      .eq("user_uid", user.id)
      .eq("slot_date", slotDate)
      .order("start_time", { ascending: true })
      .order("court_id", { ascending: true });

    if (error) {
      console.error("Error fetching court_slots:", error);
      return NextResponse.json(
        { error: "Error fetching court slots" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /court-slots error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
