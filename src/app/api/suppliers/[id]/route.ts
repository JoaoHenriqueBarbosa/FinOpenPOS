// app/api/suppliers/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function PUT(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supplierId = Number(params.id);
  if (Number.isNaN(supplierId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const payload = {
    name: body.name,
    contact_email: body.contact_email ?? null,
    phone: body.phone ?? null,
    notes: body.notes ?? null,
    status: body.status ?? "active",
  };

  const { data, error } = await supabase
    .from("suppliers")
    .update(payload)
    .eq("id", supplierId)
    .eq("user_uid", user.id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Error updating supplier" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supplierId = Number(params.id);
  if (Number.isNaN(supplierId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Soft delete → status = inactive
  const { error } = await supabase
    .from("suppliers")
    .update({ status: "inactive" })
    .eq("id", supplierId)
    .eq("user_uid", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
