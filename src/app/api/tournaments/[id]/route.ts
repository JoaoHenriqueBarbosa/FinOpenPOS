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
    const tournament = await repos.tournaments.update(id, body);

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
