export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET() {
  try {
    const repos = await createRepositories();
    const tournaments = await repos.tournaments.findAll();
    return NextResponse.json(tournaments);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const body = await request.json();
    const { name, description, category, start_date, end_date, has_super_tiebreak, match_duration } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Convertir cadenas vacías a null para fechas opcionales
    const normalizeDate = (date: string | null | undefined): string | null => {
      if (!date || date.trim() === "") return null;
      return date;
    };

    const tournament = await repos.tournaments.create({
      name: name.trim(),
      description: description ?? null,
      category: category ?? null,
      start_date: normalizeDate(start_date),
      end_date: normalizeDate(end_date),
      has_super_tiebreak: has_super_tiebreak ?? false,
      match_duration: match_duration ?? 60,
    });

    return NextResponse.json(tournament);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /tournaments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
