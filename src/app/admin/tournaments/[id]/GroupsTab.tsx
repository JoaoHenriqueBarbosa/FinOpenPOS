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
import { MatchResultForm } from "@/components/match-result-form";
import { Loader2Icon, PencilIcon, CheckIcon, XIcon, TrashIcon, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/date-utils";
import { parseLocalDate } from "@/lib/court-slots-utils";
import { TournamentScheduleDialog, ScheduleConfig } from "@/components/tournament-schedule-dialog";
import { GroupScheduleViewer } from "@/components/group-schedule-viewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  TournamentDTO,
  GroupDTO,
  GroupTeamDTO,
  MatchDTO,
  StandingDTO,
  GroupsApiResponse,
  TeamDTO,
  AvailableSchedule,
} from "@/models/dto/tournament";
import type { CourtDTO } from "@/models/dto/court";
import { tournamentsService, tournamentMatchesService } from "@/services";

// Using TournamentDetailDTO from models

function teamLabel(team: TeamDTO | null, matchOrder?: number | null, isTeam1?: boolean) {
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
    return "Equipo";
  }
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

// Fetch functions para React Query
async function fetchTournamentGroups(tournamentId: number): Promise<GroupsApiResponse> {
  return tournamentsService.getGroups(tournamentId);
}

async function fetchTournamentPlayoffs(tournamentId: number): Promise<any[]> {
  return tournamentsService.getPlayoffs(tournamentId);
}

