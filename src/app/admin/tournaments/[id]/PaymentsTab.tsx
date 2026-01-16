"use client";

import { useState, useMemo } from "react";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { tournamentsService, paymentMethodsService } from "@/services";
import type { TournamentDTO, TournamentRegistrationPaymentDTO } from "@/models/dto/tournament";

async function fetchPayments(tournamentId: number) {
  return tournamentsService.getRegistrationPayments(tournamentId);
}

async function fetchPaymentMethods() {
  return paymentMethodsService.getAll(true);
}

export default function PaymentsTab({ 
  tournament 
}: { 
  tournament: Pick<TournamentDTO, "id" | "registration_fee"> 
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [localPayments, setLocalPayments] = useState<Map<string, {
    has_paid: boolean;
    payment_method_id: number | null;
    notes: string | null;
  }>>(new Map());

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["tournament-payments", tournament.id],
    queryFn: () => fetchPayments(tournament.id),
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: fetchPaymentMethods,
  });

  const payments = paymentsData?.payments || [];
  const registrationFee = paymentsData?.registration_fee ?? tournament.registration_fee ?? 0;
  const paymentMethodsList = paymentMethods || [];

  // Agrupar pagos por equipo
  const paymentsByTeam = new Map<number, TournamentRegistrationPaymentDTO[]>();
  payments.forEach((payment) => {
    const teamId = payment.tournament_team_id;
    if (!paymentsByTeam.has(teamId)) {
      paymentsByTeam.set(teamId, []);
    }
    paymentsByTeam.get(teamId)!.push(payment);
  });

  const handlePaymentChange = (key: string, hasPaid: boolean) => {
    const current = localPayments.get(key) || {
      has_paid: false,
      payment_method_id: null,
      notes: null,
    };
    setLocalPayments(new Map(localPayments.set(key, {
      ...current,
      has_paid: hasPaid,
    })));
  };

  const handleMethodChange = (key: string, methodId: string) => {
    const current = localPayments.get(key) || {
      has_paid: false,
      payment_method_id: null,
      notes: null,
    };
    setLocalPayments(new Map(localPayments.set(key, {
      ...current,
      payment_method_id: methodId === "none" ? null : Number(methodId),
    })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Array.from(localPayments.entries()).map(([key, data]) => {
        const [teamId, playerId] = key.split('_').map(Number);
        const existingPayment = payments.find(
          p => p.tournament_team_id === teamId && p.player_id === playerId
        );
        return {
          teamId,
          playerId,
          paymentId: existingPayment?.id,
          data,
        };
      });

      await Promise.all(
        updates.map(async ({ teamId, playerId, paymentId, data }) => {
          if (paymentId) {
            await tournamentsService.updateRegistrationPayment(tournament.id, paymentId, data);
          } else {
            await tournamentsService.createRegistrationPayment(
              tournament.id, 
              teamId, 
              playerId,
              data
            );
          }
        })
      );

      toast.success("Pagos actualizados correctamente");
      queryClient.invalidateQueries({ queryKey: ["tournament-payments", tournament.id] });
      setLocalPayments(new Map());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar pagos");
    } finally {
      setSaving(false);
    }
  };

  const getPaymentKey = (teamId: number, playerId: number) => `${teamId}_${playerId}`;

  const hasChanges = localPayments.size > 0;

  // Calcular estadísticas
  const totalPlayers = payments.length;
  const paidPlayers = payments.filter(p => {
    const key = getPaymentKey(p.tournament_team_id, p.player_id);
    const local = localPayments.get(key);
    return local ? local.has_paid : p.has_paid;
  }).length;
  const totalExpected = totalPlayers * registrationFee;
  const totalPaid = paidPlayers * registrationFee;

  // Calcular recaudación por medio de pago
  const revenueByPaymentMethod = useMemo(() => {
    const revenueMap = new Map<number, { name: string; amount: number; count: number }>();

    payments.forEach(payment => {
      const key = getPaymentKey(payment.tournament_team_id, payment.player_id);
      const local = localPayments.get(key);
      const hasPaid = local ? local.has_paid : payment.has_paid;
      const methodId = local?.payment_method_id ?? payment.payment_method_id;

      if (hasPaid && methodId) {
        const method = paymentMethodsList.find(m => m.id === methodId);
        const methodName = method?.name || `Método #${methodId}`;
        
        const existing = revenueMap.get(methodId) || {
          name: methodName,
          amount: 0,
          count: 0,
        };
        
        existing.amount += registrationFee;
        existing.count += 1;
        revenueMap.set(methodId, existing);
      }
    });

    return Array.from(revenueMap.values()).sort((a, b) => b.amount - a.amount);
  }, [payments, localPayments, paymentMethodsList, registrationFee]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2Icon className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagos de Inscripción</CardTitle>
        <CardDescription>
          Registrar los pagos de inscripción por jugador del torneo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Resumen de pagos */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Precio por jugador</div>
                <div className="text-2xl font-bold">${registrationFee.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total jugadores</div>
                <div className="text-2xl font-bold">{totalPlayers}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Jugadores pagados</div>
                <div className="text-2xl font-bold text-green-600">{paidPlayers}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total recaudado</div>
                <div className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Faltante recaudado</div>
                <div className="text-2xl font-bold text-red-600">${(totalExpected - totalPaid).toFixed(2)}</div>
              </div>
            </div>

            {/* Recaudación por medio de pago */}
            {revenueByPaymentMethod.length > 0 && (
              <div className="p-4 bg-muted rounded-lg border">
                <h3 className="text-sm font-semibold mb-3">Recaudación por medio de pago</h3>
                <div className="space-y-2">
                  {revenueByPaymentMethod.map((method) => (
                    <div key={method.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {method.name}
                        <span className="ml-2 text-xs">({method.count} jug.)</span>
                      </span>
                      <span className="font-semibold">
                        ${method.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pareja</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead className="text-center">Pagó</TableHead>
                  <TableHead>Medio de pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay equipos registrados todavía
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.from(paymentsByTeam.entries()).map(([teamId, teamPayments]) => {
                    const teamName = teamPayments[0]?.team?.display_name || `Equipo #${teamId}`;
                    const [player1Payment, player2Payment] = teamPayments.sort((a, b) => 
                      a.player_id - b.player_id
                    );

                    return (
                      <React.Fragment key={teamId}>
                        {/* Jugador 1 */}
                        {player1Payment && (() => {
                          const key = getPaymentKey(teamId, player1Payment.player_id);
                          const localData = localPayments.get(key);
                          const hasPaid = localData?.has_paid ?? player1Payment.has_paid;
                          const methodId = localData?.payment_method_id ?? player1Payment.payment_method_id;
                          const playerName = player1Payment.player 
                            ? `${player1Payment.player.first_name} ${player1Payment.player.last_name}`
                            : 'Jugador 1';

                          return (
                            <TableRow key={`${teamId}_${player1Payment.player_id}`}>
                              <TableCell className="font-medium align-top">
                                {teamPayments.indexOf(player1Payment) === 0 && (
                                  <div className="font-medium">{teamName}</div>
                                )}
                              </TableCell>
                              <TableCell>{playerName}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={hasPaid}
                                  onCheckedChange={(checked) =>
                                    handlePaymentChange(key, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={methodId?.toString() || "none"}
                                  onValueChange={(value) =>
                                    handleMethodChange(key, value)
                                  }
                                  disabled={!hasPaid}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar método" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No especificado</SelectItem>
                                    {paymentMethodsList.map((method) => (
                                      <SelectItem key={method.id} value={method.id.toString()}>
                                        {method.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                {hasPaid ? `$${registrationFee.toFixed(2)}` : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })()}

                        {/* Jugador 2 */}
                        {player2Payment && (() => {
                          const key = getPaymentKey(teamId, player2Payment.player_id);
                          const localData = localPayments.get(key);
                          const hasPaid = localData?.has_paid ?? player2Payment.has_paid;
                          const methodId = localData?.payment_method_id ?? player2Payment.payment_method_id;
                          const playerName = player2Payment.player 
                            ? `${player2Payment.player.first_name} ${player2Payment.player.last_name}`
                            : 'Jugador 2';

                          return (
                            <TableRow key={`${teamId}_${player2Payment.player_id}`}>
                              <TableCell className="font-medium align-top">
                                {/* Solo mostrar nombre del equipo en la primera fila */}
                              </TableCell>
                              <TableCell>{playerName}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={hasPaid}
                                  onCheckedChange={(checked) =>
                                    handlePaymentChange(key, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={methodId?.toString() || "none"}
                                  onValueChange={(value) =>
                                    handleMethodChange(key, value)
                                  }
                                  disabled={!hasPaid}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar método" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No especificado</SelectItem>
                                    {paymentMethodsList.map((method) => (
                                      <SelectItem key={method.id} value={method.id.toString()}>
                                        {method.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                {hasPaid ? `$${registrationFee.toFixed(2)}` : '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
