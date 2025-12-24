"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { courtSlotsService } from "@/services/court-slots.service";
import type { CourtPricingDB } from "@/models/db/court";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface PricingRule {
  start_time: string;
  end_time: string;
  price_per_player: number;
}

interface Court {
  id: number;
  name: string;
}

interface CourtPricingDialogProps {
  court: Court;
  onUpdate?: () => void;
}

export function CourtPricingDialog({
  court,
  onUpdate,
}: CourtPricingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PricingRule[]>([]);

  useEffect(() => {
    if (open) {
      loadPricing();
    }
  }, [open, court.id]);

  async function loadPricing() {
    try {
      setLoading(true);
      const pricing = await courtSlotsService.getPricing();
      const courtPricing = pricing.filter((p) => p.court_id === court.id);
      
      if (courtPricing.length > 0) {
        setRules(
          courtPricing.map((p) => ({
            start_time: p.start_time.slice(0, 5), // HH:MM
            end_time: p.end_time.slice(0, 5),
            price_per_player: p.price_per_player,
          }))
        );
      } else {
        // Valores por defecto vacíos - el usuario debe configurarlos
        setRules([]);
      }
    } catch (error) {
      toast.error("Error al cargar precios");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await courtSlotsService.upsertPricingForCourtId(court.id, rules);
      toast.success("Precios actualizados correctamente");
      setOpen(false);
      onUpdate?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar los precios"
      );
    } finally {
      setSaving(false);
    }
  }

  function addRule() {
    setRules([
      ...rules,
      { start_time: "13:00", end_time: "23:30", price_per_player: 0 },
    ]);
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }

  function updateRule(index: number, field: keyof PricingRule, value: string | number) {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Configurar {court.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Precios por jugador - {court.name}</DialogTitle>
          <DialogDescription>
            Configurá los precios por rango horario para {court.name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-end p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <Label className="text-xs">Desde</Label>
                    <Input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) =>
                        updateRule(index, "start_time", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Hasta</Label>
                    <Input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) =>
                        updateRule(index, "end_time", e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Precio por jugador</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rule.price_per_player}
                      onChange={(e) =>
                        updateRule(
                          index,
                          "price_per_player",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRule(index)}
                    disabled={rules.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay precios configurados. Agregá al menos un rango horario.
              </p>
            )}

            <Button
              variant="outline"
              onClick={addRule}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar rango horario
            </Button>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || rules.length === 0}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
