import { db } from "@/lib/db";
import { paymentMethods } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await db
      .select({ id: paymentMethods.id, name: paymentMethods.name })
      .from(paymentMethods);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}
