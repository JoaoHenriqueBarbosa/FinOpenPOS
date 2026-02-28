import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethodId } = await params;
    const { name } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const [data] = await db
      .update(paymentMethods)
      .set({ name: name.trim() })
      .where(eq(paymentMethods.id, parseInt(paymentMethodId)))
      .returning();

    if (!data) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ paymentMethodId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paymentMethodId } = await params;

    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, parseInt(paymentMethodId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
