export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: { id: string } };

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Obtener el precio de inscripción del torneo
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("registration_fee")
      .eq("id", tournamentId)
      .single();

    if (tournamentError) {
      console.error("Error fetching tournament:", tournamentError);
    }

    // Obtener todos los equipos del torneo (sin suplentes) con sus jugadores
    const { data: teams, error: teamsError } = await supabase
      .from("tournament_teams")
      .select(`
        id,
        display_name,
        display_order,
        player1_id,
        player2_id,
        player1:players!player1_id (
          id,
          first_name,
          last_name
        ),
        player2:players!player2_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq("tournament_id", tournamentId)
      .eq("is_substitute", false)
      .order("display_order", { ascending: true });

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      return NextResponse.json(
        { error: "Failed to fetch teams" },
        { status: 500 }
      );
    }

    // Obtener pagos existentes
    const { data: payments, error: paymentsError } = await supabase
      .from("tournament_registration_payments")
      .select(`
        *,
        payment_method:payment_methods!payment_method_id (
          id,
          name
        )
      `)
      .eq("tournament_id", tournamentId);

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Crear un mapa de pagos por equipo y jugador
    const paymentsMap = new Map<string, any>();
    (payments || []).forEach((p: any) => {
      const key = `${p.tournament_team_id}_${p.player_id}`;
      paymentsMap.set(key, {
        id: p.id,
        tournament_id: p.tournament_id,
        tournament_team_id: p.tournament_team_id,
        player_id: p.player_id,
        has_paid: p.has_paid,
        payment_method_id: p.payment_method_id,
        payment_method: Array.isArray(p.payment_method) 
          ? (p.payment_method[0] || null)
          : p.payment_method,
        notes: p.notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    });

    // Crear estructura de respuesta con todos los jugadores
    const formattedPayments: any[] = [];
    
    (teams || []).forEach((team: any) => {
      // Jugador 1
      const key1 = `${team.id}_${team.player1_id}`;
      const payment1 = paymentsMap.get(key1);
      formattedPayments.push({
        id: payment1?.id || null,
        tournament_id: tournamentId,
        tournament_team_id: team.id,
        player_id: team.player1_id,
        has_paid: payment1?.has_paid || false,
        payment_method_id: payment1?.payment_method_id || null,
        payment_method: payment1?.payment_method || null,
        notes: payment1?.notes || null,
        created_at: payment1?.created_at || null,
        updated_at: payment1?.updated_at || null,
        player: team.player1,
        team: {
          id: team.id,
          display_name: team.display_name,
          display_order: team.display_order,
        },
      });

      // Jugador 2
      const key2 = `${team.id}_${team.player2_id}`;
      const payment2 = paymentsMap.get(key2);
      formattedPayments.push({
        id: payment2?.id || null,
        tournament_id: tournamentId,
        tournament_team_id: team.id,
        player_id: team.player2_id,
        has_paid: payment2?.has_paid || false,
        payment_method_id: payment2?.payment_method_id || null,
        payment_method: payment2?.payment_method || null,
        notes: payment2?.notes || null,
        created_at: payment2?.created_at || null,
        updated_at: payment2?.updated_at || null,
        player: team.player2,
        team: {
          id: team.id,
          display_name: team.display_name,
          display_order: team.display_order,
        },
      });
    });

    return NextResponse.json({ 
      payments: formattedPayments,
      registration_fee: tournament?.registration_fee || 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error("GET /tournaments/:id/payments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { tournament_team_id, player_id, has_paid, payment_method_id, notes } = body;

    if (!tournament_team_id || !player_id) {
      return NextResponse.json({ 
        error: "tournament_team_id and player_id are required" 
      }, { status: 400 });
    }

    // Verificar que el equipo pertenece al torneo y no es suplente
    const { data: team, error: teamError } = await supabase
      .from("tournament_teams")
      .select("id, is_substitute, player1_id, player2_id")
      .eq("id", tournament_team_id)
      .eq("tournament_id", tournamentId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.is_substitute) {
      return NextResponse.json(
        { error: "Cannot register payment for substitute teams" },
        { status: 400 }
      );
    }

    // Verificar que el jugador pertenece al equipo
    if (team.player1_id !== player_id && team.player2_id !== player_id) {
      return NextResponse.json(
        { error: "Player does not belong to this team" },
        { status: 400 }
      );
    }

    // Crear o actualizar pago
    const { data: payment, error: paymentError } = await supabase
      .from("tournament_registration_payments")
      .upsert({
        tournament_id: tournamentId,
        tournament_team_id,
        player_id,
        user_uid: user.id,
        has_paid: has_paid ?? false,
        payment_method_id: payment_method_id || null,
        notes: notes || null,
      }, {
        onConflict: "tournament_team_id,player_id",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating/updating payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to save payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("POST /tournaments/:id/payments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const tournamentId = Number(params.id);
    
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const { payment_id, has_paid, payment_method_id, notes } = body;

    if (!payment_id) {
      return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
    }

    // Actualizar pago
    const updates: any = {};
    if (has_paid !== undefined) updates.has_paid = has_paid;
    if (payment_method_id !== undefined) updates.payment_method_id = payment_method_id;
    if (notes !== undefined) updates.notes = notes;

    const { data: payment, error: paymentError } = await supabase
      .from("tournament_registration_payments")
      .update(updates)
      .eq("id", payment_id)
      .eq("tournament_id", tournamentId)
      .select()
      .single();

    if (paymentError) {
      console.error("Error updating payment:", paymentError);
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PATCH /tournaments/:id/payments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