export default function GroupsTab({ tournament }: { tournament: Pick<TournamentDTO, "id" | "has_super_tiebreak" | "match_duration"> }) {
  const queryClient = useQueryClient();
  const [closingGroups, setClosingGroups] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [playoffsError, setPlayoffsError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showRegenerateScheduleDialog, setShowRegenerateScheduleDialog] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showScheduleViewer, setShowScheduleViewer] = useState(false);

  // React Query para compartir cache con TeamsTab
  const {
    data,
    isLoading: loading,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["tournament-groups", tournament.id], // Mismo key que TeamsTab
    queryFn: () => fetchTournamentGroups(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

  const {
    data: playoffsData = [],
  } = useQuery({
    queryKey: ["tournament-playoffs", tournament.id],
    queryFn: () => fetchTournamentPlayoffs(tournament.id),
    staleTime: 1000 * 30,
  });

  // Cargar horarios disponibles del torneo (agrupados) para pre-llenar el diálogo de regenerar horarios
  const {
    data: availableSchedulesGrouped = [],
  } = useQuery({
    queryKey: ["tournament-available-schedules-grouped", tournament.id],
    queryFn: () => tournamentsService.getAvailableSchedules(tournament.id, true),
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
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Crear mapa de ID a nombre de cancha
  const courtMap = new Map<number, string>();
  courts.forEach((court) => {
    courtMap.set(court.id, court.name);
  });

  const hasPlayoffs = playoffsData && playoffsData.length > 0;

  // Función load ahora solo invalida cache
  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["tournament-groups", tournament.id] });
  };

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
      setPlayoffsError(null);
      // NO cerrar el dialog aquí - esperar a que termine exitosamente
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
        const errorMessage = errorData.error || "Error al generar playoffs";
        setPlayoffsError(errorMessage);
        // Mantener el dialog abierto para mostrar el error
        return;
      }
      // Solo cerrar el dialog si fue exitoso
      setScheduleDialogOpen(false);
      // recargar todo para ver playoffs
      window.location.reload();
    } catch (err) {
      console.error(err);
      setPlayoffsError("Error al generar playoffs. Por favor, intentá nuevamente.");
    } finally {
      setClosingGroups(false);
    }
  };

  const handleStartEdit = (match: MatchDTO) => {
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
      load();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al actualizar horario");
    }
  };

  const handleDeleteGroups = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/tournaments/${tournament.id}/groups`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || "Error al eliminar fase de grupos");
        return;
      }
      setShowDeleteDialog(false);
      load();
      // Recargar la página para actualizar el estado en otros tabs
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar fase de grupos");
    } finally {
      setDeleting(false);
    }
  };

  const handleRegenerateSchedule = () => {
    setShowRegenerateDialog(true);
  };

  const handleConfirmRegenerateSchedule = async (config: ScheduleConfig) => {
    // Este handler ahora se maneja directamente en TournamentScheduleDialog cuando showLogs es true
    // Solo se usa para el caso sin logs
    try {
      setRegenerating(true);
      setPlayoffsError(null);
      await tournamentsService.regenerateSchedule(tournament.id, config);
      setShowRegenerateScheduleDialog(false);
      setShowRegenerateDialog(false);
      load();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Error al regenerar horarios. Por favor, intentá nuevamente.";
      setPlayoffsError(errorMessage);
    } finally {
      setRegenerating(false);
    }
  };

  // Contar partidos con horarios asignados
  const matchesWithSchedule = (data?.matches ?? []).filter(
    (m) => m.match_date && m.start_time
  ).length;

  // Contar todos los partidos de fase de grupos (para regenerar horarios)
  const totalGroupMatches = (data?.matches ?? []).length;

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
        <div className="flex gap-2">
          {data && data.groups.length > 0 && !hasPlayoffs && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                  Eliminando...
                </>
              ) : (
                <>
                  <TrashIcon className="h-3 w-3 mr-1" />
                  Eliminar Grupos
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScheduleViewer(true)}
            disabled={hasPlayoffs}
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            Revisar horarios
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateSchedule}
            disabled={regenerating || hasPlayoffs}
          >
            {regenerating ? (
              <>
                <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                Regenerando...
              </>
            ) : (
              "Regenerar horarios"
            )}
          </Button>
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
        </div>
      </CardHeader>

      <GroupScheduleViewer
        open={showScheduleViewer}
        onOpenChange={setShowScheduleViewer}
        matches={data?.matches || []}
        groups={data?.groups || []}
        tournamentId={tournament.id}
        onScheduleUpdated={load}
      />

      <TournamentScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) {
            setPlayoffsError(null);
          }
        }}
        onConfirm={handleConfirmSchedule}
        matchCount={calculatePlayoffMatchCount()}
        tournamentMatchDuration={tournament.match_duration}
        error={playoffsError}
        isLoading={closingGroups}
      />

      <TournamentScheduleDialog
        open={showRegenerateScheduleDialog}
        onOpenChange={(open) => {
          setShowRegenerateScheduleDialog(open);
          if (!open) {
            setPlayoffsError(null);
          }
        }}
        error={playoffsError}
        isLoading={regenerating}
        onConfirm={handleConfirmRegenerateSchedule}
        matchCount={totalGroupMatches}
        tournamentMatchDuration={tournament.match_duration}
        availableSchedules={availableSchedulesGrouped}
        tournamentId={tournament.id}
        showLogs={true}
        streamEndpoint="regenerate-schedule-stream"
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

          // Agrupar matches por grupo
          const matchesByGroup = new Map<number, MatchDTO[]>();
          data.matches.forEach((m) => {
            if (m.tournament_group_id) {
              if (!matchesByGroup.has(m.tournament_group_id)) {
                matchesByGroup.set(m.tournament_group_id, []);
              }
              matchesByGroup.get(m.tournament_group_id)!.push(m);
            }
          });

          return sortedGroups.map((group) => {
            const groupInfo = groupMap.get(group.id);
            const groupColor = groupInfo
              ? getGroupColor(groupInfo.index)
              : { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", badgeBg: "bg-gray-200", badgeText: "text-gray-800" };
            
            const groupMatches = matchesByGroup.get(group.id) || [];

            // Ordenar matches por fecha y hora
            const sortedMatches = [...groupMatches].sort((a, b) => {
              if (a.match_date && b.match_date) {
                const dateCompare = a.match_date.localeCompare(b.match_date);
                if (dateCompare !== 0) return dateCompare;
              } else if (a.match_date) return -1;
              else if (b.match_date) return 1;

              if (a.start_time && b.start_time) {
                return a.start_time.localeCompare(b.start_time);
              } else if (a.start_time) return -1;
              else if (b.start_time) return 1;

              return 0;
            });

            return (
              <div key={group.id} className="space-y-3">
                {/* Partidos del grupo */}
                {sortedMatches.map((m) => {
                  const team1Name = teamLabel(m.team1, m.match_order, true);
                  const team2Name = teamLabel(m.team2, m.match_order, false);
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
                            {m.match_date && m.start_time && (
                              <span className="font-medium text-muted-foreground">
                                {(() => {
                                  const date = parseLocalDate(m.match_date);
                                  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                  const dayName = dayNames[date.getDay()].toUpperCase();
                                  const courtName = m.court_id ? courtMap.get(m.court_id) : null;
                                  const courtText = courtName ? ` - ${courtName}` : "";
                                  return `${dayName} ${formatDate(m.match_date)} ${formatTime(m.start_time)}${courtText}`;
                                })()}
                              </span>
                            )}
                            {m.match_date && !m.start_time && (
                              <span className="font-medium text-muted-foreground">
                                {(() => {
                                  const date = parseLocalDate(m.match_date);
                                  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                                  const dayName = dayNames[date.getDay()].toUpperCase();
                                  return `${dayName} ${formatDate(m.match_date)}`;
                                })()}
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
                      <MatchResultForm
                        match={m}
                        team1Name={team1Name}
                        team2Name={team2Name}
                        hasSuperTiebreak={tournament.has_super_tiebreak}
                        onSaved={load}
                        groupColor={{
                          bg: groupColor.bg,
                          text: groupColor.text,
                        }}
                        disabled={hasPlayoffs}
                        disabledMessage="No se pueden modificar los resultados de zona una vez generados los playoffs"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })
        })()}
      </CardContent>

      {/* Diálogo de confirmación para eliminar fase de grupos */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación de fase de grupos</DialogTitle>
            <DialogDescription>
              <div>
                ¿Estás seguro de que deseas eliminar toda la fase de grupos? Esta acción eliminará:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Todos los grupos</li>
                  <li>Todos los partidos de grupos</li>
                  <li>Todos los resultados cargados</li>
                  <li>Todas las tablas de posiciones</li>
                  <li>Todas las asignaciones de equipos a grupos</li>
                </ul>
                <div className="mt-2 font-semibold text-amber-600">
                  Esta acción no se puede deshacer. Podrás volver a generar los grupos desde la fase de inscripción.
                </div>
              </div>
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
            <Button variant="destructive" onClick={handleDeleteGroups} disabled={deleting}>
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

      {/* Diálogo de confirmación para regenerar horarios */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerar horarios de partidos</DialogTitle>
            <DialogDescription>
              <div>
                {matchesWithSchedule > 0 ? (
                  <>
                    <div className="font-semibold text-amber-600 mb-2">
                      ⚠️ Advertencia: {matchesWithSchedule} partido{matchesWithSchedule !== 1 ? "s" : ""} ya {matchesWithSchedule !== 1 ? "tienen" : "tiene"} horarios asignados.
                    </div>
                    <div className="mb-2">
                      Al regenerar los horarios, se sobreescribirán los horarios existentes de todos los partidos de fase de grupos que aún no tengan resultados cargados.
                    </div>
                  </>
                ) : (
                  <div>
                    Se asignarán horarios a todos los partidos de fase de grupos que aún no tengan resultados cargados.
                  </div>
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  Los partidos que ya tienen resultados no se modificarán.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
              disabled={regenerating}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setShowRegenerateDialog(false);
                setShowRegenerateScheduleDialog(true);
              }}
              disabled={regenerating}
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
