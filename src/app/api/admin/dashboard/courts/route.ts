export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createRepositories } from "@/lib/repository-factory";

export async function GET() {
  try {
    const repos = await createRepositories();

    // Obtener fecha de hoy
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Obtener todos los slots de hoy
    const slots = await repos.courtSlots.findByDate(todayStr);

    // Filtrar solo los jugados
    const playedSlots = slots.filter((slot) => slot.was_played);

    // Agrupar por cancha
    const slotsByCourt: Record<string, number> = {};
    let hasUnpaidSlots = false;

    playedSlots.forEach((slot) => {
      const courtName = slot.court?.name || "Sin nombre";
      if (!slotsByCourt[courtName]) {
        slotsByCourt[courtName] = 0;
      }
      slotsByCourt[courtName] += 1;

      // Verificar si hay algún jugador sin método de pago asignado
      if (
        !slot.player1_payment_method_id ||
        !slot.player2_payment_method_id ||
        !slot.player3_payment_method_id ||
        !slot.player4_payment_method_id
      ) {
        hasUnpaidSlots = true;
      }
    });

    return NextResponse.json({
      playedSlotsByCourt: slotsByCourt,
      totalPlayed: playedSlots.length,
      hasUnpaidSlots,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /admin/dashboard/courts error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

