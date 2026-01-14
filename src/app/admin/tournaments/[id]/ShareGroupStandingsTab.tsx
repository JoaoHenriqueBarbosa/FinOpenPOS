"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CopyIcon } from "lucide-react";
import { formatDate, formatTime, getDayOfWeek } from "@/lib/date-utils";
import { parseLocalDate } from "@/lib/court-slots-utils";
import type { TournamentDTO, ApiResponseStandings } from "@/models/dto/tournament";
import type { CourtDTO } from "@/models/dto/court";
import { tournamentsService } from "@/services";
import { useRef } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";

async function fetchTournamentStandings(tournamentId: number): Promise<ApiResponseStandings> {
  return tournamentsService.getStandings(tournamentId);
}

function teamLabelShort(team: { display_name?: string | null; player1?: { last_name?: string | null } | null; player2?: { last_name?: string | null } | null } | null | undefined): string {
  if (!team) return "—";
  if (team.display_name) return team.display_name;
  const lastName1 = team.player1?.last_name ?? "";
  const lastName2 = team.player2?.last_name ?? "";
  if (!lastName1 && !lastName2) return "—";
  return [lastName1, lastName2].filter(Boolean).join(" / ");
}

function teamLabel(team: { display_name?: string | null; player1?: { last_name?: string | null } | null; player2?: { last_name?: string | null } | null } | null | undefined, matchOrder?: number | null, isTeam1?: boolean): string {
  if (!team) {
    if (matchOrder === 3) {
      return isTeam1 ? "GANADOR 1" : "GANADOR 2";
    } else if (matchOrder === 4) {
      return isTeam1 ? "PERDEDOR 1" : "PERDEDOR 2";
    }
    return "—";
  }
  return teamLabelShort(team);
}

// Función para obtener el color del grupo
function getGroupColor(groupIndex: number): { bg: string; text: string; border: string; badgeBg: string; badgeText: string } {
  const colorSchemes = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-500", badgeBg: "bg-blue-100", badgeText: "text-blue-800" },
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-500", badgeBg: "bg-green-100", badgeText: "text-green-800" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-500", badgeBg: "bg-orange-100", badgeText: "text-orange-800" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-500", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-500", badgeBg: "bg-pink-100", badgeText: "text-pink-800" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-500", badgeBg: "bg-cyan-100", badgeText: "text-cyan-800" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-500", badgeBg: "bg-indigo-100", badgeText: "text-indigo-800" },
  ];
  return colorSchemes[groupIndex % colorSchemes.length] || colorSchemes[0];
}

