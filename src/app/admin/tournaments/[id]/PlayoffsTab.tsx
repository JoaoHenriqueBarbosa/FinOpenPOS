"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

type Tournament = { id: number };

type PlayoffRow = {
  id: number;
  round: string;
  bracket_pos: number;
  match: {
    id: number;
    status: string;
    has_super_tiebreak: boolean;
    set1_team1_games: number | null;
    set1_team2_games: number | null;
    set2_team1_games: number | null;
    set2_team2_games: number | null;
    set3_team1_games: number | null;
    set3_team2_games: number | null;
    team1: {
      id: number;
      display_name: string | null;
      player1: { first_name: string; last_name: string } | null;
      player2: { first_name: string; last_name: string } | null;
    } | null;
    team2: {
      id: number;
      display_name: string | null;
      player1: { first_name: string; last_name: string } | null;
      player2: { first_name: string; last_name: string } | null;
    } | null;
  } | null;
};

type Match = NonNullable<PlayoffRow["match"]>;

function teamLabel(team: Match["team1"]) {
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
  match: NonNullable<PlayoffRow["match"]>;
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
        console.error("Error saving playoff result");
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
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
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
        <Label className="text-[10px]">Super TB</Label>
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

export default function PlayoffsTab({ tournament }: { tournament: Tournament }) {
  const [rows, setRows] = useState<PlayoffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/playoffs`);
      if (!res.ok) throw new Error("Failed to fetch playoffs");
      const data = (await res.json()) as PlayoffRow[];
      setRows(data);
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

  const rounds = Array.from(new Set(rows.map((r) => r.round)));

  return (
    <Card className="border-none shadow-none p-0">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Playoffs</CardTitle>
        <CardDescription>
          Visualizá el cuadro y cargá los resultados de cada cruce.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        <div className="grid gap-4 md:grid-cols-3">
          {rounds.map((round) => {
            const perRound = rows.filter((r) => r.round === round);
            return (
              <div
                key={round}
                className="border rounded-lg p-3 bg-muted/40 space-y-2"
              >
                <h3 className="font-semibold text-sm capitalize">{round}</h3>
                <div className="space-y-2">
                  {perRound.map((r) => {
                    const match = r.match;
                    if (!match) return null;
                    return (
                      <div
                        key={r.id}
                        className="border rounded-md bg-background px-3 py-2 space-y-1"
                      >
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">
                            {teamLabel(match.team1)} vs {teamLabel(match.team2)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {match.status === "finished"
                              ? "Finalizado"
                              : "Pendiente"}
                          </span>
                        </div>
                        <MatchResultForm match={match} onSaved={load} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
