import { createClient } from "@/lib/supabase/server";
import { OrdersRepository } from "@/repositories/orders.repository";
import { PlayersRepository } from "@/repositories/players.repository";
import { ProductsRepository } from "@/repositories/products.repository";
import { CourtsRepository } from "@/repositories/courts.repository";
import { CourtSlotsRepository } from "@/repositories/court-slots.repository";
import { CourtSlotDayNotesRepository } from "@/repositories/court-slot-day-notes.repository";
import { SuppliersRepository } from "@/repositories/suppliers.repository";
import { PaymentMethodsRepository } from "@/repositories/payment-methods.repository";
import { ProductCategoriesRepository } from "@/repositories/product-categories.repository";
import { OrderItemsRepository } from "@/repositories/order-items.repository";
import {
  PurchasesRepository,
  PurchaseItemsRepository,
} from "@/repositories/purchases.repository";
import {
  TournamentsRepository,
  TournamentTeamsRepository,
  TournamentGroupsRepository,
  TournamentMatchesRepository,
  TournamentPlayoffsRepository,
} from "@/repositories/tournaments.repository";

/**
 * Factory function to create repositories with authenticated user context
 * This ensures all repositories have the correct user_uid for queries
 */
export async function createRepositories() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    orders: new OrdersRepository(supabase, user.id),
    orderItems: new OrderItemsRepository(supabase, user.id),
    players: new PlayersRepository(supabase, user.id),
    products: new ProductsRepository(supabase, user.id),
    productCategories: new ProductCategoriesRepository(supabase, user.id),
    courts: new CourtsRepository(supabase, user.id),
    courtSlots: new CourtSlotsRepository(supabase, user.id),
    courtSlotDayNotes: new CourtSlotDayNotesRepository(supabase, user.id),
    suppliers: new SuppliersRepository(supabase, user.id),
    paymentMethods: new PaymentMethodsRepository(supabase, user.id),
    purchases: new PurchasesRepository(supabase, user.id),
    purchaseItems: new PurchaseItemsRepository(supabase, user.id),
    tournaments: new TournamentsRepository(supabase, user.id),
    tournamentTeams: new TournamentTeamsRepository(supabase, user.id),
    tournamentGroups: new TournamentGroupsRepository(supabase, user.id),
    tournamentMatches: new TournamentMatchesRepository(supabase, user.id),
    tournamentPlayoffs: new TournamentPlayoffsRepository(supabase, user.id),
  };
}

