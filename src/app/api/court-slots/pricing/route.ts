import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET() {
  try {
    const repos = await createRepositories();
    const pricing = await repos.courtPricing.findAll();
    return NextResponse.json(pricing);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /court-slots/pricing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

