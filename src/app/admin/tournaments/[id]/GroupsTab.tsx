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
import { TournamentScheduleDialog, ScheduleConfig } from "@/components/tournament-schedule-dialog";

type Tournament = {
  id: number;
  has_super_tiebreak: boolean;
  match_duration: number;
};

type Group = {
  id: number;
  name: string;
  group_order?: number;
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

// Función para obtener el color del grupo basado en su índice
function getGroupColor(groupIndex: number): { bg: string; text: string; border: string; badgeBg: string; badgeText: string } {
  const colorSchemes = [
    // Azules
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badgeBg: "bg-blue-100", badgeText: "text-blue-800" },
    // Verdes
    { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", badgeBg: "bg-green-100", badgeText: "text-green-800" },
    // Amarillos
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
    // Naranjas
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badgeBg: "bg-orange-100", badgeText: "text-orange-800" },
    // Púrpuras
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
    // Rosas
    { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", badgeBg: "bg-pink-100", badgeText: "text-pink-800" },
    // Cyan
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", badgeBg: "bg-cyan-100", badgeText: "text-cyan-800" },
    // Indigo
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badgeBg: "bg-indigo-100", badgeText: "text-indigo-800" },
  ];
  
  return colorSchemes[groupIndex % colorSchemes.length] || colorSchemes[0];
}

export default function GroupsTab({ tournament }: { tournament: Tournament }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingGroups, setClosingGroups] = useState(false);
  const [hasPlayoffs, setHasPlayoffs] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

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

  // Calcular estimado de matches de playoffs
  const calculatePlayoffMatchCount = (): number => {
    if (!data) return 0;
    
    // Calcular cuántos equipos clasifican
    let totalQualified = 0;
    data.groups.forEach((group) => {
      const groupTeams = data.groupTeams.filter(gt => gt.tournament_group_id === group.id);
      const size = groupTeams.length;
      // Zonas de 3: pasan 2, zonas de 4: pasan 3
      if (size === 4) {
        totalQualified += 3;
      } else {
        totalQualified += 2;
      }
    });

    if (totalQualified < 2) return 0;

    // Calcular matches totales (suma de todas las rondas)
    // Estimación: si hay N equipos, habrá aproximadamente N-1 matches en total
    // Pero esto es una estimación conservadora
    return Math.max(totalQualified - 1, 1);
  };

  const handleCloseGroups = () => {
    setScheduleDialogOpen(true);
  };

  const handleConfirmSchedule = async (config: ScheduleConfig) => {
    try {
      setClosingGroups(true);
      setScheduleDialogOpen(false);
      const res = await fetch(
        `/api/tournaments/${tournament.id}/close-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Error al generar playoffs");
        return;
      }
      // recargar todo para ver playoffs
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al generar playoffs");
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

      <TournamentScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onConfirm={handleConfirmSchedule}
        matchCount={calculatePlayoffMatchCount()}
        tournamentMatchDuration={tournament.match_duration}
      />

      <CardContent className="px-0 space-y-3">
        {(() => {
          // Ordenar grupos por group_order o por nombre para consistencia
          const sortedGroups = [...data.groups].sort((a, b) => {
            // Si tienen group_order, usar eso
            if (a.group_order !== undefined && b.group_order !== undefined) {
              return a.group_order - b.group_order;
            }
            // Si no, ordenar por nombre
            return a.name.localeCompare(b.name);
          });

          // Crear mapa de grupo id -> nombre de grupo y su índice (basado en orden)
          const groupMap = new Map<number, { name: string; index: number }>();
          sortedGroups.forEach((g, index) => {
            groupMap.set(g.id, { name: g.name, index });
          });

          // Obtener todos los matches y ordenarlos por fecha y hora
          const allMatches = [...data.matches].sort((a, b) => {
            // Primero por fecha
            if (a.match_date && b.match_date) {
              const dateCompare = a.match_date.localeCompare(b.match_date);
              if (dateCompare !== 0) return dateCompare;
            } else if (a.match_date) return -1;
            else if (b.match_date) return 1;

            // Luego por hora
            if (a.start_time && b.start_time) {
              return a.start_time.localeCompare(b.start_time);
            } else if (a.start_time) return -1;
            else if (b.start_time) return 1;

            return 0;
          });

          return allMatches.map((m) => {
            const team1Name = teamLabel(m.team1);
            const team2Name = teamLabel(m.team2);
            const groupInfo = m.tournament_group_id
              ? groupMap.get(m.tournament_group_id)
              : null;
            const groupName = groupInfo?.name || "Sin grupo";
            const groupColor = groupInfo
              ? getGroupColor(groupInfo.index)
              : { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", badgeBg: "bg-gray-200", badgeText: "text-gray-800" };

            return (
              <div
                key={m.id}
                className={`border rounded-lg shadow-sm overflow-hidden ${groupColor.border}`}
              >
                {/* Header con grupo, fecha, hora y estado */}
                <div className={`${groupColor.bg} border-b px-4 py-2`}>
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
                      {/* Indicador de grupo con color */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${groupColor.badgeBg} ${groupColor.badgeText}`}>
                        {groupName}
                      </span>
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          m.status === "finished"
                            ? "bg-green-100 text-green-700"
                            : m.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : m.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
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
                  groupColor={{
                    bg: groupColor.bg,
                    text: groupColor.text,
                  }}
                />
              </div>
            );
          });
        })()}
      </CardContent>
    </Card>
  );
}
