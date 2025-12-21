"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, ArrowLeftRightIcon, CheckIcon, XIcon, UndoIcon } from "lucide-react";
import { formatDate, formatTime } from "@/lib/date-utils";
import { parseLocalDate } from "@/lib/court-slots-utils";
import type { MatchDTO, TeamDTO, GroupDTO } from "@/models/dto/tournament";
import type { CourtDTO } from "@/models/dto/court";
import { useQuery } from "@tanstack/react-query";
import { tournamentMatchesService } from "@/services";

interface GroupScheduleViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: MatchDTO[];
  groups: GroupDTO[];
  tournamentId: number;
  onScheduleUpdated?: () => void;
}

function teamLabel(team: TeamDTO | null, matchOrder?: number | null, isTeam1?: boolean) {
  if (!team) {
    if (matchOrder === 3) {
      return isTeam1 ? "GANADOR 1" : "GANADOR 2";
    } else if (matchOrder === 4) {
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

// Calcular diferencia en minutos entre dos horarios
function calculateTimeDiff(
  date1: string | null,
  time1: string | null,
  date2: string | null,
  time2: string | null
): number | null {
  if (!date1 || !time1 || !date2 || !time2) return null;
  
  const d1 = parseLocalDate(date1);
  const [h1, m1] = time1.split(":").map(Number);
  d1.setHours(h1, m1, 0, 0);
  
  const d2 = parseLocalDate(date2);
  const [h2, m2] = time2.split(":").map(Number);
  d2.setHours(h2, m2, 0, 0);
  
  return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60); // diferencia en minutos
}

// Formatear minutos a texto legible
function formatTimeDiff(minutes: number | null): string {
  if (minutes === null) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

export function GroupScheduleViewer({
  open,
  onOpenChange,
  matches,
  groups,
  tournamentId,
  onScheduleUpdated,
}: GroupScheduleViewerProps) {
  const queryClient = useQueryClient();
  const [selectedMatch1, setSelectedMatch1] = useState<number | null>(null);
  const [selectedMatch2, setSelectedMatch2] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [lastSwap, setLastSwap] = useState<{
    match1Id: number;
    match2Id: number;
    match1Original: { date: string; start_time: string; end_time: string | null };
    match2Original: { date: string; start_time: string; end_time: string | null };
  } | null>(null);

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

  // Crear mapa de grupo id -> nombre e índice
  const groupMap = new Map<number, { name: string; index: number }>();
  // Ordenar grupos por group_order o nombre para consistencia
  const sortedGroups = [...groups].sort((a, b) => {
    if (a.group_order !== undefined && b.group_order !== undefined) {
      return a.group_order - b.group_order;
    }
    return a.name.localeCompare(b.name);
  });
  sortedGroups.forEach((g, index) => {
    groupMap.set(g.id, { name: g.name, index });
  });

  // Filtrar solo partidos con horarios asignados y ordenarlos
  const scheduledMatches = useMemo(() => {
    return matches
      .filter((m) => m.match_date && m.start_time)
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
  }, [matches]);

  // Calcular diferencias de tiempo para cada partido (mínima y máxima diferencia con otro partido del mismo equipo en el mismo día)
  const matchTimeDiffs = useMemo(() => {
    const diffs = new Map<number, { minDiff: number | null; maxDiff: number | null; teamWithMaxDiff: 'team1' | 'team2' | null }>(); // matchId -> { minDiff, maxDiff, teamWithMaxDiff }
    
    scheduledMatches.forEach((match) => {
      if (!match.team1?.id || !match.team2?.id || !match.match_date || !match.start_time) {
        diffs.set(match.id, { minDiff: null, maxDiff: null, teamWithMaxDiff: null });
        return;
      }
      
      const team1Id = match.team1.id;
      const team2Id = match.team2.id;
      let minDiff: number | null = null;
      let team1MaxDiff: number | null = null;
      let team2MaxDiff: number | null = null;
      
      // Buscar otros partidos del mismo equipo en el mismo día
      scheduledMatches.forEach((otherMatch) => {
        if (otherMatch.id === match.id) return;
        if (otherMatch.match_date !== match.match_date) return;
        if (!otherMatch.start_time) return;
        
        // Verificar si alguno de los equipos del match actual juega en otherMatch
        const team1Plays = otherMatch.team1?.id === team1Id || otherMatch.team2?.id === team1Id;
        const team2Plays = otherMatch.team1?.id === team2Id || otherMatch.team2?.id === team2Id;
        
        if (team1Plays || team2Plays) {
          const diff = calculateTimeDiff(
            match.match_date,
            match.start_time,
            otherMatch.match_date,
            otherMatch.start_time
          );
          
          if (diff !== null) {
            // Actualizar mínima diferencia
            if (minDiff === null || diff < minDiff) {
              minDiff = diff;
            }
            
            // Actualizar máxima diferencia por equipo
            if (team1Plays) {
              if (team1MaxDiff === null || diff > team1MaxDiff) {
                team1MaxDiff = diff;
              }
            }
            if (team2Plays) {
              if (team2MaxDiff === null || diff > team2MaxDiff) {
                team2MaxDiff = diff;
              }
            }
          }
        }
      });
      
      // Determinar la máxima diferencia general y qué equipo la tiene
      let maxDiff: number | null = null;
      let teamWithMaxDiff: 'team1' | 'team2' | null = null;
      
      if (team1MaxDiff !== null && team2MaxDiff !== null) {
        if (team1MaxDiff >= team2MaxDiff) {
          maxDiff = team1MaxDiff;
          teamWithMaxDiff = 'team1';
        } else {
          maxDiff = team2MaxDiff;
          teamWithMaxDiff = 'team2';
        }
      } else if (team1MaxDiff !== null) {
        maxDiff = team1MaxDiff;
        teamWithMaxDiff = 'team1';
      } else if (team2MaxDiff !== null) {
        maxDiff = team2MaxDiff;
        teamWithMaxDiff = 'team2';
      }
      
      diffs.set(match.id, { minDiff, maxDiff, teamWithMaxDiff });
    });
    
    return diffs;
  }, [scheduledMatches]);

  // Calcular si algún equipo del partido juega en días diferentes
  const matchMultiDayInfo = useMemo(() => {
    const info = new Map<number, { team1PlaysMultipleDays: boolean; team2PlaysMultipleDays: boolean }>(); // matchId -> info
    
    scheduledMatches.forEach((match) => {
      if (!match.team1?.id || !match.team2?.id || !match.match_date) {
        info.set(match.id, { team1PlaysMultipleDays: false, team2PlaysMultipleDays: false });
        return;
      }
      
      const team1Id = match.team1.id;
      const team2Id = match.team2.id;
      const matchDate = match.match_date;
      
      const team1Days = new Set<string>();
      const team2Days = new Set<string>();
      
      // Agregar el día del partido actual
      team1Days.add(matchDate);
      team2Days.add(matchDate);
      
      // Buscar otros partidos de los mismos equipos
      scheduledMatches.forEach((otherMatch) => {
        if (!otherMatch.match_date) return;
        
        // Verificar si team1 juega en otherMatch
        if (otherMatch.team1?.id === team1Id || otherMatch.team2?.id === team1Id) {
          team1Days.add(otherMatch.match_date);
        }
        
        // Verificar si team2 juega en otherMatch
        if (otherMatch.team1?.id === team2Id || otherMatch.team2?.id === team2Id) {
          team2Days.add(otherMatch.match_date);
        }
      });
      
      info.set(match.id, {
        team1PlaysMultipleDays: team1Days.size > 1,
        team2PlaysMultipleDays: team2Days.size > 1,
      });
    });
    
    return info;
  }, [scheduledMatches]);


  const handleSelectMatch = (matchId: number) => {
    if (selectedMatch1 === null) {
      setSelectedMatch1(matchId);
    } else if (selectedMatch1 === matchId) {
      setSelectedMatch1(null);
    } else if (selectedMatch2 === null) {
      setSelectedMatch2(matchId);
    } else if (selectedMatch2 === matchId) {
      setSelectedMatch2(null);
    } else {
      // Reemplazar la primera selección
      setSelectedMatch1(matchId);
      setSelectedMatch2(null);
    }
  };

  const handleSwapSchedules = async () => {
    if (!selectedMatch1 || !selectedMatch2) return;
    
    const match1 = scheduledMatches.find((m) => m.id === selectedMatch1);
    const match2 = scheduledMatches.find((m) => m.id === selectedMatch2);
    
    if (!match1 || !match2 || !match1.match_date || !match1.start_time || !match2.match_date || !match2.start_time) {
      alert("Ambos partidos deben tener horarios asignados");
      return;
    }

    try {
      setSwapping(true);
      
      // Guardar estado anterior para undo
      setLastSwap({
        match1Id: selectedMatch1,
        match2Id: selectedMatch2,
        match1Original: {
          date: match1.match_date,
          start_time: match1.start_time,
          end_time: match1.end_time || null,
        },
        match2Original: {
          date: match2.match_date,
          start_time: match2.start_time,
          end_time: match2.end_time || null,
        },
      });
      
      // Intercambiar horarios
      await Promise.all([
        tournamentMatchesService.scheduleMatch(selectedMatch1, {
          date: match2.match_date,
          start_time: match2.start_time,
          end_time: match2.end_time || undefined,
        }),
        tournamentMatchesService.scheduleMatch(selectedMatch2, {
          date: match1.match_date,
          start_time: match1.start_time,
          end_time: match1.end_time || undefined,
        }),
      ]);

      // Limpiar selección
      setSelectedMatch1(null);
      setSelectedMatch2(null);

      // Invalidar cache y recargar
      queryClient.invalidateQueries({ queryKey: ["tournament-groups", tournamentId] });
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al intercambiar horarios");
      setLastSwap(null); // Limpiar undo si hay error
    } finally {
      setSwapping(false);
    }
  };

  const handleUndoSwap = async () => {
    if (!lastSwap) return;

    try {
      setSwapping(true);
      
      // Restaurar horarios originales
      await Promise.all([
        tournamentMatchesService.scheduleMatch(lastSwap.match1Id, {
          date: lastSwap.match1Original.date,
          start_time: lastSwap.match1Original.start_time,
          end_time: lastSwap.match1Original.end_time || undefined,
        }),
        tournamentMatchesService.scheduleMatch(lastSwap.match2Id, {
          date: lastSwap.match2Original.date,
          start_time: lastSwap.match2Original.start_time,
          end_time: lastSwap.match2Original.end_time || undefined,
        }),
      ]);

      // Limpiar estado de undo
      setLastSwap(null);

      // Invalidar cache y recargar
      queryClient.invalidateQueries({ queryKey: ["tournament-groups", tournamentId] });
      if (onScheduleUpdated) {
        onScheduleUpdated();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al deshacer intercambio");
    } finally {
      setSwapping(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedMatch1(null);
    setSelectedMatch2(null);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Limpiar selección y undo al cerrar
      setSelectedMatch1(null);
      setSelectedMatch2(null);
      setLastSwap(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar y editar horarios de partidos</DialogTitle>
          <DialogDescription>
            Seleccioná 2 partidos para intercambiar sus horarios. La métrica muestra la diferencia mínima de tiempo entre partidos del mismo equipo en el mismo día.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de acciones para selección */}
          {(selectedMatch1 || selectedMatch2) && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedMatch1 && selectedMatch2
                  ? "2 partidos seleccionados. ¿Intercambiar horarios?"
                  : "1 partido seleccionado. Seleccioná otro para intercambiar."}
              </span>
              {selectedMatch1 && selectedMatch2 && (
                <>
                  <Button
                    size="sm"
                    onClick={handleSwapSchedules}
                    disabled={swapping}
                    className="ml-auto"
                  >
                    {swapping ? (
                      <>
                        <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                        Intercambiando...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRightIcon className="h-3 w-3 mr-1" />
                        Intercambiar horarios
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelSelection}
                    disabled={swapping}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Barra de acciones para undo */}
          {lastSwap && !selectedMatch1 && !selectedMatch2 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-sm font-medium text-amber-900">
                Último intercambio realizado. ¿Deshacer?
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUndoSwap}
                disabled={swapping}
                className="ml-auto bg-white hover:bg-amber-100"
              >
                {swapping ? (
                  <>
                    <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                    Deshaciendo...
                  </>
                ) : (
                  <>
                    <UndoIcon className="h-3 w-3 mr-1" />
                    Deshacer
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLastSwap(null)}
                disabled={swapping}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Tabla de partidos */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sel.</TableHead>
                  <TableHead className="w-24 min-w-[100px]">Grupo</TableHead>
                  <TableHead>Equipo 1</TableHead>
                  <TableHead>Equipo 2</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead className="text-right">Diff. mín. (mismo equipo)</TableHead>
                  <TableHead className="text-right">Diff. máx. (mismo equipo)</TableHead>
                  <TableHead className="text-center">Juega en días diferentes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledMatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No hay partidos con horarios asignados
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduledMatches.map((match) => {
                    const isSelected1 = selectedMatch1 === match.id;
                    const isSelected2 = selectedMatch2 === match.id;
                    const isSelected = isSelected1 || isSelected2;
                    const diffInfo = matchTimeDiffs.get(match.id) ?? { minDiff: null, maxDiff: null, teamWithMaxDiff: null };
                    const minDiff = diffInfo.minDiff;
                    const maxDiff = diffInfo.maxDiff;
                    const teamWithMaxDiff = diffInfo.teamWithMaxDiff;
                    const multiDayInfo = matchMultiDayInfo.get(match.id) ?? { team1PlaysMultipleDays: false, team2PlaysMultipleDays: false };
                    const hasMultiDayTeam = multiDayInfo.team1PlaysMultipleDays || multiDayInfo.team2PlaysMultipleDays;
                    const groupInfo = match.tournament_group_id
                      ? groupMap.get(match.tournament_group_id)
                      : null;
                    const groupName = groupInfo?.name || "Sin grupo";
                    const groupColor = groupInfo
                      ? getGroupColor(groupInfo.index)
                      : { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200", badgeBg: "bg-gray-200", badgeText: "text-gray-800" };

                    return (
                      <TableRow
                        key={match.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleSelectMatch(match.id)}
                      >
                        <TableCell>
                          {isSelected && (
                            <div className="flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <CheckIcon className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${groupColor.badgeBg} ${groupColor.badgeText} border-0`}>
                            {groupName}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${
                          teamWithMaxDiff === 'team1' ? 'bg-yellow-100 font-bold' : ''
                        }`}>
                          {teamLabel(match.team1, match.match_order, true)}
                        </TableCell>
                        <TableCell className={`font-medium ${
                          teamWithMaxDiff === 'team2' ? 'bg-yellow-100 font-bold' : ''
                        }`}>
                          {teamLabel(match.team2, match.match_order, false)}
                        </TableCell>
                        <TableCell>
                          {match.match_date ? (
                            (() => {
                              const date = parseLocalDate(match.match_date);
                              const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
                              const dayName = dayNames[date.getDay()].toUpperCase();
                              return `${dayName} ${formatDate(match.match_date)}`;
                            })()
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {match.start_time ? (
                            <>
                              {formatTime(match.start_time)}
                              {match.court_id && courtMap.get(match.court_id) && (
                                <span className="text-muted-foreground ml-1">- {courtMap.get(match.court_id)}</span>
                              )}
                            </>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {minDiff !== null ? (
                            <Badge
                              variant={
                                minDiff <= 60 || minDiff > 240 ? "destructive" : // <= 1h o > 4h: rojo
                                minDiff === 240 ? "default" : // 4 horas exactas: amarillo
                                "secondary" // otros valores
                              }
                              className={
                                minDiff <= 60 || minDiff > 240 ? "" : // rojo (destructive)
                                minDiff === 240 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : // amarillo para 4h
                                minDiff >= 120 && minDiff < 180 ? "bg-green-100 text-green-800 border-green-200" : "" // verde para 2-3h
                              }
                            >
                              {formatTimeDiff(minDiff)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {maxDiff !== null ? (
                            <Badge
                              variant={
                                maxDiff <= 60 || maxDiff > 240 ? "destructive" : // <= 1h o > 4h: rojo
                                maxDiff === 240 ? "default" : // 4 horas exactas: amarillo
                                "secondary" // otros valores
                              }
                              className={
                                maxDiff <= 60 || maxDiff > 240 ? "" : // rojo (destructive)
                                maxDiff === 240 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : // amarillo para 4h
                                maxDiff >= 120 && maxDiff < 180 ? "bg-green-100 text-green-800 border-green-200" : "" // verde para 2-3h
                              }
                            >
                              {formatTimeDiff(maxDiff)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasMultiDayTeam ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Sí
                              {multiDayInfo.team1PlaysMultipleDays && multiDayInfo.team2PlaysMultipleDays && " (ambos)"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

