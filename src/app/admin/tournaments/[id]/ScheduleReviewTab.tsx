"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { GroupScheduleViewer } from "@/components/group-schedule-viewer";
import { TournamentScheduleDialog } from "@/components/tournament-schedule-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TournamentDTO, GroupsApiResponse, AvailableSchedule } from "@/models/dto/tournament";
import { tournamentsService } from "@/services";

async function fetchTournamentGroups(tournamentId: number): Promise<GroupsApiResponse> {
  return tournamentsService.getGroups(tournamentId);
}

export default function ScheduleReviewTab({
  tournament,
}: {
  tournament: Pick<TournamentDTO, "id" | "match_duration" | "status">;
}) {
  const queryClient = useQueryClient();
  const [showScheduleViewer, setShowScheduleViewer] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [closingReview, setClosingReview] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCloseReviewDialog, setShowCloseReviewDialog] = useState(false);

  const {
    data,
    isLoading: loading,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["tournament-groups", tournament.id],
    queryFn: () => fetchTournamentGroups(tournament.id),
    staleTime: 1000 * 30,
  });

  // Los horarios disponibles ahora se generan en memoria durante la revisión de horarios
  const availableSchedulesGrouped: AvailableSchedule[] = [];

  const load = () => {
    queryClient.invalidateQueries({ queryKey: ["tournament-groups", tournament.id] });
    queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
  };

  const handleCloseReview = async () => {
    try {
      setClosingReview(true);
      const response = await fetch(`/api/tournaments/${tournament.id}/close-schedule-review`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || "Error al cerrar revisión de horarios");
        return;
      }

      // Cerrar el diálogo
      setShowCloseReviewDialog(false);

      // Invalidar cache y recargar
      load();
      queryClient.invalidateQueries({ queryKey: ["tournament", tournament.id] });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al cerrar revisión de horarios");
    } finally {
      setClosingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const hasGroups = data && data.groups.length > 0;
  const hasScheduledMatches = data && data.matches.some(m => m.match_date && m.start_time);
  const totalGroupMatches = (data?.matches ?? []).length;

  const handleRegenerateSchedule = () => {
    setShowRegenerateDialog(true);
  };

  const handleConfirmRegenerateSchedule = async () => {
    // Este handler se maneja directamente en TournamentScheduleDialog cuando showLogs es true
    // Solo actualizar los datos sin cerrar el dialog ni recargar la página
    setRegenerating(false);
    setRegenerateError(null);
    // No cerrar el dialog: setShowRegenerateDialog(false);
    // Solo actualizar los datos en silencio
    load();
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

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Revisión de horarios de zona</CardTitle>
        <CardDescription>
          Revisá y editá los horarios de los partidos de la fase de grupos antes de comenzar el torneo.
          Una vez que cierres esta etapa, no podrás modificar los horarios.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pt-4 space-y-4">
        {!hasGroups ? (
          <div className="text-center py-8 text-muted-foreground">
            Primero debes cerrar la inscripción para generar las zonas y partidos.
          </div>
        ) : !hasScheduledMatches ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              No hay horarios asignados. Generá horarios para los partidos de la fase de grupos.
            </div>
            {tournament.status === "schedule_review" && (
              <div className="flex items-center justify-center gap-2">
                <Button onClick={handleRegenerateSchedule}>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Generar horarios
                </Button>
                <Button
                  variant="destructive"
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
                      Eliminar grupos
                    </>
                  )}
                </Button>
              </div>
            )}
            {tournament.status !== "schedule_review" && (
              <div className="text-sm text-amber-600">
                Esta etapa ya fue cerrada. No se pueden generar horarios desde aquí.
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {data.matches.filter(m => m.match_date && m.start_time).length} partidos con horarios asignados
              </div>
              <div className="flex gap-2">
                {tournament.status === "schedule_review" ? (
                  <>
                    {hasGroups && (
                      <Button
                        variant="destructive"
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
                            Eliminar grupos
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleRegenerateSchedule}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <>
                          <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                          Regenerando...
                        </>
                      ) : (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2" />
                          Regenerar horarios
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowScheduleViewer(true)}
                    >
                      Revisar y editar horarios
                    </Button>
                    {hasScheduledMatches && tournament.status === "schedule_review" && (
                      <Button
                        variant="default"
                        onClick={() => setShowCloseReviewDialog(true)}
                        disabled={closingReview}
                      >
                        {closingReview ? (
                          <>
                            <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                            Cerrando...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Cerrar revisión de horarios
                          </>
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-amber-600">
                    Esta etapa ya fue cerrada. No se pueden modificar horarios desde aquí.
                  </div>
                )}
              </div>
            </div>

            <GroupScheduleViewer
              open={showScheduleViewer}
              onOpenChange={setShowScheduleViewer}
              matches={data.matches}
              groups={data.groups}
              tournamentId={tournament.id}
              onScheduleUpdated={load}
            />

            <TournamentScheduleDialog
              open={showRegenerateDialog}
              onOpenChange={(open) => {
                setShowRegenerateDialog(open);
                if (!open) {
                  setRegenerateError(null);
                }
              }}
              error={regenerateError}
              isLoading={regenerating}
              onConfirm={handleConfirmRegenerateSchedule}
              matchCount={totalGroupMatches}
              tournamentMatchDuration={tournament.match_duration}
              availableSchedules={availableSchedulesGrouped}
              tournamentId={tournament.id}
              showLogs={true}
              streamEndpoint="regenerate-schedule-stream"
            />
          </>
        )}

        {hasGroups && !hasScheduledMatches && (
          <TournamentScheduleDialog
            open={showRegenerateDialog}
            onOpenChange={(open) => {
              setShowRegenerateDialog(open);
              if (!open) {
                setRegenerateError(null);
              }
            }}
            error={regenerateError}
            isLoading={regenerating}
            onConfirm={handleConfirmRegenerateSchedule}
            matchCount={totalGroupMatches}
            tournamentMatchDuration={tournament.match_duration}
            availableSchedules={availableSchedulesGrouped}
            tournamentId={tournament.id}
            showLogs={true}
            streamEndpoint="regenerate-schedule-stream"
          />
        )}

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

        {/* Diálogo de confirmación para cerrar revisión de horarios */}
        <Dialog open={showCloseReviewDialog} onOpenChange={setShowCloseReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar cierre de revisión de horarios</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas cerrar la revisión de horarios? Esta acción:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Bloqueará la modificación de horarios de la fase de grupos</li>
                  <li>Pasará el torneo a la fase de grupos (in_progress)</li>
                </ul>
                <p className="mt-2 font-semibold text-amber-600">
                  Una vez cerrada, no podrás modificar los horarios de los partidos. Esta acción no se puede deshacer.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCloseReviewDialog(false)}
                disabled={closingReview}
              >
                Cancelar
              </Button>
              <Button variant="default" onClick={handleCloseReview} disabled={closingReview}>
                {closingReview ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                    Cerrando...
                  </>
                ) : (
                  "Confirmar y cerrar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

