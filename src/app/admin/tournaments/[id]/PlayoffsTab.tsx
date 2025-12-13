"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2Icon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchResultInlineForm } from "@/components/match-result-inline-form";
import { formatDate, formatTime } from "@/lib/date-utils";

type Tournament = { 
  id: number;
  has_super_tiebreak: boolean;
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

type Match = NonNullable<PlayoffRow["match"]>;

function teamLabel(team: Match["team1"]) {
  if (!team) return "Equipo";
  if (team.display_name) return team.display_name;
  return `${team.player1?.first_name ?? ""} ${team.player1?.last_name ?? ""} / ${
    team.player2?.first_name ?? ""
  } ${team.player2?.last_name ?? ""}`;
}

// Función para obtener el color de la ronda
function getRoundColor(round: string): { bg: string; text: string; border: string; badgeBg: string; badgeText: string } {
  const roundColors: Record<string, { bg: string; text: string; border: string; badgeBg: string; badgeText: string }> = {
    "16avos": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badgeBg: "bg-blue-100", badgeText: "text-blue-800" },
    "octavos": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badgeBg: "bg-green-100", badgeText: "text-green-800" },
    "cuartos": { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", badgeBg: "bg-pink-100", badgeText: "text-pink-800" },
    "semifinal": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badgeBg: "bg-orange-100", badgeText: "text-orange-800" },
    "final": { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
  };
  
  return roundColors[round] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", badgeBg: "bg-gray-100", badgeText: "text-gray-800" };
}

export default function PlayoffsTab({ tournament }: { tournament: Tournament }) {
  const [rows, setRows] = useState<PlayoffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");

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

  const handleStartEditSchedule = (matchId: number) => {
    const row = rows.find(r => r.match?.id === matchId);
    if (row?.match) {
      setEditingMatchId(matchId);
      setEditDate(row.match.match_date ? row.match.match_date.split("T")[0] : "");
      setEditTime(row.match.start_time || "");
    }
  };

  const handleCancelEditSchedule = () => {
    setEditingMatchId(null);
    setEditDate("");
    setEditTime("");
  };

  const handleSaveSchedule = async (matchId: number) => {
    try {
      const res = await fetch(`/api/tournament-matches/${matchId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_date: editDate || null,
          start_time: editTime || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Error al actualizar horario");
        return;
      }
      setEditingMatchId(null);
      setEditDate("");
      setEditTime("");
      load();
    } catch (err) {
      console.error(err);
      alert("Error al actualizar horario");
    }
  };

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
          <CardTitle>Playoffs</CardTitle>
          <CardDescription>
            Todavía no hay cuadro armado. Cerrá la fase de grupos para generar
            los cruces automáticamente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Organizar rondas en orden para mostrar en badges
  const roundOrder: Record<string, number> = {
    "16avos": 1,
    "octavos": 2,
    "cuartos": 3,
    "semifinal": 4,
    "final": 5,
  };

  const getRoundLabel = (round: string): string => {
    const labels: Record<string, string> = {
      "16avos": "16avos de Final",
      "octavos": "Octavos de Final",
      "cuartos": "Cuartos de Final",
      "semifinal": "Semifinal",
      "final": "Final",
    };
    return labels[round] || round;
  };

  // Obtener todos los matches y ordenarlos por fecha y hora
  const allMatches = rows
    .filter(r => r.match !== null)
    .map(r => ({ ...r, match: r.match! }))
    .sort((a, b) => {
      const matchA = a.match;
      const matchB = b.match;
      
      // Primero por fecha
      if (matchA.match_date && matchB.match_date) {
        const dateCompare = matchA.match_date.localeCompare(matchB.match_date);
        if (dateCompare !== 0) return dateCompare;
      } else if (matchA.match_date) return -1;
      else if (matchB.match_date) return 1;

      // Luego por hora
      if (matchA.start_time && matchB.start_time) {
        return matchA.start_time.localeCompare(matchB.start_time);
      } else if (matchA.start_time) return -1;
      else if (matchB.start_time) return 1;

      // Finalmente por ronda y posición
      const roundCompare = (roundOrder[a.round] || 99) - (roundOrder[b.round] || 99);
      if (roundCompare !== 0) return roundCompare;
      
      return a.bracket_pos - b.bracket_pos;
    });

  return (
    <Card className="border-none shadow-none p-0 space-y-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Playoffs</CardTitle>
        <CardDescription>
          Cargá resultados set por set. Los partidos están ordenados por horario.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 space-y-3">
        {allMatches.map((row) => {
          const match = row.match;
          if (!match) return null;

          const team1Name = teamLabel(match.team1);
          const team2Name = teamLabel(match.team2);
          const isEditing = editingMatchId === match.id;
          const roundColor = getRoundColor(row.round);
          
          // Determinar si el match usa super tiebreak
          const hasSuperTiebreak = (row.round === "cuartos" || row.round === "semifinal" || row.round === "final")
            ? false
            : tournament.has_super_tiebreak;

          return (
            <div
              key={match.id}
              className={`border rounded-lg shadow-sm overflow-hidden ${roundColor.border}`}
            >
              {/* Header con ronda, fecha, hora y estado */}
              <div className={`${roundColor.bg} border-b px-4 py-2`}>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="h-7 text-xs"
                      step="60"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleSaveSchedule(match.id)}
                    >
                      <CheckIcon className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={handleCancelEditSchedule}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${roundColor.badgeBg} ${roundColor.badgeText} border-current`}>
                      {getRoundLabel(row.round)}
                    </Badge>
                    {match.match_date && (
                      <span className="font-medium text-muted-foreground">
                        📅 {formatDate(match.match_date)}
                      </span>
                    )}
                    {match.start_time && (
                      <span className="text-muted-foreground">
                        🕐 {formatTime(match.start_time)}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 ml-auto"
                      onClick={() => handleStartEditSchedule(match.id)}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </Button>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      match.status === "finished" 
                        ? "bg-green-100 text-green-700" 
                        : match.status === "in_progress"
                        ? "bg-blue-100 text-blue-700"
                        : match.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {match.status === "finished" 
                        ? "Finalizado" 
                        : match.status === "in_progress"
                        ? "En curso"
                        : match.status === "cancelled"
                        ? "Cancelado"
                        : "Programado"}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Formulario de resultado */}
              {match.team1 && match.team2 ? (
                <MatchResultInlineForm
                  key={match.id}
                  match={match}
                  team1Name={team1Name}
                  team2Name={team2Name}
                  hasSuperTiebreak={hasSuperTiebreak}
                  groupColor={{ bg: roundColor.bg, text: roundColor.text }}
                  onSaved={() => {
                    load();
                  }}
                />
              ) : (
                <div className={`p-4 ${roundColor.bg}`}>
                  <p className={`text-sm ${roundColor.text}`}>
                    Este match aún no tiene ambos equipos asignados. Esperá a que se completen los matches anteriores.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
