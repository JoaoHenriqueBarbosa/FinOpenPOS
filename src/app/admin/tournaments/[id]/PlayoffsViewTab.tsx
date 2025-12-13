"use client";

import { useEffect, useState } from "react";
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

type Tournament = { 
  id: number;
};

type PlayoffRow = {
  id: number;
  round: string;
  bracket_pos: number;
  source_team1: string | null;
  source_team2: string | null;
  match: {
    id: number;
    status: string;
    match_date: string | null;
    start_time: string | null;
    set1_team1_games: number | null;
    set1_team2_games: number | null;
    set2_team1_games: number | null;
    set2_team2_games: number | null;
    set3_team1_games: number | null;
    set3_team2_games: number | null;
    team1: {
      id: number;
      display_name: string | null;
      player1: { first_name: string; last_name: string } | null;
      player2: { first_name: string; last_name: string } | null;
    } | null;
    team2: {
      id: number;
      display_name: string | null;
      player1: { first_name: string; last_name: string } | null;
      player2: { first_name: string; last_name: string } | null;
    } | null;
  } | null;
};

// Función para mostrar solo apellidos en el bracket
function teamLabelBracket(team: PlayoffRow["match"]["team1"]) {
  if (!team) return "—";
  if (team.display_name) return team.display_name;
  const lastName1 = team.player1?.last_name ?? "";
  const lastName2 = team.player2?.last_name ?? "";
  if (!lastName1 && !lastName2) return "—";
  const result = `${lastName1} / ${lastName2}`.replace(/^\/\s*|\s*\/\s*$/g, "").trim();
  return result || "—";
}

export default function PlayoffsViewTab({ tournament }: { tournament: Tournament }) {
  const [rows, setRows] = useState<PlayoffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/playoffs`);
      if (!res.ok) throw new Error("Failed to fetch playoffs");
      const data = (await res.json()) as PlayoffRow[];
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id]);

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

        {/* Información adicional de matches */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold">Información de partidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows
              .filter((r) => r.match && r.match.team1 && r.match.team2)
              .map((r) => {
                const match = r.match!;
                return (
                  <div
                    key={r.id}
                    className="border rounded-lg p-3 bg-background"
                  >
                    <div className="text-xs font-semibold mb-2">
                      {r.round.charAt(0).toUpperCase() + r.round.slice(1)} - Match {r.bracket_pos}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">
                        {teamLabelBracket(match.team1)} vs {teamLabelBracket(match.team2)}
                      </div>
                      {match.match_date && (
                        <div className="text-xs text-muted-foreground">
                          📅 {formatDate(match.match_date)}
                          {match.start_time && ` • 🕐 ${formatTime(match.start_time)}`}
                        </div>
                      )}
                      {match.status === "finished" && match.set1_team1_games !== null && (
                        <div className="text-xs font-semibold text-green-600">
                          {match.set1_team1_games}-{match.set1_team2_games} •{" "}
                          {match.set2_team1_games}-{match.set2_team2_games}
                          {match.set3_team1_games !== null && ` • ${match.set3_team1_games}-${match.set3_team2_games}`}
                        </div>
                      )}
                      <div className={`text-xs px-2 py-0.5 rounded inline-block ${
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
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

