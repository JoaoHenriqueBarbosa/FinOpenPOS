export interface AdvertisementDTO {
  id: number;
  user_uid: string;
  name: string;
  image_url: string;
  target_url: string | null;
  description: string | null;
  is_active: boolean;
  ordering: number;
  created_at: string;
  updated_at: string;
}

class AdvertisementsService {
  private baseUrl = "/api/advertisements";

  async getAll(): Promise<AdvertisementDTO[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Error al cargar las publicidades");
    }
    return response.json();
  }
}

export const advertisementsService = new AdvertisementsService();

export const fallbackAdvertisements: AdvertisementDTO[] = [
  {
    id: -1,
    user_uid: "system",
    name: "Publicidad 1",
    image_url: "/logos-advertisement/logo-1.jpg",
    target_url: null,
    description: "Aviso 1",
    is_active: true,
    ordering: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: -2,
    user_uid: "system",
    name: "Publicidad 2",
    image_url: "/logos-advertisement/logo-2.jpg",
    target_url: null,
    description: "Aviso 2",
    is_active: true,
    ordering: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: -3,
    user_uid: "system",
    name: "Publicidad 3",
    image_url: "/logos-advertisement/logo-3.jpg",
    target_url: null,
    description: "Aviso 3",
    is_active: true,
    ordering: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: -4,
    user_uid: "system",
    name: "Publicidad 4",
    image_url: "/logos-advertisement/logo-4.jpg",
    target_url: null,
    description: "Aviso 4",
    is_active: true,
    ordering: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
