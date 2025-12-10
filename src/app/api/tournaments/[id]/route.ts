import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .eq("user_uid", user.id)
    .single();

  if (error || !data) {
    console.error("GET /tournaments/:id error:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("tournaments")
    .update(body)
    .eq("id", id)
    .eq("user_uid", user.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("PATCH /tournaments/:id error:", error);
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
