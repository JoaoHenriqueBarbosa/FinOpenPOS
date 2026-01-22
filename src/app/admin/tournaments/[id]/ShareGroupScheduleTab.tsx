"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CopyIcon } from "lucide-react";
import { formatDate, formatTime } from "@/lib/date-utils";
import type { TournamentDTO, GroupsApiResponse, MatchDTO } from "@/models/dto/tournament";
import { tournamentsService, advertisementsService, fallbackAdvertisements, type AdvertisementDTO } from "@/services";
import { useRef } from "react";
import { toast } from "sonner";
import type { CourtDTO } from "@/models/dto/court";
import { Logo } from "@/components/Logo";

async function fetchTournamentGroups(tournamentId: number): Promise<GroupsApiResponse> {
  return tournamentsService.getGroups(tournamentId);
}

function teamLabel(team: MatchDTO["team1"], matchOrder?: number | null, isTeam1?: boolean): string {
  if (!team) {
    // Para grupos de 4, mostrar labels descriptivos según el match_order
    // Verificar que matchOrder sea exactamente 3 o 4 (no undefined ni null)
    if (matchOrder === 3) {
      // Partido 3: GANADOR partido 1 vs GANADOR partido 2
      return isTeam1 ? "GANADOR 1" : "GANADOR 2";
    } else if (matchOrder === 4) {
      // Partido 4: PERDEDOR partido 1 vs PERDEDOR partido 2
      return isTeam1 ? "PERDEDOR 1" : "PERDEDOR 2";
    }
    return "TBD";
  }
  if (team.display_name) return team.display_name;
  const p1 = team.player1?.last_name || "";
  const p2 = team.player2?.last_name || "";
  return `${p1} / ${p2}`;
}

// Función para obtener el día de la semana en español
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const days = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
  return days[date.getDay()];
}

