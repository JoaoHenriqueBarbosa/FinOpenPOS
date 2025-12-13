import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("user_uid", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, category, start_date, end_date, has_super_tiebreak, match_duration } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      user_uid: user.id,
      name: name.trim(),
      description: description ?? null,
      category: category ?? null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      has_super_tiebreak: has_super_tiebreak ?? false,
      match_duration: match_duration ?? 60,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    console.error("POST /tournaments error:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
