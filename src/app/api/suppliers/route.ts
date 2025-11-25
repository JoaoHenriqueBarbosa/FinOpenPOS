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
    .from("suppliers")
    .select("id, name, status")
    .eq("user_uid", user.id)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
  const name = (body.name ?? "").trim();
  const contact_email = body.contact_email ?? null;
  const phone = body.phone ?? null;
  const notes = body.notes ?? null;

  if (!name) {
    return NextResponse.json(
      { error: "Supplier name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name,
      contact_email,
      phone,
      notes,
      user_uid: user.id,
    })
    .select("id, name, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
