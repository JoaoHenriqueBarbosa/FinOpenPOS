import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updatedCustomer = await request.json();
    const { customerId } = await params;

    const data = await db
      .update(customers)
      .set({ ...updatedCustomer, user_uid: user.id })
      .where(
        and(
          eq(customers.id, Number(customerId)),
          eq(customers.user_uid, user.id)
        )
      )
      .returning();

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Customer not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { customerId } = await params;

    await db
      .delete(customers)
      .where(
        and(
          eq(customers.id, Number(customerId)),
          eq(customers.user_uid, user.id)
        )
      );

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
