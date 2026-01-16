"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2Icon, CheckIcon, TrashIcon } from "lucide-react";
import { validateMatchSets, validateSuperTiebreak } from "@/lib/match-validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MatchDTO } from "@/models/dto/tournament";

// Using Pick from MatchDTO for form data
type MatchData = Pick<
  MatchDTO,
  | "id"
  | "set1_team1_games"
  | "set1_team2_games"
  | "set2_team1_games"
  | "set2_team2_games"
  | "set3_team1_games"
  | "set3_team2_games"
  | "super_tiebreak_team1_points"
  | "super_tiebreak_team2_points"
>;

type MatchResultFormProps = {
  match: MatchData;
  onSaved: () => void;
  // Props opcionales para el layout inline
  team1Name?: string;
  team2Name?: string;
  hasSuperTiebreak?: boolean; // Whether this match uses super tiebreak for set 3
  groupColor?: {
    bg: string;
    text: string;
  };
  // Layout: "compact" (sin nombres) o "inline" (con nombres)
  layout?: "compact" | "inline";
  // Si está deshabilitado (ej: cuando ya hay playoffs generados)
  disabled?: boolean;
  disabledMessage?: string; // Mensaje a mostrar cuando está deshabilitado
};

export function MatchResultForm({
  match,
  onSaved,
  team1Name,
  team2Name,
  hasSuperTiebreak = false,
  groupColor,
  layout = team1Name && team2Name ? "inline" : "compact",
  disabled = false,
  disabledMessage = "No se pueden modificar los resultados de zona una vez generados los playoffs",
}: MatchResultFormProps) {
  // Colores por defecto si no se proporcionan
  const bgColor = groupColor?.bg || "bg-blue-50";
  const textColor = groupColor?.text || "text-blue-900";
  const isInline = layout === "inline" && team1Name && team2Name;

  const [set1T1, setSet1T1] = useState<string>(match.set1_team1_games?.toString() ?? "");
  const [set1T2, setSet1T2] = useState<string>(match.set1_team2_games?.toString() ?? "");
  const [set2T1, setSet2T1] = useState<string>(match.set2_team1_games?.toString() ?? "");
  const [set2T2, setSet2T2] = useState<string>(match.set2_team2_games?.toString() ?? "");
  const [set3T1, setSet3T1] = useState<string>(match.set3_team1_games?.toString() ?? "");
  const [set3T2, setSet3T2] = useState<string>(match.set3_team2_games?.toString() ?? "");
  const [superT1, setSuperT1] = useState<string>(
    match.super_tiebreak_team1_points?.toString() ?? ""
  );
  const [superT2, setSuperT2] = useState<string>(
    match.super_tiebreak_team2_points?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Resetear valores cuando cambia el match
  useEffect(() => {
    setSet1T1(match.set1_team1_games?.toString() ?? "");
    setSet1T2(match.set1_team2_games?.toString() ?? "");
    setSet2T1(match.set2_team1_games?.toString() ?? "");
    setSet2T2(match.set2_team2_games?.toString() ?? "");
    setSet3T1(match.set3_team1_games?.toString() ?? "");
    setSet3T2(match.set3_team2_games?.toString() ?? "");
    setSuperT1(match.super_tiebreak_team1_points?.toString() ?? "");
    setSuperT2(match.super_tiebreak_team2_points?.toString() ?? "");
  }, [
    match.id,
    match.set1_team1_games,
    match.set1_team2_games,
    match.set2_team1_games,
    match.set2_team2_games,
    match.set3_team1_games,
    match.set3_team2_games,
    match.super_tiebreak_team1_points,
    match.super_tiebreak_team2_points,
  ]);

  // Verificar si el match ya tiene un resultado cargado
  const hasExistingResult = () => {
    return (
      match.set1_team1_games !== null ||
      match.set1_team2_games !== null ||
      match.set2_team1_games !== null ||
      match.set2_team2_games !== null ||
      match.set3_team1_games !== null ||
      match.set3_team2_games !== null ||
      match.super_tiebreak_team1_points !== null ||
      match.super_tiebreak_team2_points !== null
    );
  };

  const performSave = async () => {
    const toNum = (v: string) =>
      v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v);

    const sets = [
      { team1: toNum(set1T1), team2: toNum(set1T2) },
      { team1: toNum(set2T1), team2: toNum(set2T2) },
      { team1: toNum(set3T1), team2: toNum(set3T2) },
    ];
    const thirdSetPlayed = sets[2].team1 !== null && sets[2].team2 !== null;
    const superPointsTeam1 = toNum(superT1);
    const superPointsTeam2 = toNum(superT2);
    const superPayload =
      superPointsTeam1 !== null && superPointsTeam2 !== null
        ? { team1: superPointsTeam1, team2: superPointsTeam2 }
        : null;

    // Validar antes de enviar si hasSuperTiebreak está definido
    if (hasSuperTiebreak !== undefined) {
      const validation = validateMatchSets(sets[0], sets[1], sets[2], hasSuperTiebreak);
      if (!validation.valid) {
        setError(validation.error || "Error de validación");
        setShowConfirmDialog(false);
        return;
      }
    }

    if (hasSuperTiebreak && thirdSetPlayed) {
      if (!superPayload) {
        setError("Debes informar el puntaje real del super tie-break");
        setShowConfirmDialog(false);
        return;
      }

      const superValidation = validateSuperTiebreak(superPayload.team1, superPayload.team2);
      if (!superValidation.valid) {
        setError(superValidation.error || "Puntaje inválido del super tie-break");
        setShowConfirmDialog(false);
        return;
      }
    }

    setError(null);

    try {
      setSaving(true);
      const res = await fetch(`/api/tournament-matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sets,
          ...(superPayload ? { superTiebreak: superPayload } : {}),
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Error al guardar el resultado");
        setShowConfirmDialog(false);
        return;
      }
      setError(null);
      setShowConfirmDialog(false);
      onSaved();
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
      setShowConfirmDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    // Si está deshabilitado, no hacer nada
    if (disabled) return;
    
    // Si ya tiene un resultado, mostrar diálogo de confirmación
    if (hasExistingResult()) {
      setShowConfirmDialog(true);
    } else {
      // Si no tiene resultado, guardar directamente
      performSave();
    }
  };

  const performClear = async () => {
    try {
      setClearing(true);
      setError(null);
      const res = await fetch(`/api/tournament-matches/${match.id}/result`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Error al limpiar el resultado");
        setShowClearDialog(false);
        return;
      }
      setShowClearDialog(false);
      // Resetear los valores locales
      setSet1T1("");
      setSet1T2("");
      setSet2T1("");
      setSet2T2("");
      setSet3T1("");
      setSet3T2("");
      setSuperT1("");
      setSuperT2("");
      onSaved();
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
      setShowClearDialog(false);
    } finally {
      setClearing(false);
    }
  };

  const handleClear = () => {
    // Si está deshabilitado, no hacer nada (igual que handleSave)
    if (disabled) return;
    
    // Siempre mostrar diálogo de confirmación (igual que guardar cuando hay resultado)
    setShowClearDialog(true);
  };

  // Layout compacto (sin nombres de equipos)
  if (!isInline) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set1T1}
                onChange={(e) => setSet1T1(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span>-</span>
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set1T2}
                onChange={(e) => setSet1T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set2T1}
                onChange={(e) => setSet2T1(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span>-</span>
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set2T2}
                onChange={(e) => setSet2T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set3T1}
                onChange={(e) => setSet3T1(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span>-</span>
              <Input
                className="w-10 h-7 px-2 text-xs"
                value={set3T2}
                onChange={(e) => setSet3T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
        {hasSuperTiebreak && (
          <div className="flex items-center gap-1 text-[10px]">
            <span className="font-semibold text-muted-foreground">Super TB</span>
            <Input
              className="w-10 h-7 px-2 text-xs"
              value={superT1}
              onChange={(e) => setSuperT1(e.target.value)}
              placeholder="11"
              disabled={disabled}
            />
            <span>-</span>
            <Input
              className="w-10 h-7 px-2 text-xs"
              value={superT2}
              onChange={(e) => setSuperT2(e.target.value)}
              placeholder="9"
              disabled={disabled}
            />
          </div>
        )}
        <Button size="sm" className="h-7 text-xs px-3" onClick={handleSave} disabled={saving || disabled}>
          {saving ? (
            <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <CheckIcon className="h-3 w-3 mr-1" />
          )}
          Guardar
        </Button>
        {hasExistingResult() && (
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-7 text-xs px-3" 
            onClick={handleClear} 
            disabled={clearing || saving || disabled}
          >
            {clearing ? (
              <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <TrashIcon className="h-3 w-3 mr-1" />
            )}
            Limpiar
          </Button>
        )}
        {error && (
          <div className="w-full text-xs text-red-600 mt-1">{error}</div>
        )}
        {disabled && disabledMessage && (
          <div className="w-full text-xs text-amber-600 mt-1 italic">{disabledMessage}</div>
        )}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar sobrescritura de resultado</DialogTitle>
              <DialogDescription>
                Este partido ya tiene un resultado cargado. ¿Estás seguro de que
                deseas sobrescribirlo con el nuevo resultado?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={performSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar y guardar"
                )}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar limpieza de resultado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas limpiar el resultado de este partido? 
              Esta acción eliminará todos los sets y reseteará el estado del partido. 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={clearing}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={performClear} disabled={clearing}>
              {clearing ? (
                <>
                  <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                  Limpiando...
                </>
              ) : (
                "Confirmar y limpiar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

  // Layout inline (con nombres de equipos)
  return (
    <>
      <div className={`${bgColor} border-b px-4 py-3`}>
        <div className="flex items-center justify-between gap-4">
          {/* Team 1 */}
          <div className="flex-1">
            <div className={`text-sm font-semibold ${textColor} mb-3`}>
              {team1Name!.split(" / ").map((name, idx) => (
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
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set1T2}
                onChange={(e) => setSet1T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            {/* Set 2 */}
            <div className="flex items-center gap-2">
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set2T1}
                onChange={(e) => setSet2T1(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set2T2}
                onChange={(e) => setSet2T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            {/* Set 3 */}
            <div className="flex items-center gap-2">
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set3T1}
                onChange={(e) => setSet3T1(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-12 h-8 px-2 text-center text-xs font-semibold"
                value={set3T2}
                onChange={(e) => setSet3T2(e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            {hasSuperTiebreak && (
              <div className="flex flex-col items-center gap-1 text-[10px]">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Super tie-break (puntos)
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    className="w-12 h-8 px-2 text-center text-xs font-semibold"
                    value={superT1}
                    onChange={(e) => setSuperT1(e.target.value)}
                    placeholder="11"
                    disabled={disabled}
                  />
                  <span className="text-xs text-muted-foreground">-</span>
                  <Input
                    className="w-12 h-8 px-2 text-center text-xs font-semibold"
                    value={superT2}
                    onChange={(e) => setSuperT2(e.target.value)}
                    placeholder="9"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Team 2 */}
          <div className="flex-1 text-right">
            <div className={`text-sm font-semibold ${textColor} mb-3`}>
              {team2Name!.split(" / ").map((name, idx) => (
                <div key={idx}>{name}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Botones de acción */}
      <div className={`px-4 py-3 ${bgColor} flex flex-col items-center justify-center gap-2`}>
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs px-3" onClick={handleSave} disabled={saving || disabled}>
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
          {hasExistingResult() && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-7 text-xs px-3" 
              onClick={handleClear} 
              disabled={clearing || saving || disabled}
            >
              {clearing ? (
                <>
                  <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                  Limpiando...
                </>
              ) : (
                <>
                  <TrashIcon className="h-3 w-3 mr-1" />
                  Limpiar
                </>
              )}
            </Button>
          )}
        </div>
        {disabled && disabledMessage && (
          <p className="text-xs text-amber-600 italic text-center">{disabledMessage}</p>
        )}
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar sobrescritura de resultado</DialogTitle>
            <DialogDescription>
              Este partido ya tiene un resultado cargado. ¿Estás seguro de que
              deseas sobrescribirlo con el nuevo resultado?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={performSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                  Guardando...
                </>
              ) : (
                "Confirmar y guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar limpieza de resultado</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas limpiar el resultado de este partido? 
              Esta acción eliminará todos los sets y reseteará el estado del partido. 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={clearing}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={performClear} disabled={clearing}>
              {clearing ? (
                <>
                  <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                  Limpiando...
                </>
              ) : (
                "Confirmar y limpiar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
