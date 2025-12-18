"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2Icon } from "lucide-react";
import { formatDate, formatTime } from "@/lib/date-utils";

import type {
  GroupDTO,
  StandingDTO,
  GroupTeamDTO,
  GroupsApiResponse,
  TeamDTO,
  TournamentDTO,
  ApiResponseStandings,
} from "@/models/dto/tournament";
import { tournamentsService } from "@/services";

function teamLabel(team: TeamDTO | null | undefined): string {
  if (!team) return "—";
  if (team.display_name) return team.display_name;
  const p1 = team.player1
    ? `${team.player1.first_name} ${team.player1.last_name}`
    : "";
  const p2 = team.player2
    ? `${team.player2.first_name} ${team.player2.last_name}`
    : "";
  return [p1, p2].filter(Boolean).join(" / ");
}

function teamLabelShort(team: TeamDTO | null | undefined): string {
  if (!team) return "—";
  if (team.display_name) return team.display_name;
  const lastName1 = team.player1?.last_name ?? "";
  const lastName2 = team.player2?.last_name ?? "";
  if (!lastName1 && !lastName2) return "—";
  return [lastName1, lastName2].filter(Boolean).join(" / ");
}

// Función para obtener el color del grupo
function getGroupColor(groupIndex: number): { bg: string; text: string; border: string } {
  const colorSchemes = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  ];
  return colorSchemes[groupIndex % colorSchemes.length] || colorSchemes[0];
}

// Fetch function para React Query
async function fetchTournamentStandings(tournamentId: number): Promise<ApiResponseStandings> {
  return tournamentsService.getStandings(tournamentId);
}

export default function StandingsTab({ tournament }: { tournament: Pick<TournamentDTO, "id"> }) {
  // React Query para cache compartido
  const {
    data,
    isLoading: loading,
  } = useQuery({
    queryKey: ["tournament-standings", tournament.id],
    queryFn: () => fetchTournamentStandings(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

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
        <CardHeader className="px-0 pt-0">
          <CardTitle>Tabla de posiciones</CardTitle>
          <CardDescription>
            No hay zonas generadas todavía. Cerrá la inscripción en la pestaña
            Equipos para que se creen automáticamente.
          </CardDescription>
        </CardHeader>
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
      <CardHeader className="px-0 pt-0">
        <CardTitle>Tabla de posiciones</CardTitle>
        <CardDescription>
          Visualizá las posiciones de cada zona y los resultados de los partidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4 space-y-6">
        {sortedGroups.map((group, groupIndex) => {
          const groupStandings = data.standings
            .filter((s) => s.tournament_group_id === group.id)
            .sort((a, b) => {
              // Ordenar por posición si está disponible, sino por partidos ganados, luego diferencia de sets, luego diferencia de games
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
            <div key={group.id} className="space-y-4">
              {/* Título del grupo */}
              <div
                className={`${groupColor.bg} ${groupColor.border} border-2 rounded-lg px-4 py-2`}
              >
                <h3 className={`font-bold text-lg ${groupColor.text}`}>
                  {group.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabla de posiciones */}
                <div className="border rounded-lg overflow-hidden">
                  <div className={`${groupColor.bg} px-4 py-2 border-b`}>
                    <h4 className={`font-semibold text-sm ${groupColor.text}`}>
                      Tabla de posiciones
                    </h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8 text-center">#</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead className="text-center">PJ</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">Sets</TableHead>
                        <TableHead className="text-center">Games</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Si hay standings, mostrarlos
                        if (groupStandings.length > 0) {
                          return groupStandings.map((standing) => (
                            <TableRow key={standing.id}>
                              <TableCell className="text-center font-semibold">
                                {standing.position ?? "—"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {teamLabelShort(standing.team)}
                              </TableCell>
                              <TableCell className="text-center">
                                {standing.matches_played}
                              </TableCell>
                              <TableCell className="text-center text-green-600 font-semibold">
                                {standing.wins}
                              </TableCell>
                              <TableCell className="text-center text-red-600 font-semibold">
                                {standing.losses}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {(() => {
                                  const diff = standing.sets_won - standing.sets_lost;
                                  return diff > 0 ? `+${diff}` : diff.toString();
                                })()}
                              </TableCell>
                              <TableCell className="text-center text-xs">
                                {(() => {
                                  const diff = standing.games_won - standing.games_lost;
                                  return diff > 0 ? `+${diff}` : diff.toString();
                                })()}
                              </TableCell>
                            </TableRow>
                          ));
                        } else {
                          // Si no hay standings, mostrar equipos ordenados por seed
                          const groupTeams = (data.groupTeams || []).filter(
                            (gt) => gt.tournament_group_id === group.id
                          );
                          
                          if (groupTeams.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                  No hay equipos en este grupo
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          return groupTeams
                            .sort((a, b) => {
                              const seedA = a.team?.seed_number ?? 999;
                              const seedB = b.team?.seed_number ?? 999;
                              return seedA - seedB;
                            })
                            .map((gt, index) => (
                              <TableRow key={gt.id}>
                                <TableCell className="text-center font-semibold">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {gt.team ? teamLabelShort(gt.team) : "—"}
                                </TableCell>
                                <TableCell className="text-center">-</TableCell>
                                <TableCell className="text-center">-</TableCell>
                                <TableCell className="text-center">-</TableCell>
                                <TableCell className="text-center">-</TableCell>
                                <TableCell className="text-center">-</TableCell>
                              </TableRow>
                            ));
                        }
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Resultados de partidos */}
                <div className="border rounded-lg overflow-hidden">
                  <div className={`${groupColor.bg} px-4 py-2 border-b`}>
                    <h4 className={`font-semibold text-sm ${groupColor.text}`}>
                      Resultados
                    </h4>
                  </div>
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {groupMatches.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No hay partidos todavía
                      </div>
                    ) : (
                      groupMatches.map((match) => {
                        const hasResult =
                          match.set1_team1_games !== null &&
                          match.set1_team2_games !== null;

                        return (
                          <div
                            key={match.id}
                            className="p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs mb-1">
                              {match.match_date && (
                                <span className="text-muted-foreground">
                                  {formatDate(match.match_date)}
                                </span>
                              )}
                              {match.start_time && (
                                <span className="text-muted-foreground">
                                  {formatTime(match.start_time)}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  match.status === "finished"
                                    ? "bg-green-100 text-green-700"
                                    : match.status === "in_progress"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {match.status === "finished"
                                  ? "Finalizado"
                                  : match.status === "in_progress"
                                  ? "En curso"
                                  : "Programado"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 text-sm">
                                {teamLabelShort(match.team1)}
                              </div>
                              {hasResult ? (
                                <div className="flex items-center gap-1 text-xs font-semibold">
                                  <span>
                                    {match.set1_team1_games}-{match.set1_team2_games}
                                  </span>
                                  <span className="text-muted-foreground">|</span>
                                  <span>
                                    {match.set2_team1_games}-{match.set2_team2_games}
                                  </span>
                                  {match.set3_team1_games !== null &&
                                    match.set3_team2_games !== null && (
                                      <>
                                        <span className="text-muted-foreground">|</span>
                                        <span>
                                          {match.set3_team1_games}-
                                          {match.set3_team2_games}
                                        </span>
                                      </>
                                    )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">vs</span>
                              )}
                              <div className="flex-1 text-sm text-right">
                                {teamLabelShort(match.team2)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

