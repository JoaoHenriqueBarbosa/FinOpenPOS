class AdminService {
  async getTotalRevenue(): Promise<number> {
    const response = await fetch("/api/admin/revenue/total");
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.totalRevenue || 0;
  }
}

export const adminService = new AdminService();

