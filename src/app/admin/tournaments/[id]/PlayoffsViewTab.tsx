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
import { Loader2Icon } from "lucide-react";
import { TournamentBracketV2 } from "@/components/tournament-bracket-v2";
import { formatDate, formatTime } from "@/lib/date-utils";
import type { PlayoffRow, TeamDTO, TournamentDTO } from "@/models/dto/tournament";

// Using Pick from TournamentDTO

// Función para mostrar solo apellidos en el bracket
function teamLabelBracket(team: TeamDTO | null) {
  if (!team) return "—";
  if (team.display_name) return team.display_name;
  const lastName1 = team.player1?.last_name ?? "";
  const lastName2 = team.player2?.last_name ?? "";
  if (!lastName1 && !lastName2) return "—";
  const result = `${lastName1} / ${lastName2}`.replace(/^\/\s*|\s*\/\s*$/g, "").trim();
  return result || "—";
}

// Fetch function para React Query
async function fetchTournamentPlayoffs(tournamentId: number): Promise<PlayoffRow[]> {
  const res = await fetch(`/api/tournaments/${tournamentId}/playoffs`);
  if (!res.ok) throw new Error("Failed to fetch playoffs");
  return res.json();
}

export default function PlayoffsViewTab({ tournament }: { tournament: Pick<TournamentDTO, "id"> }) {
  // React Query para compartir cache con GroupsTab y PlayoffsTab
  const {
    data: rows = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ["tournament-playoffs", tournament.id], // Mismo key que GroupsTab y PlayoffsTab
    queryFn: () => fetchTournamentPlayoffs(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card className="border-none shadow-none p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Cuadro de playoffs</CardTitle>
          <CardDescription>
            Todavía no hay cuadro armado. Los playoffs se generarán cuando se cierre la fase de grupos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Organizar rondas en orden
  const roundOrder: Record<string, number> = {
    "16avos": 1,
    "octavos": 2,
    "cuartos": 3,
    "semifinal": 4,
    "final": 5,
  };

  const rounds = Array.from(new Set(rows.map((r) => r.round))).sort(
    (a, b) => (roundOrder[a] || 99) - (roundOrder[b] || 99)
  );

  // Función para obtener el ganador de un match
  const getWinner = (match: NonNullable<PlayoffRow["match"]>) => {
    if (match.status !== "finished") return null;
    let team1Sets = 0;
    let team2Sets = 0;
    
    if (match.set1_team1_games !== null && match.set1_team2_games !== null) {
      if (match.set1_team1_games > match.set1_team2_games) team1Sets++;
      else if (match.set1_team2_games > match.set1_team1_games) team2Sets++;
    }
    if (match.set2_team1_games !== null && match.set2_team2_games !== null) {
      if (match.set2_team1_games > match.set2_team2_games) team1Sets++;
      else if (match.set2_team2_games > match.set2_team1_games) team2Sets++;
    }
    if (match.set3_team1_games !== null && match.set3_team2_games !== null) {
      if (match.set3_team1_games > match.set3_team2_games) team1Sets++;
      else if (match.set3_team2_games > match.set3_team1_games) team2Sets++;
    }
    
    if (team1Sets === 0 && team2Sets === 0) return null;
    return team1Sets > team2Sets ? match.team1 : match.team2;
  };

  // Preparar datos para el bracket
  const matchesByRound: Record<string, Array<{
    id: number;
    round: string;
    bracketPos: number;
    team1: { id: number; name: string } | null;
    team2: { id: number; name: string } | null;
    winner?: { id: number } | null;
    isFinished: boolean;
    scores?: string;
    sourceTeam1?: string | null;
    sourceTeam2?: string | null;
    matchDate?: string | null;
    startTime?: string | null;
    status?: string;
  }>> = {};

  rows.forEach((r) => {
    if (!r.match) return;
    const match = r.match;
    const winner = getWinner(match);
    
    const scores = match.status === "finished" && match.team1 && match.team2
      ? [
          match.set1_team1_games !== null && match.set1_team2_games !== null
            ? `${match.set1_team1_games}-${match.set1_team2_games}`
            : null,
          match.set2_team1_games !== null && match.set2_team2_games !== null
            ? `${match.set2_team1_games}-${match.set2_team2_games}`
            : null,
          match.set3_team1_games !== null && match.set3_team2_games !== null
            ? `${match.set3_team1_games}-${match.set3_team2_games}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ")
      : undefined;

    if (!matchesByRound[r.round]) {
      matchesByRound[r.round] = [];
    }

    matchesByRound[r.round].push({
      id: match.id,
      round: r.round,
      bracketPos: r.bracket_pos,
      team1: match.team1
        ? { id: match.team1.id, name: teamLabelBracket(match.team1) }
        : null,
      team2: match.team2
        ? { id: match.team2.id, name: teamLabelBracket(match.team2) }
        : null,
      winner: winner ? { id: winner.id } : undefined,
      isFinished: match.status === "finished",
      scores,
      sourceTeam1: r.source_team1,
      sourceTeam2: r.source_team2,
      matchDate: match.match_date,
      startTime: match.start_time,
      status: match.status,
    });
  });

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Cuadro de playoffs</CardTitle>
        <CardDescription>
          Vista de solo lectura del cuadro de playoffs. Ideal para compartir con participantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        {/* Bracket visualization - sin interacción */}
        <div className="bg-muted/20 rounded-lg p-6">
          <TournamentBracketV2
            rounds={rounds}
            matchesByRound={matchesByRound}
            onMatchClick={() => {}} // No hacer nada al hacer click
            selectedMatchId={null} // Nunca hay selección
          />
        </div>

        {/* Información adicional de matches - ordenada por fecha/hora */}
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold">Cronograma de partidos</h3>
          
          {/* Partidos con horario programado */}
          {(() => {
            const matchesWithSchedule = rows
              .filter((r) => r.match && r.match.team1 && r.match.team2 && r.match.match_date)
              .sort((a, b) => {
                const aDate = a.match!.match_date || "";
                const bDate = b.match!.match_date || "";
                if (aDate !== bDate) return aDate.localeCompare(bDate);
                const aTime = a.match!.start_time || "";
                const bTime = b.match!.start_time || "";
                return aTime.localeCompare(bTime);
              });

            const matchesWithoutSchedule = rows
              .filter((r) => r.match && r.match.team1 && r.match.team2 && !r.match.match_date);

            return (
              <>
                {matchesWithSchedule.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Partidos programados
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchesWithSchedule.map((r) => {
                        const match = r.match!;
                        return (
                          <div
                            key={r.id}
                            className="border rounded-lg p-4 bg-background hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-xs font-semibold text-muted-foreground">
                                {r.round.charAt(0).toUpperCase() + r.round.slice(1)} - Match {r.bracket_pos}
                              </div>
                              <div className={`text-xs px-2 py-0.5 rounded ${
                                match.status === "finished"
                                  ? "bg-green-100 text-green-700"
                                  : match.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}>
                                {match.status === "finished"
                                  ? "Finalizado"
                                  : match.status === "in_progress"
                                  ? "En curso"
                                  : "Programado"}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="font-medium text-sm">
                                {teamLabelBracket(match.team1)} vs {teamLabelBracket(match.team2)}
                              </div>
                              
                              {/* Horario destacado */}
                              <div className="bg-muted/50 rounded-md p-2 space-y-1">
                                {match.match_date && (
                                  <div className="flex items-center gap-2 text-sm font-semibold">
                                    <span>📅</span>
                                    <span>{formatDate(match.match_date)}</span>
                                  </div>
                                )}
                                {match.start_time && (
                                  <div className="flex items-center gap-2 text-sm font-semibold">
                                    <span>🕐</span>
                                    <span>{formatTime(match.start_time)}</span>
                                  </div>
                                )}
                              </div>
                              
                              {match.status === "finished" && match.set1_team1_games !== null && (
                                <div className="text-xs font-semibold text-green-600 pt-1">
                                  {match.set1_team1_games}-{match.set1_team2_games} •{" "}
                                  {match.set2_team1_games}-{match.set2_team2_games}
                                  {match.set3_team1_games !== null && ` • ${match.set3_team1_games}-${match.set3_team2_games}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Partidos sin horario */}
                {matchesWithoutSchedule.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Partidos sin programar
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchesWithoutSchedule.map((r) => {
                        const match = r.match!;
                        return (
                          <div
                            key={r.id}
                            className="border rounded-lg p-3 bg-muted/30"
                          >
                            <div className="text-xs font-semibold mb-2 text-muted-foreground">
                              {r.round.charAt(0).toUpperCase() + r.round.slice(1)} - Match {r.bracket_pos}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="font-medium">
                                {teamLabelBracket(match.team1)} vs {teamLabelBracket(match.team2)}
                              </div>
                              <div className="text-xs text-muted-foreground italic">
                                Sin horario programado
                              </div>
                              {match.status === "finished" && match.set1_team1_games !== null && (
                                <div className="text-xs font-semibold text-green-600">
                                  {match.set1_team1_games}-{match.set1_team2_games} •{" "}
                                  {match.set2_team1_games}-{match.set2_team2_games}
                                  {match.set3_team1_games !== null && ` • ${match.set3_team1_games}-${match.set3_team2_games}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