// Función para obtener el color del grupo basado en su nombre
function getGroupColor(groupName: string, allGroups: Array<{ id: number; name: string }>): {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
} {
  // Encontrar el índice del grupo en la lista ordenada
  const sortedGroups = [...allGroups].sort((a, b) => a.name.localeCompare(b.name));
  const groupIndex = sortedGroups.findIndex(g => g.name === groupName);
  
  const colorSchemes = [
    // Azules
    { bg: "bg-blue-50", border: "border-blue-500", badgeBg: "bg-blue-100", badgeText: "text-blue-800" },
    // Verdes
    { bg: "bg-green-50", border: "border-green-500", badgeBg: "bg-green-100", badgeText: "text-green-800" },
    // Amarillos
    { bg: "bg-amber-50", border: "border-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
    // Naranjas
    { bg: "bg-orange-50", border: "border-orange-500", badgeBg: "bg-orange-100", badgeText: "text-orange-800" },
    // Púrpuras
    { bg: "bg-purple-50", border: "border-purple-500", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
    // Rosas
    { bg: "bg-pink-50", border: "border-pink-500", badgeBg: "bg-pink-100", badgeText: "text-pink-800" },
    // Cyan
    { bg: "bg-cyan-50", border: "border-cyan-500", badgeBg: "bg-cyan-100", badgeText: "text-cyan-800" },
    // Indigo
    { bg: "bg-indigo-50", border: "border-indigo-500", badgeBg: "bg-indigo-100", badgeText: "text-indigo-800" },
  ];
  
  return colorSchemes[groupIndex % colorSchemes.length] || colorSchemes[0];
}

interface MatchByDate {
  date: string;
  matches: Array<{
    match: MatchDTO;
    groupName: string;
    courtName: string | null;
  }>;
}

export default function ShareGroupScheduleTab({
  tournament,
}: {
  tournament: Pick<TournamentDTO, "id" | "name" | "category">;
}) {
  const scheduleRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: ["tournament-groups", tournament.id],
    queryFn: () => fetchTournamentGroups(tournament.id),
    staleTime: 1000 * 30,
  });

  const { data: advertisements = [] } = useQuery<AdvertisementDTO[]>({
    queryKey: ["advertisements"],
    queryFn: () => advertisementsService.getAll(),
    staleTime: 1000 * 60 * 5,
  });
  const adsToShow = advertisements.length > 0 ? advertisements : fallbackAdvertisements;

  // Obtener canchas para mostrar nombres
  const { data: courts = [] } = useQuery<CourtDTO[]>({
    queryKey: ["courts"],
    queryFn: async () => {
      const response = await fetch("/api/courts?onlyActive=true");
      if (!response.ok) throw new Error("Failed to fetch courts");
      return response.json();
    },
  });

  const courtMap = new Map<number, string>();
  courts.forEach((court) => {
    courtMap.set(court.id, court.name);
  });

  // Organizar partidos por fecha y hora
  const matchesByDate = (() => {
    if (!data || !data.matches || !data.groups) return [];

    // Crear mapa de grupos
    const groupsMap = new Map(data.groups.map(g => [g.id, g.name]));

    // Filtrar solo partidos de zona con fecha y hora
    const scheduledMatches = data.matches.filter(
      (m) => m.phase === "group" && m.match_date && m.start_time
    );

    // Agrupar por fecha
    const grouped: Map<string, MatchByDate["matches"]> = new Map();

    scheduledMatches.forEach((match) => {
      if (!match.match_date) return;

      const groupName = match.tournament_group_id
        ? groupsMap.get(match.tournament_group_id) || "Sin zona"
        : "Sin zona";

      const courtName = match.court_id ? courtMap.get(match.court_id) || null : null;

      if (!grouped.has(match.match_date)) {
        grouped.set(match.match_date, []);
      }

      grouped.get(match.match_date)!.push({
        match,
        groupName,
        courtName,
      });
    });

    // Convertir a array y ordenar por fecha
    const result: MatchByDate[] = Array.from(grouped.entries())
      .map(([date, matches]) => ({
        date,
        matches: matches.sort((a, b) => {
          // Ordenar por hora de inicio
          const timeA = a.match.start_time || "";
          const timeB = b.match.start_time || "";
          return timeA.localeCompare(timeB);
        }),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  })();

  const handleCopyImageToClipboard = async (date: string) => {
    const dayRef = scheduleRefs.current.get(date);
    if (!dayRef) {
      toast.error("Error al copiar la imagen");
      return;
    }

    try {
      const domtoimage = await import("dom-to-image");
      const toPng = domtoimage.default?.toPng || (domtoimage as any).toPng;
      
      if (!toPng) {
        throw new Error("dom-to-image no está disponible");
      }
      
      // Scroll al elemento para asegurar que esté visible
      dayRef.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Asegurar que todas las imágenes estén cargadas antes de capturar
      const images = dayRef.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // Timeout después de 5 segundos
            setTimeout(resolve, 5000);
          });
        })
      );

      // Obtener dimensiones reales del elemento
      const elementWidth = dayRef.offsetWidth;
      const elementHeight = dayRef.scrollHeight;
      
      // Generar la imagen usando html-to-image con un ancho ligeramente mayor para evitar cortes
      const dataUrl = await toPng(dayRef, {
        quality: 1.0,
        width: elementWidth + 20, // Agregar un poco de margen para evitar cortes
        height: elementHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node: Node) => {
          // Excluir el botón de copiar si existe
          if (node instanceof HTMLElement) {
            return !node.closest('button') || !node.textContent?.includes('Copiar');
          }
          return true;
        },
      });

      // Convertir data URL a blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Copiar al portapapeles
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);

      toast.success("Imagen copiada al portapapeles");
    } catch (error) {
      console.error("Error copying image to clipboard:", error);
      toast.error("Error al copiar la imagen al portapapeles");
    }
  };


  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (matchesByDate.length === 0) {
    return (
      <Card className="border-none shadow-none p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Compartir horarios de zona</CardTitle>
          <CardDescription>
            No hay partidos de zona programados todavía.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card
      className="border-none shadow-none p-0 bg-gradient-to-b from-slate-50/80 to-slate-100/80 dark:from-slate-900/70 dark:to-slate-900/95"
      style={{ overflow: "visible" }}
    >
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compartir horarios de zona</CardTitle>
            <CardDescription>
              Compartí los horarios de los partidos de zona en redes sociales
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className="px-0 pt-4"
        style={{ overflow: "visible", maxHeight: "none" }}
      >
        <div className="space-y-6" style={{ overflow: "visible", maxHeight: "none" }}>
          {matchesByDate.map(({ date, matches }) => (
            <div key={date} className="max-w-2xl mx-auto">
              {/* Botón de copiar fuera del área capturable */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyImageToClipboard(date)}
                  className="h-8"
                >
                  <CopyIcon className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              
              {/* Contenedor capturable */}
              <div
                data-date={date}
                ref={(el) => {
                  if (el) scheduleRefs.current.set(date, el);
                }}
                className="bg-white/80 dark:bg-slate-900/60 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/80 backdrop-blur"
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  overflow: "visible",
                  maxHeight: "none",
                  height: "auto",
                  display: "block",
                  minHeight: "auto",
                }}
              >
                {/* Header */}
                <div className="mb-4 pb-3 border-b-2 border-gray-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 text-center">
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {tournament.name}
                      </h1>
                      {tournament.category && (
                        <p className="text-base text-gray-600">{tournament.category}</p>
                      )}
                      <p className="text-lg font-semibold text-gray-800 mt-1">
                        📅 HORARIOS DE ZONA
                      </p>
                      <p className="text-base font-bold text-gray-700 mt-2">
                        {getDayOfWeek(date).toUpperCase()} - {formatDate(date)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Logo className="h-28" />
                    </div>
                  </div>
                </div>

              {/* Schedule for this day */}
              <div className="space-y-2">
                {matches.map(({ match, groupName, courtName }) => {
                  const time = match.start_time ? formatTime(match.start_time) : "";
                  const team1 = teamLabel(match.team1, match.match_order, true);
                  const team2 = teamLabel(match.team2, match.match_order, false);
                  const groupColor = data?.groups ? getGroupColor(groupName, data.groups) : {
                    bg: "bg-gray-50",
                    border: "border-gray-500",
                    badgeBg: "bg-gray-100",
                    badgeText: "text-gray-800"
                  };

                  return (
                    <div
                      key={match.id}
                      className={`${groupColor.bg} rounded-lg border-l-4 ${groupColor.border} flex items-center gap-3 w-full`}
                      style={{ 
                        minHeight: "64px",
                        padding: "14px 16px",
                        boxSizing: "border-box",
                        alignItems: "center",
                        lineHeight: "1.5",
                        overflow: "visible"
                      }}
                    >
                      <span className="text-base font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
                        🕐 {time}
                      </span>
                      <span className={`px-2 py-1.5 ${groupColor.badgeBg} ${groupColor.badgeText} rounded text-xs font-semibold whitespace-nowrap flex-shrink-0`}>
                        {groupName}
                      </span>
                      {courtName && (
                        <span className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded text-xs whitespace-nowrap flex-shrink-0">
                          {courtName}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-gray-800 flex-1 min-w-0 overflow-visible">
                        <span className="font-semibold whitespace-nowrap">{team1}</span>
                        <span className="text-gray-500 flex-shrink-0">vs</span>
                        <span className="font-semibold whitespace-nowrap">{team2}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {adsToShow.map((ad: AdvertisementDTO) => (
                  <div
                    key={ad.id}
                    className="w-32 h-20 border rounded-lg overflow-hidden bg-white/80 dark:bg-slate-900/60 flex items-center justify-center p-2 shadow-xl shadow-black/20 border-white/40"
                  >
                    {ad.target_url && ad.target_url.startsWith("http") ? (
                      <a
                        href={ad.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full h-full flex items-center justify-center"
                        title={ad.name}
                      >
                        <img src={ad.image_url} alt={ad.name} className="max-w-full max-h-full object-contain" />
                      </a>
                    ) : (
                      <img src={ad.image_url} alt={ad.name} className="max-w-full max-h-full object-contain" />
                    )}
                  </div>
                ))}
              </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