export default function ShareGroupStandingsTab({ tournament }: { tournament: Pick<TournamentDTO, "id" | "name" | "category"> }) {
  const groupRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: ["tournament-standings", tournament.id],
    queryFn: () => fetchTournamentStandings(tournament.id),
    staleTime: 1000 * 30,
  });

  // Obtener canchas para mostrar nombres
  const { data: courts = [] } = useQuery<CourtDTO[]>({
    queryKey: ["courts"],
    queryFn: async () => {
      const response = await fetch("/api/courts?onlyActive=true");
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const courtMap = new Map<number, string>();
  courts.forEach((court) => {
    courtMap.set(court.id, court.name);
  });

  const handleCopyImageToClipboard = async (groupId: number) => {
    const groupRef = groupRefs.current.get(groupId);
    if (!groupRef) {
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
      groupRef.scrollIntoView({ behavior: "smooth", block: "center" });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Asegurar que todas las imágenes estén cargadas antes de capturar
      const images = groupRef.querySelectorAll('img');
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
      const elementWidth = groupRef.offsetWidth;
      const elementHeight = groupRef.scrollHeight;
      
      // Generar la imagen usando dom-to-image con un ancho ligeramente mayor para evitar cortes
      const dataUrl = await toPng(groupRef, {
        quality: 1.0,
        width: elementWidth + 20,
        height: elementHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
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

  if (!data || data.groups.length === 0) {
    return (
      <Card className="border-none shadow-none p-0">
        <CardContent className="px-0 pt-0">
          <div className="text-center py-8 text-muted-foreground">
            No hay zonas generadas todavía.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ordenar grupos por group_order
  const sortedGroups = [...data.groups].sort((a, b) => {
    if (a.group_order !== undefined && b.group_order !== undefined) {
      return a.group_order - b.group_order;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="border-none shadow-none p-0">
      <CardContent className="px-0 pt-0">
        <div className="space-y-6" style={{ overflow: "visible", maxHeight: "none" }}>
          {sortedGroups.map((group, groupIndex) => {
                const groupStandings = data.standings
                  .filter((s) => s.tournament_group_id === group.id)
                  .sort((a, b) => {
                    if (a.position !== null && b.position !== null) {
                      return a.position - b.position;
                    }
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    const aSetDiff = a.sets_won - a.sets_lost;
                    const bSetDiff = b.sets_won - b.sets_lost;
                    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff;
                    const aGameDiff = a.games_won - a.games_lost;
                    const bGameDiff = b.games_won - b.games_lost;
                    return bGameDiff - aGameDiff;
                  });

                // Obtener equipos del grupo para mostrar cuando no hay standings
                const groupTeams = (data.groupTeams || [])
                  .filter((gt) => gt.tournament_group_id === group.id)
                  .map((gt) => gt.team)
                  .filter((team): team is NonNullable<typeof team> => team !== null);

                // Si no hay standings pero hay equipos, crear standings vacíos
                const displayStandings = groupStandings.length > 0 
                  ? groupStandings 
                  : groupTeams.map((team, index) => ({
                      id: team.id,
                      tournament_group_id: group.id,
                      team_id: team.id,
                      position: index + 1,
                      matches_played: 0,
                      wins: 0,
                      losses: 0,
                      sets_won: 0,
                      sets_lost: 0,
                      games_won: 0,
                      games_lost: 0,
                      team: team,
                    }));

                const groupMatches = data.matches
                  .filter((m) => m.tournament_group_id === group.id)
                  .sort((a, b) => {
                    if (a.match_date && b.match_date) {
                      const dateCompare = a.match_date.localeCompare(b.match_date);
                      if (dateCompare !== 0) return dateCompare;
                    }
                    if (a.start_time && b.start_time) {
                      return a.start_time.localeCompare(b.start_time);
                    }
                    return 0;
                  });

                const groupColor = getGroupColor(groupIndex);

                return (
                  <div key={group.id} className="max-w-2xl mx-auto">
                    {/* Botón de copiar fuera del área capturable */}
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyImageToClipboard(group.id)}
                        className="h-8"
                      >
                        <CopyIcon className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    
                    {/* Contenedor capturable */}
                    <div
                      ref={(el) => {
                        if (el) groupRefs.current.set(group.id, el);
                      }}
                      className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-lg"
                      style={{ 
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        overflow: "visible",
                        maxHeight: "none",
                        height: "auto",
                        display: "block",
                        minHeight: "auto"
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
                              📊 TABLA DE POSICIONES Y RESULTADOS
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <Logo className="h-20" />
                          </div>
                        </div>
                      </div>

                      {/* Título del grupo */}
                      <div className={`${groupColor.bg} ${groupColor.border} border-2 rounded-lg px-3 py-2 mb-3`}>
                        <h3 className={`font-bold text-base ${groupColor.text}`}>
                          {group.name}
                        </h3>
                      </div>

                    {/* Tabla de posiciones */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className={`${groupColor.bg} px-3 py-1.5 border-b`}>
                        <h4 className={`font-semibold text-xs ${groupColor.text}`}>
                          Tabla de posiciones
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1.5 text-center border-b font-semibold">#</th>
                              <th className="px-2 py-1.5 text-left border-b font-semibold">Equipo</th>
                              <th className="px-2 py-1.5 text-center border-b font-semibold">PJ</th>
                              <th className="px-2 py-1.5 text-center border-b font-semibold">G</th>
                              <th className="px-2 py-1.5 text-center border-b font-semibold">P</th>
                              <th className="px-2 py-1.5 text-center border-b font-semibold">Sets</th>
                              <th className="px-2 py-1.5 text-center border-b font-semibold">Games</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayStandings.length > 0 ? (
                              displayStandings.map((standing) => (
                                <tr key={standing.id} className="border-b">
                                  <td className="px-2 py-1.5 text-center font-semibold">
                                    {standing.position ?? "—"}
                                  </td>
                                  <td className="px-2 py-1.5 font-medium">
                                    {teamLabelShort(standing.team)}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {standing.matches_played}
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-green-600 font-semibold">
                                    {standing.wins}
                                  </td>
                                  <td className="px-2 py-1.5 text-center text-red-600 font-semibold">
                                    {standing.losses}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {(() => {
                                      const diff = standing.sets_won - standing.sets_lost;
                                      return diff > 0 ? `+${diff}` : diff.toString();
                                    })()}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {(() => {
                                      const diff = standing.games_won - standing.games_lost;
                                      return diff > 0 ? `+${diff}` : diff.toString();
                                    })()}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="px-2 py-2 text-center text-gray-500">
                                  Sin datos
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Resultados */}
                    {groupMatches.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className={`${groupColor.bg} px-3 py-1.5 border-b`}>
                          <h4 className={`font-semibold text-xs ${groupColor.text}`}>
                            Resultados
                          </h4>
                        </div>
                        <div className="divide-y">
                          {groupMatches.map((match) => {
                            const hasResult =
                              match.set1_team1_games !== null &&
                              match.set1_team2_games !== null;

                            return (
                              <div
                                key={match.id}
                                className="p-2 text-xs"
                                style={{ 
                                  minHeight: "48px",
                                  padding: "10px 12px",
                                  boxSizing: "border-box",
                                  lineHeight: "1.4"
                                }}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  {match.match_date && match.start_time && (
                                    <span className="text-gray-600 font-medium">
                                      {(() => {
                                        const date = parseLocalDate(match.match_date);
                                        const dayName = getDayOfWeek(match.match_date);
                                        const courtName = match.court_id ? courtMap.get(match.court_id) : null;
                                        const courtText = courtName ? ` - ${courtName}` : "";
                                        return `${dayName} ${formatDate(match.match_date)} ${formatTime(match.start_time)}${courtText}`;
                                      })()}
                                    </span>
                                  )}
                                  {match.status === "finished" && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700">
                                      Finalizado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 font-semibold">
                                    {teamLabel(match.team1, match.match_order, true)}
                                  </div>
                                  {hasResult ? (
                                    <div className="flex items-center gap-1 text-xs font-semibold">
                                      <span>
                                        {match.set1_team1_games}-{match.set1_team2_games}
                                      </span>
                                      <span className="text-gray-400">|</span>
                                      <span>
                                        {match.set2_team1_games}-{match.set2_team2_games}
                                      </span>
                                      {match.set3_team1_games !== null &&
                                        match.set3_team2_games !== null && (
                                          <>
                                            <span className="text-gray-400">|</span>
                                            <span>
                                              {match.set3_team1_games}-{match.set3_team2_games}
                                            </span>
                                          </>
                                        )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">vs</span>
                                  )}
                                  <div className="flex-1 text-right font-semibold">
                                    {teamLabel(match.team2, match.match_order, false)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                );
              })}
        </div>
      </CardContent>
    </Card>
  );
}

