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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2Icon, PlusIcon, TrashIcon, LockIcon } from "lucide-react";
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

  const handleCreate = useCallback(async () => {
    if (player1Id === "none" || player2Id === "none") return;
    if (player1Id === player2Id) return;

    try {
      setCreating(true);
      const res = await fetch(`/api/tournaments/${tournament.id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player1_id: Number(player1Id),
          player2_id: Number(player2Id),
        }),
      });

      if (!res.ok) {
        console.error("Error creating team");
        return;
      }

      const created = await res.json();
      setTeams((prev) => [...prev, created]);
      setDialogOpen(false);
      setPlayer1Id("none");
      setPlayer2Id("none");
    } catch (err) {
      console.error(err);
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

  // Calcular cantidad aproximada de partidos (round robin)
  const calculateMatchCount = () => {
    if (teams.length < 2) return 0;
    // Estimación: cada grupo de 3-4 equipos tiene ~3-6 partidos
    // Asumimos grupos de 3-4 equipos
    const avgGroupSize = 3.5;
    const numGroups = Math.ceil(teams.length / avgGroupSize);
    const matchesPerGroup = 3; // promedio
    return numGroups * matchesPerGroup;
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Jugador 1</Label>
              <Select
                value={player1Id}
                onValueChange={(v) => setPlayer1Id(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un jugador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {fullName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Jugador 2</Label>
              <Select
                value={player2Id}
                onValueChange={(v) => setPlayer2Id(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí un jugador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {fullName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
