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
import { Label } from "@/components/ui/label";
import {
  Switch,
} from "@/components/ui/switch";
import { Loader2Icon, CheckIcon } from "lucide-react";

type Tournament = {
  id: number;
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
  has_super_tiebreak: boolean;
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

function MatchResultForm({
  match,
  onSaved,
}: {
  match: Match;
  onSaved: () => void;
}) {
  const [set1T1, setSet1T1] = useState<string>(
    match.set1_team1_games?.toString() ?? ""
  );
  const [set1T2, setSet1T2] = useState<string>(
    match.set1_team2_games?.toString() ?? ""
  );
  const [set2T1, setSet2T1] = useState<string>(
    match.set2_team1_games?.toString() ?? ""
  );
  const [set2T2, setSet2T2] = useState<string>(
    match.set2_team2_games?.toString() ?? ""
  );
  const [set3T1, setSet3T1] = useState<string>(
    match.set3_team1_games?.toString() ?? ""
  );
  const [set3T2, setSet3T2] = useState<string>(
    match.set3_team2_games?.toString() ?? ""
  );
  const [hasSTB, setHasSTB] = useState<boolean>(!!match.has_super_tiebreak);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const toNum = (v: string) =>
      v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v);

    const sets = [
      { team1: toNum(set1T1), team2: toNum(set1T2) },
      { team1: toNum(set2T1), team2: toNum(set2T2) },
      { team1: toNum(set3T1), team2: toNum(set3T2) },
    ];

    try {
      setSaving(true);
      const res = await fetch(`/api/tournament-matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasSuperTiebreak: hasSTB,
          sets,
        }),
      });
      if (!res.ok) {
        console.error("Error saving result");
        return;
      }
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set1T1}
          onChange={(e) => setSet1T1(e.target.value)}
          placeholder="-"
        />
        <span>-</span>
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set1T2}
          onChange={(e) => setSet1T2(e.target.value)}
          placeholder="-"
        />
      </div>
      <div className="flex items-center gap-1">
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set2T1}
          onChange={(e) => setSet2T1(e.target.value)}
          placeholder="-"
        />
        <span>-</span>
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set2T2}
          onChange={(e) => setSet2T2(e.target.value)}
          placeholder="-"
        />
      </div>
      <div className="flex items-center gap-1">
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set3T1}
          onChange={(e) => setSet3T1(e.target.value)}
          placeholder="-"
        />
        <span>-</span>
        <Input
          className="w-10 h-7 px-2 text-xs"
          value={set3T2}
          onChange={(e) => setSet3T2(e.target.value)}
          placeholder="-"
        />
      </div>
      <div className="flex items-center gap-1">
        <Label className="text-[10px]">Super TB 3er set</Label>
        <Switch
          checked={hasSTB}
          onCheckedChange={(v) => setHasSTB(v)}
          className="scale-75"
        />
      </div>
      <Button size="sm" className="h-7 text-xs px-3" onClick={handleSave}>
        {saving ? (
          <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <CheckIcon className="h-3 w-3 mr-1" />
        )}
        Guardar
      </Button>
    </div>
  );
}

export default function GroupsTab({ tournament }: { tournament: Tournament }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [closingGroups, setClosingGroups] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/groups`);
      if (!res.ok) throw new Error("Failed to fetch groups");
      const json = (await res.json()) as ApiResponse;
      setData(json);
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
          disabled={closingGroups}
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
              <div className="space-y-2">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="border rounded-md px-3 py-2 bg-background flex flex-col gap-1"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">
                        {teamLabel(m.team1)} vs {teamLabel(m.team2)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {m.status === "finished" ? "Finalizado" : "Pendiente"}
                      </span>
                    </div>
                    <MatchResultForm match={m} onSaved={load} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
