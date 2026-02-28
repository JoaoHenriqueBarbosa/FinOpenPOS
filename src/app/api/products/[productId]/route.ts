import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";

import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const updatedProduct = await request.json();
    const { productId } = await params;

    const data = await db
      .update(products)
      .set({ ...updatedProduct, user_uid: user.id })
      .where(
        and(eq(products.id, Number(productId)), eq(products.user_uid, user.id))
      )
      .returning();

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Product not found or not authorized" },
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
  { params }: { params: Promise<{ productId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await params;

    await db
      .delete(products)
      .where(
        and(eq(products.id, Number(productId)), eq(products.user_uid, user.id))
      );

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
