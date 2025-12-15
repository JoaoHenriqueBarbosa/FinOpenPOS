"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Loader2Icon, PlusIcon, TrashIcon, LockIcon, ChevronsUpDown, CheckIcon } from "lucide-react";
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
import { TournamentScheduleDialog, ScheduleConfig } from "@/components/tournament-schedule-dialog";

type Tournament = {
  id: number;
  status: string;
  match_duration: number;
};

type Player = {
  id: number;
  first_name: string;
  last_name: string;
};

type Team = {
  id: number;
  display_name: string | null;
  player1: { id: number; first_name: string; last_name: string };
  player2: { id: number; first_name: string; last_name: string };
};

export default function TeamsTab({ tournament }: { tournament: Tournament }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hasGroups, setHasGroups] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  const [player1Id, setPlayer1Id] = useState<string>("none");
  const [player2Id, setPlayer2Id] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);
  const [player1Open, setPlayer1Open] = useState(false);
  const [player2Open, setPlayer2Open] = useState(false);
  const [player1PopoverWidth, setPlayer1PopoverWidth] = useState(0);
  const [player2PopoverWidth, setPlayer2PopoverWidth] = useState(0);
  const [player1Search, setPlayer1Search] = useState("");
  const [player2Search, setPlayer2Search] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamsRes, playersRes, groupsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournament.id}/teams`),
          fetch("/api/players"), // adaptá si usás /api/customers
          fetch(`/api/tournaments/${tournament.id}/groups`),
        ]);
        if (teamsRes.ok) {
          setTeams(await teamsRes.json());
        }
        if (playersRes.ok) {
          setPlayers(await playersRes.json());
        }
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setHasGroups(groupsData.groups && groupsData.groups.length > 0);
        }
      } catch (err) {
        console.error("Error fetching teams/players:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournament.id]);

  const fullName = (p: Player) => `${p.first_name} ${p.last_name}`;

  // Filtrar jugadores por búsqueda (subcadena en nombre o apellido)
  const filterPlayers = (search: string) => {
    if (!search.trim()) return players;
    const searchLower = search.toLowerCase().trim();
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        fullName(p).toLowerCase().includes(searchLower)
    );
  };

  const handleCreate = useCallback(async () => {
    if (player1Id === "none" || player2Id === "none") return;
    if (player1Id === player2Id) return;

    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`/api/tournaments/${tournament.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1_id: Number(player1Id),
          player2_id: Number(player2Id),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Error al crear el equipo");
        return;
      }

      const created = await res.json();
      setTeams((prev) => [...prev, created]);
      setDialogOpen(false);
      setPlayer1Id("none");
      setPlayer2Id("none");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  }, [player1Id, player2Id, tournament.id]);

  const handleDelete = async (teamId: number) => {
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.id}/teams?teamId=${teamId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        console.error("Error deleting team");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
    } catch (err) {
      console.error(err);
    }
  };

  // Calcular cantidad exacta de partidos según el formato
  const calculateMatchCount = () => {
    if (teams.length < 3) return 0;
    
    const N = teams.length;
    
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

  const handleCloseRegistration = async (scheduleConfig?: ScheduleConfig) => {
    try {
      setClosing(true);
      const res = await fetch(
        `/api/tournaments/${tournament.id}/close-registration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleConfig || {}),
        }
      );
      if (!res.ok) {
        console.error("Error closing registration");
        return;
      }
      // podrías recargar torneo / página
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setClosing(false);
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
        <div>
          <CardTitle>Equipos</CardTitle>
          <CardDescription>
            Armá las parejas del torneo. Luego cerrá la inscripción para generar
            las zonas automáticamente.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={
              tournament.status !== "draft" || teams.length < 3 || closing || hasGroups
            }
            onClick={() => setScheduleDialogOpen(true)}
          >
            {closing && (
              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
            )}
            <LockIcon className="w-4 h-4 mr-1" />
            Cerrar inscripción
          </Button>
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
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <div className="flex flex-col text-sm">
                  <span className="font-medium">
                    {team.display_name ??
                      `${team.player1.first_name} ${team.player1.last_name} / ${team.player2.first_name} ${team.player2.last_name}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {team.player1.first_name} {team.player1.last_name} &middot;{" "}
                    {team.player2.first_name} {team.player2.last_name}
                  </span>
                </div>
                {tournament.status === "draft" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(team.id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
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
                      ? fullName(players.find((p) => String(p.id) === player1Id)!)
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
                      {filterPlayers(player1Search).length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filterPlayers(player1Search).map((player) => (
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
                      ? fullName(players.find((p) => String(p.id) === player2Id)!)
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
                      {filterPlayers(player2Search).length === 0 ? (
                        <CommandEmpty>No se encontró ningún jugador.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filterPlayers(player2Search).map((player) => (
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

      <TournamentScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onConfirm={handleCloseRegistration}
        matchCount={matchCount}
        tournamentMatchDuration={tournament.match_duration}
      />
    </Card>
  );
}
