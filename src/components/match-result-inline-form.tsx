"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon } from "lucide-react";

// Tipo genérico para matches
type MatchData = {
  id: number;
  set1_team1_games: number | null;
  set1_team2_games: number | null;
  set2_team1_games: number | null;
  set2_team2_games: number | null;
  set3_team1_games: number | null;
  set3_team2_games: number | null;
};

type MatchResultInlineFormProps = {
  match: MatchData;
  team1Name: string;
  team2Name: string;
  onSaved: () => void;
};

export function MatchResultInlineForm({
  match,
  team1Name,
  team2Name,
  onSaved,
}: MatchResultInlineFormProps) {
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
  const [saving, setSaving] = useState(false);

  // Resetear valores cuando cambia el match
  useEffect(() => {
    setSet1T1(match.set1_team1_games?.toString() ?? "");
    setSet1T2(match.set1_team2_games?.toString() ?? "");
    setSet2T1(match.set2_team1_games?.toString() ?? "");
    setSet2T2(match.set2_team2_games?.toString() ?? "");
    setSet3T1(match.set3_team1_games?.toString() ?? "");
    setSet3T2(match.set3_team2_games?.toString() ?? "");
  }, [
    match.id,
    match.set1_team1_games,
    match.set1_team2_games,
    match.set2_team1_games,
    match.set2_team2_games,
    match.set3_team1_games,
    match.set3_team2_games,
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
    <>
      <div className="bg-blue-50 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Team 1 */}
          <div className="flex-1">
            <div className="text-sm font-semibold text-blue-900 mb-3">
              {team1Name.split(" / ").map((name, idx) => (
                <div key={idx}>{name}</div>
              ))}
            </div>
          </div>
          
          {/* Inputs de resultados - 3 filas (sets) */}
          <div className="flex flex-col gap-2 items-center">
            {/* Set 1 */}
            <div className="flex items-center gap-2">
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set1T1}
                onChange={(e) => setSet1T1(e.target.value)}
                placeholder="-"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set1T2}
                onChange={(e) => setSet1T2(e.target.value)}
                placeholder="-"
              />
            </div>
            {/* Set 2 */}
            <div className="flex items-center gap-2">
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set2T1}
                onChange={(e) => setSet2T1(e.target.value)}
                placeholder="-"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set2T2}
                onChange={(e) => setSet2T2(e.target.value)}
                placeholder="-"
              />
            </div>
            {/* Set 3 */}
            <div className="flex items-center gap-2">
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set3T1}
                onChange={(e) => setSet3T1(e.target.value)}
                placeholder="-"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set3T2}
                onChange={(e) => setSet3T2(e.target.value)}
                placeholder="-"
              />
            </div>
          </div>
          
          {/* Team 2 */}
          <div className="flex-1 text-right">
            <div className="text-sm font-semibold text-blue-900 mb-3">
              {team2Name.split(" / ").map((name, idx) => (
                <div key={idx}>{name}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Botones de acción */}
      <div className="px-4 py-3 bg-white flex items-center justify-center">
        <Button size="sm" className="h-7 text-xs px-3" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
              Guardando...
            </>
          ) : (
            <>
              <CheckIcon className="h-3 w-3 mr-1" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </>
  );
}

