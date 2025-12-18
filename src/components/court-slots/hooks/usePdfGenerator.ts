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

type NotPlayedByCourtType = Record<string, string[]>;
type UnpaidByCourtType = Record<string, Array<{ courtName: string; timeRange: string; unpaidCount: number }>>;

export function usePdfGenerator() {
  const handleDownloadPdf = (
    selectedDate: string,
    localSlots: CourtSlotDTO[],
    dayReport: DayReport,
    totalRevenue: number,
    notPlayedByCourtType: NotPlayedByCourtType,
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

    // Título
    doc.setFontSize(16);
    doc.text(`Reporte de turnos - ${dateLabel}`, 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);

    // Resumen general
    doc.text(`Total de turnos: ${dayReport.totalSlots}`, 14, y);
    y += 6;
    doc.text(`Turnos jugados: ${dayReport.playedSlots}`, 14, y);
    y += 6;
    doc.text(`Turnos no jugados: ${dayReport.notPlayedSlots}`, 14, y);
    y += 6;
    if (dayReport.slotsWithUnpaidPlayers > 0) {
      doc.text(
        `Faltan pagar: ${dayReport.slotsWithUnpaidPlayers} turno(s) con ${dayReport.totalUnpaidPlayers} jugador(es)`,
        14,
        y
      );
      y += 6;
    }
    y += 2;

    // Recaudación
    doc.setFontSize(12);
    doc.text("Recaudación (sin QR)", 14, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(
      `$${totalRevenue.toLocaleString("es-AR")}`,
      14,
      y
    );
    y += 10;

    // Detalle por medio de pago
    doc.setFontSize(12);
    doc.text("Detalle por medio de pago", 14, y);
    y += 6;
    doc.setFontSize(10);

    if (!dayReport.payments.length) {
      doc.text("No hay pagos registrados.", 14, y);
      y += 8;
    } else {
      const orderedPayments = [...dayReport.payments].sort(
        (a, b) => b.totalAmount - a.totalAmount
      );

      orderedPayments.forEach((pm) => {
        const line = `${pm.paymentMethodName} - ${pm.uses} jug. - $${pm.totalAmount.toLocaleString(
          "es-AR"
        )}`;
        doc.text(line, 14, y);
        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
      });
      y += 5;
    }

    // Turnos no jugados agrupados
    doc.setFontSize(12);
    doc.text("Turnos no jugados", 14, y);
    y += 6;
    doc.setFontSize(10);

    if (dayReport.notPlayedSlots === 0) {
      doc.text("Todos los turnos se jugaron.", 14, y);
      y += 8;
    } else {
      doc.text(
        `${dayReport.notPlayedSlots} turno(s) sin jugar`,
        14,
        y
      );
      y += 6;

      const printGroup = (label: string, items: string[]) => {
        if (!items.length) return;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.text(label, 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(items.join(", "), 16, y, { maxWidth: 180 });
        y += 7;
      };

      printGroup("INDOOR", notPlayedByCourtType.INDOOR);
      printGroup("OUTDOOR", notPlayedByCourtType.OUTDOOR);
      printGroup("OTRAS", notPlayedByCourtType.OTRAS);
    }

    // Faltan pagar
    if (dayReport.slotsWithUnpaidPlayers > 0) {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Faltan pagar", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${dayReport.slotsWithUnpaidPlayers} turno(s) con ${dayReport.totalUnpaidPlayers} jugador(es) sin método de pago asignado`,
        14,
        y
      );
      y += 6;

      const printUnpaidGroup = (label: string, items: Array<{ courtName: string; timeRange: string; unpaidCount: number }>) => {
        if (!items.length) return;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.setFont("helvetica", "bold");
        doc.text(label, 14, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        items.forEach((slot) => {
          if (y > 280) {
            doc.addPage();
            y = 15;
          }
          doc.text(
            `${slot.courtName} - ${slot.timeRange} (${slot.unpaidCount} jug.)`,
            16,
            y,
            { maxWidth: 180 }
          );
          y += 5;
        });
        y += 2;
      };

      printUnpaidGroup("INDOOR", unpaidByCourtType.INDOOR);
      printUnpaidGroup("OUTDOOR", unpaidByCourtType.OUTDOOR);
      printUnpaidGroup("OTRAS", unpaidByCourtType.OTRAS);
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

