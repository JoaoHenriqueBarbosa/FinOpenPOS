import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth-guard";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await db
      .select()
      .from(transactions)
      .where(eq(transactions.user_uid, user.id));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const newTransaction = await request.json();

    const [data] = await db
      .insert(transactions)
      .values({ ...newTransaction, user_uid: user.id })
      .returning();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
