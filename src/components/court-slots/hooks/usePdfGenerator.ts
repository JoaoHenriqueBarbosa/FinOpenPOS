import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { parseLocalDate } from "@/lib/court-slots-utils";
import type { CourtSlotDTO } from "@/models/dto/court";
import type { CourtSlotDayNoteDTO } from "@/services/court-slot-day-notes.service";

type DayReport = {
  totalSlots: number;
  playedSlots: number;
  notPlayedSlots: number;
  slotsWithUnpaidPlayers: number;
  totalUnpaidPlayers: number;
  unpaidSlots: Array<{
    id: number;
    courtName: string;
    timeRange: string;
    unpaidCount: number;
  }>;
  payments: Array<{
    paymentMethodId: number;
    paymentMethodName: string;
    uses: number;
    totalAmount: number;
  }>;
};

type PlayedByCourtType = Record<string, string[]>;
type UnpaidByCourtType = Record<string, Array<{ courtName: string; timeRange: string; unpaidCount: number }>>;

export function usePdfGenerator() {
  const handleDownloadPdf = (
    selectedDate: string,
    localSlots: CourtSlotDTO[],
    dayReport: DayReport,
    totalRevenue: number,
    playedByCourtType: PlayedByCourtType,
    unpaidByCourtType: UnpaidByCourtType,
    dayNoteData: CourtSlotDayNoteDTO | null,
    dayNotes: string
  ) => {
    if (!localSlots.length) {
      toast.error("No hay turnos para generar el reporte.");
      return;
    }

    const doc = new jsPDF();
    let y = 15;

    const dateLabel = format(parseLocalDate(selectedDate), "dd/MM/yyyy");

    // Título principal
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Reporte de turnos - ${dateLabel}`, 105, y, { align: "center" });
    y += 12;

    // Separador
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

    // 1. RECAUDACIÓN
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Recaudación (sin QR)", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Detalle por medio de pago
    if (!dayReport.payments.length) {
      doc.text("No hay pagos registrados.", 14, y);
      y += 8;
    } else {
      const orderedPayments = [...dayReport.payments].sort(
        (a, b) => b.totalAmount - a.totalAmount
      );

      orderedPayments.forEach((pm) => {
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        const line = `${pm.paymentMethodName} (${pm.uses} jug.) - $${pm.totalAmount.toLocaleString(
          "es-AR"
        )}`;
        doc.text(line, 16, y);
        y += 5;
      });
      y += 3;
    }

    // Total
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
    doc.setDrawColor(150);
    doc.line(14, y, 196, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 14, y);
    doc.text(`$${totalRevenue.toLocaleString("es-AR")}`, 196, y, { align: "right" });
    y += 10;

    // Separador
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

    // 2. FALTAN PAGAR
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("2. Faltan pagar", 14, y);
    y += 8;

    if (dayReport.slotsWithUnpaidPlayers === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("No hay jugadores sin pagar.", 14, y);
      y += 8;
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const printUnpaidGroup = (label: string, items: Array<{ courtName: string; timeRange: string; unpaidCount: number }>) => {
        if (!items.length) return;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(label, 16, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        items.forEach((slot) => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(
            `${slot.courtName} - ${slot.timeRange} (${slot.unpaidCount} jug.)`,
            20,
            y,
            { maxWidth: 170 }
          );
          y += 5;
        });
        y += 2;
      };

      printUnpaidGroup("INDOOR", unpaidByCourtType.INDOOR);
      printUnpaidGroup("OUTDOOR", unpaidByCourtType.OUTDOOR);
      printUnpaidGroup("OTRAS", unpaidByCourtType.OTRAS);

      // Resumen
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.setDrawColor(150);
      doc.line(14, y, 196, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Resumen: ${dayReport.slotsWithUnpaidPlayers} turno(s) con ${dayReport.totalUnpaidPlayers} jugador(es) sin método de pago`,
        14,
        y,
        { maxWidth: 180 }
      );
      y += 8;
    }

    // Separador
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 8;

    // 3. TURNOS JUGADOS
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("3. Turnos jugados", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (dayReport.playedSlots === 0) {
      doc.text("No se jugaron turnos.", 14, y);
      y += 8;
    } else {
      const printGroup = (label: string, items: string[]) => {
        if (!items.length) return;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(label, 16, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(items.join(", "), 20, y, { maxWidth: 170 });
        y += 7;
      };

      printGroup("INDOOR", playedByCourtType.INDOOR);
      printGroup("OUTDOOR", playedByCourtType.OUTDOOR);
      printGroup("OTRAS", playedByCourtType.OTRAS);

      // Resumen
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
      doc.setDrawColor(150);
      doc.line(14, y, 196, y);
      y += 5;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Resumen: ${dayReport.playedSlots} turno(s) jugados`,
        14,
        y
      );
      y += 8;
    }

    // Notas del día
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Notas del día", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const dayNotesText = dayNoteData?.notes || dayNotes || "";
    if (dayNotesText) {
      const lines = doc.splitTextToSize(dayNotesText, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 5;
    } else {
      doc.text("No hay notas para este día.", 14, y);
      y += 8;
    }

    // Nota QR
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      "Nota: Los pagos con QR se consideran prepagos y no se incluyen en la recaudación del día.",
      14,
      y,
      { maxWidth: 180 }
    );

    // Descargar
    doc.save(`reporte-turnos-${selectedDate}.pdf`);
  };

  return { handleDownloadPdf };
}

