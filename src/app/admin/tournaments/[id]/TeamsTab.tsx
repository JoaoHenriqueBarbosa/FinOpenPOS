"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2Icon, PlusIcon, TrashIcon, LockIcon, ChevronsUpDown, CheckIcon, CalendarIcon, EditIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, GripVerticalIcon, SaveIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TeamScheduleRestrictionsDialog } from "@/components/team-schedule-restrictions-dialog";

import type { PlayerDTO } from "@/models/dto/player";
import type { TeamDTO, TournamentDTO, GroupsApiResponse, TeamPlayer } from "@/models/dto/tournament";
import { tournamentsService, playersService } from "@/services";

// Fetch functions para React Query
async function fetchTournamentTeams(tournamentId: number): Promise<TeamDTO[]> {
  return tournamentsService.getTeams(tournamentId);
}

async function fetchPlayers(): Promise<PlayerDTO[]> {
  return playersService.getAll();
}

async function fetchTournamentGroups(tournamentId: number): Promise<GroupsApiResponse> {
  return tournamentsService.getGroups(tournamentId);
}

export default function TeamsTab({ tournament }: { tournament: Pick<TournamentDTO, "id" | "status" | "match_duration"> }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);

  const [player1Id, setPlayer1Id] = useState<string>("none");
  const [player2Id, setPlayer2Id] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [player1Open, setPlayer1Open] = useState(false);
  const [player2Open, setPlayer2Open] = useState(false);
  const [player1PopoverWidth, setPlayer1PopoverWidth] = useState(0);
  const [player2PopoverWidth, setPlayer2PopoverWidth] = useState(0);
  const [player1Search, setPlayer1Search] = useState("");
  const [player2Search, setPlayer2Search] = useState("");
  const [restrictionsDialogOpen, setRestrictionsDialogOpen] = useState(false);
  const [selectedTeamForRestrictions, setSelectedTeamForRestrictions] = useState<TeamDTO | null>(null);
  const [closingStatus, setClosingStatus] = useState<string | null>(null);
  
  // Estado para edición de parejas
  const [editingTeam, setEditingTeam] = useState<TeamDTO | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPlayer1Id, setEditPlayer1Id] = useState<string>("none");
  const [editPlayer2Id, setEditPlayer2Id] = useState<string>("none");
  const [editPlayer1Open, setEditPlayer1Open] = useState(false);
  const [editPlayer2Open, setEditPlayer2Open] = useState(false);
  const [editPlayer1Search, setEditPlayer1Search] = useState("");
  const [editPlayer2Search, setEditPlayer2Search] = useState("");
  const [editPlayer1PopoverWidth, setEditPlayer1PopoverWidth] = useState(0);
  const [editPlayer2PopoverWidth, setEditPlayer2PopoverWidth] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Estado local para el orden de equipos (no se guarda hasta que se presione "Guardar orden")
  const [localTeamsOrder, setLocalTeamsOrder] = useState<TeamDTO[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  
  // Debounce search terms para edición
  const debouncedEditPlayer1Search = useDebounce(editPlayer1Search, 300);
  const debouncedEditPlayer2Search = useDebounce(editPlayer2Search, 300);
  
  // Debounce search terms para evitar filtros costosos en cada keystroke
  const debouncedPlayer1Search = useDebounce(player1Search, 300);
  const debouncedPlayer2Search = useDebounce(player2Search, 300);

  // React Query para compartir cache entre componentes
  const {
    data: teams = [],
    isLoading: loadingTeams,
  } = useQuery({
    queryKey: ["tournament-teams", tournament.id],
    queryFn: () => fetchTournamentTeams(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

  const {
    data: players = [],
    isLoading: loadingPlayers,
  } = useQuery({
    queryKey: ["players"], // Mismo key que otros componentes para compartir cache
    queryFn: fetchPlayers,
    staleTime: 1000 * 60 * 5, // 5 minutos - los players no cambian frecuentemente
  });

  const {
    data: groupsData,
    isLoading: loadingGroups,
  } = useQuery({
    queryKey: ["tournament-groups", tournament.id], // Mismo key que GroupsTab
    queryFn: () => fetchTournamentGroups(tournament.id),
    staleTime: 1000 * 30, // 30 segundos
  });

  // Horarios disponibles ahora se generan on the fly durante la revisión de horarios (no se guardan)
  const availableSchedules: any[] = []; // Array vacío para el diálogo de restricciones

  const hasGroups = groupsData?.groups && groupsData.groups.length > 0;
  const loading = loadingTeams || loadingPlayers || loadingGroups;

  // Calcular clave de sincronización basada en IDs de equipos
  const teamsIdsKey = useMemo(() => teams.map(t => t.id).sort().join(','), [teams]);

  // Sincronizar orden local con equipos del servidor
  useEffect(() => {
    if (teams.length === 0) {
      setLocalTeamsOrder([]);
      setHasOrderChanges(false);
      return;
    }

    // Inicializar orden local solo la primera vez
    if (localTeamsOrder.length === 0) {
      const sorted = [...teams].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setLocalTeamsOrder(sorted.map((team, index) => ({ ...team, display_order: index })));
      return;
    }

    // Solo sincronizar si cambió la lista de IDs (agregado/eliminado equipo)
    const localTeamIds = localTeamsOrder.map(t => t.id).sort().join(',');
    
    if (localTeamIds !== teamsIdsKey) {
      if (hasOrderChanges) {
        // Si hay cambios locales pendientes, mantener el orden pero actualizar equipos
        const serverTeamMap = new Map(teams.map(t => [t.id, t]));
        
        // Mantener equipos existentes en su orden actual
        const updated = localTeamsOrder
          .filter(localTeam => serverTeamMap.has(localTeam.id))
          .map(localTeam => {
            const serverTeam = serverTeamMap.get(localTeam.id);
            return serverTeam ? { ...serverTeam, display_order: localTeam.display_order } : localTeam;
          });
        
        // Agregar nuevos equipos al final
        const localIds = new Set(updated.map(t => t.id));
        teams
          .filter(t => !localIds.has(t.id))
          .forEach(team => {
            updated.push({ ...team, display_order: updated.length });
          });
        
        // Reasignar display_order secuencialmente
        updated.forEach((team, index) => {
          team.display_order = index;
        });
        
        setLocalTeamsOrder(updated);
      } else {
        // Si no hay cambios locales, sincronizar completamente
        const sorted = [...teams].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setLocalTeamsOrder(sorted.map((team, index) => ({ ...team, display_order: index })));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsIdsKey, hasOrderChanges]);

  const fullName = (p: PlayerDTO | TeamPlayer | { first_name?: string; last_name?: string } | undefined | null) => {
    if (!p || !p.first_name || !p.last_name) return "Jugador desconocido";
    return `${p.first_name} ${p.last_name}`;
  };

  // Filtrar jugadores por búsqueda (subcadena en nombre o apellido)
  // Usa useMemo para memoizar los resultados filtrados
  const filteredPlayers1 = useMemo(() => {
    if (!debouncedPlayer1Search.trim()) return players;
    const searchLower = debouncedPlayer1Search.toLowerCase().trim();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        fullName(p).toLowerCase().includes(searchLower)
    );
  }, [players, debouncedPlayer1Search]);

  const filteredPlayers2 = useMemo(() => {
    if (!debouncedPlayer2Search.trim()) return players;
    const searchLower = debouncedPlayer2Search.toLowerCase().trim();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        fullName(p).toLowerCase().includes(searchLower)
    );
  }, [players, debouncedPlayer2Search]);

  // Filtrar jugadores para edición
  const filteredEditPlayers1 = useMemo(() => {
    if (!debouncedEditPlayer1Search.trim()) return players;
    const searchLower = debouncedEditPlayer1Search.toLowerCase().trim();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        fullName(p).toLowerCase().includes(searchLower)
    );
  }, [players, debouncedEditPlayer1Search]);

  const filteredEditPlayers2 = useMemo(() => {
    if (!debouncedEditPlayer2Search.trim()) return players;
    const searchLower = debouncedEditPlayer2Search.toLowerCase().trim();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        fullName(p).toLowerCase().includes(searchLower)
    );
  }, [players, debouncedEditPlayer2Search]);

  const handleCreate = useCallback(async () => {
    if (player1Id === "none" || player2Id === "none") return;
    if (player1Id === player2Id) return;

    try {
      setCreating(true);
      setError(null);
      await tournamentsService.createTeam(tournament.id, {
        player1_id: Number(player1Id),
        player2_id: Number(player2Id),
      });
      // Invalidar cache para refrescar teams (el useEffect se encargará de sincronizar el orden local)
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      setDialogOpen(false);
      setPlayer1Id("none");
      setPlayer2Id("none");
      setError(null);
      // Resetear cambios de orden pendientes cuando se agrega un nuevo equipo
      setHasOrderChanges(false);
    } catch (err: any) {
      console.error(err);
      // El service ya extrae el mensaje de error de la API
      setError(err.message || "Error al crear el equipo");
    } finally {
      setCreating(false);
    }
  }, [player1Id, player2Id, tournament.id, queryClient]);

  const handleDelete = async (teamId: number) => {
    try {
      await tournamentsService.deleteTeam(tournament.id, teamId);
      // Actualizar orden local removiendo el equipo eliminado
      const updated = localTeamsOrder.filter(t => t.id !== teamId);
      updated.forEach((team, index) => {
        team.display_order = index;
      });
      setLocalTeamsOrder(updated);
      setHasOrderChanges(updated.length > 0);
      // Invalidar cache para refrescar teams
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      toast.success("Equipo eliminado correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al eliminar el equipo");
    }
  };

  const handleSaveRestrictions = async (
    restrictedSchedules: Array<{ date: string; start_time: string; end_time: string }>,
    scheduleNotes?: string | null
  ) => {
    if (!selectedTeamForRestrictions) return;
    
    try {
      await tournamentsService.updateTeamRestrictions(
        tournament.id,
        selectedTeamForRestrictions.id,
        restrictedSchedules,
        scheduleNotes
      );
      // Invalidar cache para refrescar teams
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      setSelectedTeamForRestrictions(null);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Filtrar equipos para cálculos (excluir suplentes) - usar orden local si hay cambios
  const teamsToUse = hasOrderChanges && localTeamsOrder.length > 0 ? localTeamsOrder : teams;
  const activeTeams = useMemo(() => teamsToUse.filter(t => !t.is_substitute), [teamsToUse]);

  // Abrir diálogo de edición
  const handleEdit = (team: TeamDTO) => {
    if (!team.player1 || !team.player2) {
      toast.error("No se puede editar un equipo con jugadores faltantes");
      return;
    }
    setEditingTeam(team);
    setEditPlayer1Id(String(team.player1.id));
    setEditPlayer2Id(String(team.player2.id));
    setEditPlayer1Search("");
    setEditPlayer2Search("");
    setEditError(null);
    setEditDialogOpen(true);
  };

  // Guardar edición
  const handleUpdate = useCallback(async () => {
    if (!editingTeam) return;
    if (editPlayer1Id === "none" || editPlayer2Id === "none") return;
    if (editPlayer1Id === editPlayer2Id) {
      setEditError("Los jugadores deben ser diferentes");
      return;
    }

    try {
      setUpdating(true);
      setEditError(null);
      await tournamentsService.updateTeam(tournament.id, editingTeam.id, {
        player1_id: Number(editPlayer1Id),
        player2_id: Number(editPlayer2Id),
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      setEditDialogOpen(false);
      setEditingTeam(null);
      setEditPlayer1Id("none");
      setEditPlayer2Id("none");
      setEditError(null);
      toast.success("Equipo actualizado correctamente");
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Error al actualizar el equipo");
    } finally {
      setUpdating(false);
    }
  }, [editPlayer1Id, editPlayer2Id, editingTeam, tournament.id, queryClient]);

  // Reordenar equipo localmente (mover arriba)
  const handleMoveUp = (teamId: number) => {
    const currentIndex = localTeamsOrder.findIndex(t => t.id === teamId);
    if (currentIndex <= 0) return;
    
    const newOrder = [...localTeamsOrder];
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
    
    // Actualizar display_order en el nuevo orden
    newOrder.forEach((team, index) => {
      team.display_order = index;
    });
    
    setLocalTeamsOrder(newOrder);
    setHasOrderChanges(true);
  };

  // Reordenar equipo localmente (mover abajo)
  const handleMoveDown = (teamId: number) => {
    const currentIndex = localTeamsOrder.findIndex(t => t.id === teamId);
    if (currentIndex < 0 || currentIndex >= localTeamsOrder.length - 1) return;
    
    const newOrder = [...localTeamsOrder];
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
    
    // Actualizar display_order en el nuevo orden
    newOrder.forEach((team, index) => {
      team.display_order = index;
    });
    
    setLocalTeamsOrder(newOrder);
    setHasOrderChanges(true);
  };

  // Guardar orden de todos los equipos
  const handleSaveOrder = async () => {
    if (!hasOrderChanges || localTeamsOrder.length === 0) return;

    try {
      setSavingOrder(true);
      const teamOrders = localTeamsOrder.map((team, index) => ({
        teamId: team.id,
        display_order: index,
      }));
      
      const updatedTeams = await tournamentsService.updateTeamOrder(tournament.id, teamOrders);
      // Actualizar el estado local con los equipos actualizados del servidor
      if (updatedTeams && updatedTeams.length > 0) {
        const sorted = [...updatedTeams].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setLocalTeamsOrder(sorted.map((team, index) => ({ ...team, display_order: index })));
      }
      setHasOrderChanges(false);
      // Invalidar cache para refrescar en otros componentes
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      toast.success("Orden de equipos guardado correctamente");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar el orden de los equipos");
    } finally {
      setSavingOrder(false);
    }
  };

  // Marcar como suplente
  const handleToggleSubstitute = async (team: TeamDTO) => {
    try {
      await tournamentsService.updateTeam(tournament.id, team.id, {
        is_substitute: !team.is_substitute,
      });
      queryClient.invalidateQueries({ queryKey: ["tournament-teams", tournament.id] });
      toast.success(team.is_substitute ? "Equipo marcado como activo" : "Equipo marcado como suplente");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al actualizar el equipo");
    }
  };

  // Calcular cantidad exacta de partidos según el formato
  const calculateMatchCount = () => {
    if (activeTeams.length < 3) return 0;
    
    const N = activeTeams.length;
    
    // Calcular tamaños de grupos (misma lógica que en close-registration)
    let baseGroups = Math.floor(N / 3);
    const remainder = N % 3;
    
    if (baseGroups === 0) {
      baseGroups = 1;
    }
    
    const groupSizes: number[] = new Array(baseGroups).fill(3);
    
    if (remainder === 1 && baseGroups >= 1) {
      groupSizes[0] = 4;
    } else if (remainder === 2) {
      if (baseGroups >= 2) {
        groupSizes[0] = 4;
        groupSizes[1] = 4;
      } else if (baseGroups === 1) {
        groupSizes[0] = 4;
      }
    }
    
    // Calcular partidos por grupo
    // Zonas de 3: 3 partidos (round-robin)
    // Zonas de 4: 4 partidos (nuevo formato)
    let totalMatches = 0;
    for (const size of groupSizes) {
      if (size === 3) {
        totalMatches += 3; // Round-robin: todos contra todos
      } else if (size === 4) {
        totalMatches += 4; // Nuevo formato: 1vs4, 2vs3, ganadores, perdedores
      }
    }
    
    return totalMatches;
  };

  const matchCount = calculateMatchCount();

  // Calcular información de grupos que se generarán
  const calculateGroupsInfo = useMemo(() => {
    if (activeTeams.length < 3) {
      return { totalGroups: 0, groupsOf3: 0, groupsOf4: 0, groupNames: [] };
    }
    
    const N = activeTeams.length;
    let baseGroups = Math.floor(N / 3);
    const remainder = N % 3;
    
    if (baseGroups === 0) {
      baseGroups = 1;
    }
    
    const groupSizes: number[] = new Array(baseGroups).fill(3);
    
    if (remainder === 1 && baseGroups >= 1) {
      groupSizes[0] = 4;
    } else if (remainder === 2) {
      if (baseGroups >= 2) {
        groupSizes[0] = 4;
        groupSizes[1] = 4;
      } else if (baseGroups === 1) {
        groupSizes[0] = 4;
      }
    }
    
    const groupsOf3 = groupSizes.filter(s => s === 3).length;
    const groupsOf4 = groupSizes.filter(s => s === 4).length;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const groupNames = groupSizes.map((_, i) => `Zona ${letters[i] ?? String(i + 1)}`);
    
    return { totalGroups: groupSizes.length, groupsOf3, groupsOf4, groupNames };
  }, [activeTeams.length]);

  // Los slots de horario se calculan on the fly durante la revisión de horarios

  const handleCloseRegistration = async () => {
    try {
      setClosing(true);
      setClosingStatus("Creando grupos...");
      
      setClosingStatus("Generando zonas y partidos...");
      await tournamentsService.closeRegistration(tournament.id);
      setClosingStatus("¡Inscripción cerrada exitosamente!");
      
      // Esperar un momento para que el usuario vea el mensaje de éxito
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recargar la página
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setClosingStatus(null);
      alert(err.message || "Error al cerrar la inscripción");
    } finally {
      setClosing(false);
      setClosingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2Icon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0 pb-2 flex items-center justify-between">
        <div className="flex-1">
          <CardTitle>Equipos</CardTitle>
          <CardDescription>
            Armá las parejas del torneo. Luego cerrá la inscripción para generar
            las zonas automáticamente.
          </CardDescription>
          
          {/* Resumen */}
          {teams.length > 0 && (
            <div className="mt-3 p-3 bg-muted/50 rounded-md space-y-3 text-sm">
              <div className="flex gap-4 items-center">
                <div>
                  <span className="text-muted-foreground">Equipos activos:</span>{" "}
                  <span className="font-medium">{activeTeams.length}</span>
                </div>
                {teams.filter(t => t.is_substitute).length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Suplentes:</span>{" "}
                    <span className="font-medium">{teams.filter(t => t.is_substitute).length}</span>
                  </div>
                )}
                {tournament.status === "draft" && !hasGroups && hasOrderChanges && (
                  <div className="ml-auto">
                    <span className="text-xs text-blue-600 font-medium">
                      * Hay cambios en el orden sin guardar
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Zonas a generar:</span>{" "}
                  <span className="font-medium">
                    {calculateGroupsInfo.totalGroups > 0 ? (
                      <>
                        {calculateGroupsInfo.totalGroups} (
                        {calculateGroupsInfo.groupsOf3 > 0 && `${calculateGroupsInfo.groupsOf3} de 3`}
                        {calculateGroupsInfo.groupsOf3 > 0 && calculateGroupsInfo.groupsOf4 > 0 && ", "}
                        {calculateGroupsInfo.groupsOf4 > 0 && `${calculateGroupsInfo.groupsOf4} de 4`}
                        )
                      </>
                    ) : (
                      "0"
                    )}
                  </span>
                  {calculateGroupsInfo.groupNames.length > 0 && (
                    <div className="text-muted-foreground mt-1">
                      {calculateGroupsInfo.groupNames.join(", ")}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Slots disponibles:</span>{" "}
                  <span className="font-medium text-muted-foreground">
                    Se configurarán durante la revisión de horarios
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleCloseRegistration}
            disabled={tournament.status !== "draft" || activeTeams.length < 3 || closing}
          >
            {closing && (
              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
            )}
            <LockIcon className="w-4 h-4 mr-1" />
            Cerrar inscripción
          </Button>
          {tournament.status === "draft" && !hasGroups && teams.length > 1 && (
            <Button
              size="sm"
              variant={hasOrderChanges ? "default" : "outline"}
              onClick={handleSaveOrder}
              disabled={!hasOrderChanges || savingOrder}
              className={hasOrderChanges ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {savingOrder ? (
                <>
                  <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4 mr-1" />
                  Guardar orden{hasOrderChanges && " *"}
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={tournament.status !== "draft"}
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Agregar equipo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay equipos cargados todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {teamsToUse.map((team, index) => {
              // Validar que el equipo tenga jugadores válidos
              if (!team.player1 || !team.player2) {
                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between border rounded-md px-3 py-2 bg-red-50 border-red-200"
                  >
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-red-700">Equipo inválido (ID: {team.id})</span>
                      <span className="text-xs text-red-600">
                        Faltan datos de jugadores. Por favor, elimina y recrea este equipo.
                      </span>
                    </div>
                    {tournament.status === "draft" && !hasGroups && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(team.id)}
                        title="Eliminar equipo inválido"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                );
              }
              
              const canMoveUp = index > 0;
              const canMoveDown = index < teamsToUse.length - 1;
              
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between border rounded-md px-3 py-2 ${team.is_substitute ? 'bg-muted/30 opacity-75' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {tournament.status === "draft" && !hasGroups && (
                      <div className="flex items-center gap-1">
                        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveUp(team.id)}
                            disabled={!canMoveUp}
                            title="Mover arriba"
                          >
                            <ArrowUpIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveDown(team.id)}
                            disabled={!canMoveDown}
                            title="Mover abajo"
                          >
                            <ArrowDownIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col text-sm flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {team.display_name ??
                            `${fullName(team.player1)} / ${fullName(team.player2)}`}
                        </span>
                        {team.is_substitute && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full font-medium">
                            Suplente
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {fullName(team.player1)} &middot; {fullName(team.player2)}
                      </span>
                      {team.schedule_notes && (
                        <span className="text-xs text-muted-foreground mt-1 italic">
                          📅 {team.schedule_notes}
                        </span>
                      )}
                    </div>
                  </div>
                  {tournament.status === "draft" && !hasGroups && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                        title="Editar pareja"
                      >
                        <EditIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTeamForRestrictions(team);
                          setRestrictionsDialogOpen(true);
                        }}
                        title="Editar restricciones horarias"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        <Checkbox
                          id={`substitute-${team.id}`}
                          checked={team.is_substitute}
                          onCheckedChange={() => handleToggleSubstitute(team)}
                        />
                        <Label
                          htmlFor={`substitute-${team.id}`}
                          className="text-xs cursor-pointer"
                          title="Marcar como suplente (no se incluirá en la generación del torneo)"
                        >
                          Suplente
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(team.id)}
                        title="Eliminar equipo"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {tournament.status === "draft" && hasGroups && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(team.id)}
                      disabled
                      title="No se pueden editar equipos después de generar grupos"
                    >
                      <LockIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setError(null);
            setPlayer1Id("none");
            setPlayer2Id("none");
            setPlayer1Search("");
            setPlayer2Search("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Jugador 1</Label>
              <Popover open={player1Open} onOpenChange={setPlayer1Open}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={player1Open}
                    className="w-full justify-between"
                    ref={(element) => {
                      if (element) {
                        setPlayer1PopoverWidth(element.offsetWidth);
                      }
                    }}
                  >
                    {player1Id !== "none"
                      ? fullName(players.find((p) => String(p.id) === player1Id))
                      : "Elegí un jugador..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0" 
                  align="start"
                  style={{ width: player1PopoverWidth || "var(--radix-popover-trigger-width)" }}
                >
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar por nombre o apellido..." 
                      value={player1Search}
                      onValueChange={setPlayer1Search}
                    />
                    <CommandList>
                      {filteredPlayers1.length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredPlayers1.map((player) => (
                            <CommandItem
                              key={player.id}
                              value={`${player.first_name} ${player.last_name}`}
                              onSelect={() => {
                                setPlayer1Id(String(player.id));
                                setPlayer1Open(false);
                                setPlayer1Search("");
                                setError(null);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  player1Id === String(player.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fullName(player)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Jugador 2</Label>
              <Popover open={player2Open} onOpenChange={setPlayer2Open}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={player2Open}
                    className="w-full justify-between"
                    ref={(element) => {
                      if (element) {
                        setPlayer2PopoverWidth(element.offsetWidth);
                      }
                    }}
                  >
                    {player2Id !== "none"
                      ? fullName(players.find((p) => String(p.id) === player2Id))
                      : "Elegí un jugador..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0" 
                  align="start"
                  style={{ width: player2PopoverWidth || "var(--radix-popover-trigger-width)" }}
                >
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar por nombre o apellido..." 
                      value={player2Search}
                      onValueChange={setPlayer2Search}
                    />
                    <CommandList>
                      {filteredPlayers2.length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredPlayers2.map((player) => (
                            <CommandItem
                              key={player.id}
                              value={`${player.first_name} ${player.last_name}`}
                              onSelect={() => {
                                setPlayer2Id(String(player.id));
                                setPlayer2Open(false);
                                setPlayer2Search("");
                                setError(null);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  player2Id === String(player.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fullName(player)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                player1Id === "none" ||
                player2Id === "none" ||
                player1Id === player2Id
              }
            >
              {creating && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo de edición de pareja */}
      <Dialog 
        open={editDialogOpen} 
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditError(null);
            setEditingTeam(null);
            setEditPlayer1Id("none");
            setEditPlayer2Id("none");
            setEditPlayer1Search("");
            setEditPlayer2Search("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Jugador 1</Label>
              <Popover open={editPlayer1Open} onOpenChange={setEditPlayer1Open}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editPlayer1Open}
                    className="w-full justify-between"
                    ref={(element) => {
                      if (element) {
                        setEditPlayer1PopoverWidth(element.offsetWidth);
                      }
                    }}
                  >
                    {editPlayer1Id !== "none"
                      ? fullName(players.find((p) => String(p.id) === editPlayer1Id))
                      : "Elegí un jugador..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0" 
                  align="start"
                  style={{ width: editPlayer1PopoverWidth || "var(--radix-popover-trigger-width)" }}
                >
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar por nombre o apellido..." 
                      value={editPlayer1Search}
                      onValueChange={setEditPlayer1Search}
                    />
                    <CommandList>
                      {filteredEditPlayers1.length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredEditPlayers1.map((player) => (
                            <CommandItem
                              key={player.id}
                              value={`${player.first_name} ${player.last_name}`}
                              onSelect={() => {
                                setEditPlayer1Id(String(player.id));
                                setEditPlayer1Open(false);
                                setEditPlayer1Search("");
                                setEditError(null);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editPlayer1Id === String(player.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fullName(player)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label>Jugador 2</Label>
              <Popover open={editPlayer2Open} onOpenChange={setEditPlayer2Open}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editPlayer2Open}
                    className="w-full justify-between"
                    ref={(element) => {
                      if (element) {
                        setEditPlayer2PopoverWidth(element.offsetWidth);
                      }
                    }}
                  >
                    {editPlayer2Id !== "none"
                      ? fullName(players.find((p) => String(p.id) === editPlayer2Id))
                      : "Elegí un jugador..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="p-0" 
                  align="start"
                  style={{ width: editPlayer2PopoverWidth || "var(--radix-popover-trigger-width)" }}
                >
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar por nombre o apellido..." 
                      value={editPlayer2Search}
                      onValueChange={setEditPlayer2Search}
                    />
                    <CommandList>
                      {filteredEditPlayers2.length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredEditPlayers2.map((player) => (
                            <CommandItem
                              key={player.id}
                              value={`${player.first_name} ${player.last_name}`}
                              onSelect={() => {
                                setEditPlayer2Id(String(player.id));
                                setEditPlayer2Open(false);
                                setEditPlayer2Search("");
                                setEditError(null);
                              }}
                            >
                              <CheckIcon
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editPlayer2Id === String(player.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {fullName(player)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {editError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">{editError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdate}
              disabled={
                updating ||
                editPlayer1Id === "none" ||
                editPlayer2Id === "none" ||
                editPlayer1Id === editPlayer2Id
              }
            >
              {updating && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <TeamScheduleRestrictionsDialog
        open={restrictionsDialogOpen}
        onOpenChange={(open) => {
          setRestrictionsDialogOpen(open);
          if (!open) {
            setSelectedTeamForRestrictions(null);
          }
        }}
        team={selectedTeamForRestrictions}
        availableSchedules={availableSchedules}
        onSave={handleSaveRestrictions}
      />
    </Card>
  );
}
