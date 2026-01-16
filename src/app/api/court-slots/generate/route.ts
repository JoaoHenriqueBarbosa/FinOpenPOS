export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

type GenerateBody = {
  date?: string; // YYYY-MM-DD
};

export async function POST(request: Request) {
  try {
    const repos = await createRepositories();
    const body = (await request.json()) as GenerateBody;
    
    // Asegurar que la fecha se interprete correctamente en zona horaria local
    let slotDate: string;
    if (body.date) {
      slotDate = body.date;
    } else {
      // Crear fecha en zona horaria local, no UTC
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      slotDate = `${year}-${month}-${day}`;
    }

    // Get active courts
    const courts = await repos.courts.findAll(true);
    if (courts.length === 0) {
      return NextResponse.json(
        { error: "No active courts found" },
        { status: 400 }
      );
    }

    // Generate slots (incluye el slot adicional de 23:30 a 01:00 si endHour es 01:00)
    const slots = await repos.courtSlots.generateSlotsForDate(
      slotDate,
      {
        startHour: "10:00",
        endHour: "01:00",
        durationMinutes: 90,
      },
      courts.map((c) => c.id)
    );

    return NextResponse.json(slots);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("POST /court-slots/generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
