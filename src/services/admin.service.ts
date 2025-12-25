interface DashboardSalesData {
  openOrders: {
    count: number;
    totalAmount: number;
  };
  todaySales: {
    total: number;
    byPaymentMethod: Record<string, number>;
  };
}

interface DashboardCourtsData {
  playedSlotsByCourt: Record<string, number>;
  totalPlayed: number;
  hasUnpaidSlots: boolean;
}

interface TournamentDashboardData {
  id: number;
  name: string;
  status: string;
  phase: string;
  teamsCount: number;
  startDate: string | null;
  endDate: string | null;
}

interface DashboardTournamentsData {
  activeTournaments: TournamentDashboardData[];
  count: number;
}

class AdminService {
  async getTotalRevenue(): Promise<number> {
    const response = await fetch("/api/admin/revenue/total");
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.totalRevenue || 0;
  }

  async getDashboardSales(): Promise<DashboardSalesData> {
    const response = await fetch("/api/admin/dashboard/sales");
    if (!response.ok) {
      throw new Error("Error fetching dashboard sales data");
    }
    return response.json();
  }

  async getDashboardCourts(): Promise<DashboardCourtsData> {
    const response = await fetch("/api/admin/dashboard/courts");
    if (!response.ok) {
      throw new Error("Error fetching dashboard courts data");
    }
    return response.json();
  }

  async getDashboardTournaments(): Promise<DashboardTournamentsData> {
    const response = await fetch("/api/admin/dashboard/tournaments");
    if (!response.ok) {
      throw new Error("Error fetching dashboard tournaments data");
    }
    return response.json();
  }
}

export const adminService = new AdminService();

