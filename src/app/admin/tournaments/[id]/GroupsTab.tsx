"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { MatchResultInlineForm } from "@/components/match-result-inline-form";
import { Loader2Icon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/date-utils";

type Tournament = {
  id: number;
  has_super_tiebreak: boolean;
};

type Group = {
  id: number;
  name: string;
};

type GroupTeam = {
  id: number;
  tournament_group_id: number;
  team: {
    id: number;
    display_name: string | null;
    player1: { first_name: string; last_name: string } | null;
    player2: { first_name: string; last_name: string } | null;
  } | null;
};

type Match = {
  id: number;
  tournament_group_id: number | null;
  status: string;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  set1_team1_games: number | null;
  set1_team2_games: number | null;
  set2_team1_games: number | null;
  set2_team2_games: number | null;
  set3_team1_games: number | null;
  set3_team2_games: number | null;
  team1: GroupTeam["team"];
  team2: GroupTeam["team"];
};

type ApiResponse = {
  groups: Group[];
  groupTeams: GroupTeam[];
  matches: Match[];
};

function teamLabel(team: GroupTeam["team"]) {
  if (!team) return "Equipo";
  if (team.display_name) return team.display_name;
  return `${team.player1?.first_name ?? ""} ${team.player1?.last_name ?? ""} / ${
    team.player2?.first_name ?? ""
  } ${team.player2?.last_name ?? ""}`;
}

export default function GroupsTab({ tournament }: { tournament: Tournament }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingGroups, setClosingGroups] = useState(false);
  const [hasPlayoffs, setHasPlayoffs] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");

  const load = async () => {
    try {
      const [groupsRes, playoffsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournament.id}/groups`),
        fetch(`/api/tournaments/${tournament.id}/playoffs`),
      ]);
      if (groupsRes.ok) {
        const json = (await groupsRes.json()) as ApiResponse;
        setData(json);
      }
      if (playoffsRes.ok) {
        const playoffsData = await playoffsRes.json();
        setHasPlayoffs(playoffsData && playoffsData.length > 0);
      }
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

  const handleCloseGroups = async () => {
    try {
      setClosingGroups(true);
      const res = await fetch(
        `/api/tournaments/${tournament.id}/close-groups`,
        { method: "POST" }
      );
      if (!res.ok) {
        console.error("Error closing groups");
        return;
      }
      // recargar todo para ver playoffs
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setClosingGroups(false);
    }
  };

  const handleStartEdit = (match: Match) => {
    setEditingMatchId(match.id);
    // Convertir fecha a formato YYYY-MM-DD para el input
    setEditDate(match.match_date ? match.match_date.split("T")[0] : "");
    setEditTime(match.start_time || "");
  };

  const handleCancelEdit = () => {
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

  if (!data || data.groups.length === 0) {
    return (
      <Card className="border-none shadow-none p-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Fase de grupos</CardTitle>
          <CardDescription>
            No hay zonas generadas todavía. Cerrá la inscripción en la pestaña
            Equipos para que se creen automáticamente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none p-0 space-y-4">
      <CardHeader className="px-0 pt-0 flex items-center justify-between">
        <div>
          <CardTitle>Fase de grupos</CardTitle>
          <CardDescription>
            Cargá resultados set por set. Cuando estén todos los partidos
            cargados, podés cerrar la fase y generar los playoffs.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCloseGroups}
          disabled={closingGroups || hasPlayoffs}
        >
          {closingGroups && (
            <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
          )}
          Generar playoffs
        </Button>
      </CardHeader>

      <CardContent className="px-0 space-y-4">
        {data.groups.map((g) => {
          const teams = data.groupTeams.filter(
            (gt) => gt.tournament_group_id === g.id
          );
          const matches = data.matches.filter(
            (m) => m.tournament_group_id === g.id
          );

          return (
            <div
              key={g.id}
              className="border rounded-lg p-3 space-y-3 bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{g.name}</h3>
                <span className="text-[11px] text-muted-foreground">
                  {teams.length} equipos • {matches.length} partidos
                </span>
              </div>

              {/* Equipos */}
              <div className="text-xs">
                <span className="font-semibold">Equipos:</span>{" "}
                {teams.map((gt) => teamLabel(gt.team)).join(" · ")}
              </div>

              {/* Partidos */}
              <div className="space-y-3">
                {matches.map((m) => {
                  const team1Name = teamLabel(m.team1);
                  const team2Name = teamLabel(m.team2);
                  
                  return (
                    <div
                      key={m.id}
                      className="border rounded-lg bg-background shadow-sm overflow-hidden"
                    >
                      {/* Header con fecha, hora y estado */}
                      <div className="bg-gray-50 border-b px-4 py-2">
                        {editingMatchId === m.id ? (
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
                              onClick={() => handleSaveSchedule(m.id)}
                            >
                              <CheckIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={handleCancelEdit}
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-xs">
                            {m.match_date && (
                              <span className="font-medium text-muted-foreground">
                                📅 {formatDate(m.match_date)}
                              </span>
                            )}
                            {m.start_time && (
                              <span className="text-muted-foreground">
                                🕐 {formatTime(m.start_time)}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 ml-auto"
                              onClick={() => handleStartEdit(m)}
                            >
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              m.status === "finished" 
                                ? "bg-green-100 text-green-700" 
                                : m.status === "in_progress"
                                ? "bg-blue-100 text-blue-700"
                                : m.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {m.status === "finished" 
                                ? "Finalizado" 
                                : m.status === "in_progress"
                                ? "En curso"
                                : m.status === "cancelled"
                                ? "Cancelado"
                                : "Programado"}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Nombres de equipos con inputs de resultados */}
                      <MatchResultInlineForm 
                        match={m} 
                        team1Name={team1Name} 
                        team2Name={team2Name} 
                        hasSuperTiebreak={tournament.has_super_tiebreak}
                        onSaved={load} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
