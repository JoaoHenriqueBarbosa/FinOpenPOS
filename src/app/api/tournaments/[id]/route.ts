export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);
    
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const tournament = await repos.tournaments.findById(id);
    if (!tournament) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(tournament);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments/:id error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const repos = await createRepositories();
    const id = Number(params.id);
    
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    
    // Convertir cadenas vacías a null para fechas opcionales
    const normalizeDate = (date: string | null | undefined): string | null => {
      if (!date || date.trim() === "") return null;
      return date;
    };

    const normalizedBody = {
      ...body,
      start_date: body.start_date !== undefined ? normalizeDate(body.start_date) : undefined,
      end_date: body.end_date !== undefined ? normalizeDate(body.end_date) : undefined,
      registration_deadline: body.registration_deadline !== undefined ? normalizeDate(body.registration_deadline) : undefined,
    };

    const tournament = await repos.tournaments.update(id, normalizedBody);

    return NextResponse.json(tournament);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("PATCH /tournaments/:id error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
