export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = {
  params: {
    courtId: string;
  };
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const body = await request.json();
    const { rules } = body as {
      rules: Array<{ start_time: string; end_time: string; price_per_player: number }>;
    };

    const courtId = parseInt(params.courtId, 10);
    if (isNaN(courtId)) {
      return NextResponse.json(
        { error: "Invalid court ID" },
        { status: 400 }
      );
    }

    // Validar reglas
    for (const rule of rules) {
      if (!rule.start_time || !rule.end_time || rule.price_per_player < 0) {
        return NextResponse.json(
          { error: "Invalid rule: start_time, end_time, and price_per_player (>= 0) are required" },
          { status: 400 }
        );
      }
    }

    const result = await repos.courtPricing.upsertForCourtId(courtId, rules);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PUT /court-slots/pricing/[courtId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

