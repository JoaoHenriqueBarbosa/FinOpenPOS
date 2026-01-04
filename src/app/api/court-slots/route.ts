export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET(request: Request) {
  try {
    const repos = await createRepositories();
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    
    // Asegurar que la fecha se interprete correctamente en zona horaria local
    let slotDate: string;
    if (dateParam) {
      slotDate = dateParam;
    } else {
      // Crear fecha en zona horaria local, no UTC
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      slotDate = `${year}-${month}-${day}`;
    }

    const slots = await repos.courtSlots.findByDate(slotDate);
    return NextResponse.json(slots);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /court-slots error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
