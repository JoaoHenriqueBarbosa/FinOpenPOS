// services/partners.service.ts
// Read-only service for partners (business owners in a partnership)
// Partners are managed directly from the database

export interface PartnerDTO {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
}

class PartnersService {
  private baseUrl = '/api/partners';

  async getAll(onlyActive?: boolean): Promise<PartnerDTO[]> {
    const url = onlyActive ? `${this.baseUrl}?onlyActive=true` : this.baseUrl;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch partners');
    }
    return response.json();
  }
}

export const partnersService = new PartnersService();
