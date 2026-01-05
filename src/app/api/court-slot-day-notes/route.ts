export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    
    if (!dateParam) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const dayNote = await repos.courtSlotDayNotes.findByDate(dateParam);
    
    if (!dayNote) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(dayNote);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /court-slot-day-notes error:", error);
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
    const { date, notes } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const dayNote = await repos.courtSlotDayNotes.upsert({
      slot_date: date,
      notes: notes || null,
    });

    return NextResponse.json(dayNote);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /court-slot-day-notes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

