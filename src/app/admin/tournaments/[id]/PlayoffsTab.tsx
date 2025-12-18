"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2Icon, PencilIcon, CheckIcon, XIcon, TrashIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MatchResultForm } from "@/components/match-result-form";
import { formatDate, formatTime } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { PlayoffRow, TournamentDTO } from "@/models/dto/tournament";
import type { MatchStatus } from "@/models/db/tournament";
import { tournamentsService, tournamentMatchesService } from "@/services";

// Using Pick from TournamentDTO and MatchDTO
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

// Fetch function para React Query
async function fetchTournamentPlayoffs(tournamentId: number): Promise<PlayoffRow[]> {
  return tournamentsService.getPlayoffs(tournamentId);
}

export default function PlayoffsTab({ tournament }: { tournament: Pick<TournamentDTO, "id" | "has_super_tiebreak"> }) {
  const queryClient = useQueryClient();
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // React Query para compartir cache con GroupsTab y PlayoffsViewTab
  const {
    data: rows = [],
    isLoading: loading,
    refetch: refetchPlayoffs,
  } = useQuery({
    queryKey: ["tournament-playoffs", tournament.id], // Mismo key que GroupsTab y PlayoffsViewTab
    queryFn: () => fetchTournamentPlayoffs(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

  // Función load ahora solo invalida cache
  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["tournament-playoffs", tournament.id] });
  };

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
      if (!editDate || !editTime) {
        alert("Fecha y hora son requeridos");
        return;
      }
      
      await tournamentMatchesService.scheduleMatch(matchId, {
        date: editDate,
        start_time: editTime,
      });
      setEditingMatchId(null);
      setEditDate("");
      setEditTime("");
      load(); // load() ahora invalida cache
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al actualizar horario");
    }
  };

  const handleDeletePlayoffs = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/tournaments/${tournament.id}/playoffs`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Error al eliminar playoffs");
        return;
      }
      setShowDeleteDialog(false);
      load();
      // Recargar la página para actualizar el estado en otros tabs
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar playoffs");
    } finally {
      setDeleting(false);
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Playoffs</CardTitle>
            <CardDescription>
              Cargá resultados set por set. Los partidos están ordenados por horario.
            </CardDescription>
          </div>
          {rows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Eliminar Playoffs
                </>
              )}
            </Button>
          )}
        </div>
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
                <MatchResultForm
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

      {/* Diálogo de confirmación para eliminar playoffs */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación de playoffs</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar todos los playoffs? Esta acción eliminará:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todos los partidos de playoffs</li>
                <li>Todos los resultados cargados</li>
                <li>Todo el cuadro de playoffs</li>
              </ul>
              <p className="mt-2 font-semibold text-amber-600">
                Esta acción no se puede deshacer. Podrás volver a generar los playoffs desde la fase de grupos.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeletePlayoffs} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Confirmar y eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
