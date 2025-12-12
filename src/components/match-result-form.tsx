"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon } from "lucide-react";

// Tipo genérico para matches de grupos y playoffs
type MatchData = {
  id: number;
  set1_team1_games: number | null;
  set1_team2_games: number | null;
  set2_team1_games: number | null;
  set2_team2_games: number | null;
  set3_team1_games: number | null;
  set3_team2_games: number | null;
  has_super_tiebreak: boolean | null;
};

type MatchResultFormProps = {
  match: MatchData;
  onSaved: () => void;
};

export function MatchResultForm({ match, onSaved }: MatchResultFormProps) {
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

  // Resetear valores cuando cambia el match
  useEffect(() => {
    setSet1T1(match.set1_team1_games?.toString() ?? "");
    setSet1T2(match.set1_team2_games?.toString() ?? "");
    setSet2T1(match.set2_team1_games?.toString() ?? "");
    setSet2T2(match.set2_team2_games?.toString() ?? "");
    setSet3T1(match.set3_team1_games?.toString() ?? "");
    setSet3T2(match.set3_team2_games?.toString() ?? "");
    setHasSTB(!!match.has_super_tiebreak);
  }, [
    match.id,
    match.set1_team1_games,
    match.set1_team2_games,
    match.set2_team1_games,
    match.set2_team2_games,
    match.set3_team1_games,
    match.set3_team2_games,
    match.has_super_tiebreak,
  ]);

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

