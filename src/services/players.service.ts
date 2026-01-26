import type { PlayerDTO } from "@/models/dto/player";
import type {
  PlayerStatus,
  PlayerStatusFilter,
} from "@/models/db/player";

export interface CreatePlayerInput {
  first_name: string;
  last_name: string;
  phone: string;
  status?: PlayerStatus;
}

export interface UpdatePlayerInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  status?: PlayerStatus;
}

class PlayersService {
  private baseUrl = "/api/players";

  async getAll(status: PlayerStatusFilter = "active"): Promise<PlayerDTO[]> {
    const params = new URLSearchParams();
    params.set("status", status);
    const url = `${this.baseUrl}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch players");
    }
    return response.json();
  }

  async getById(id: number): Promise<PlayerDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch player");
    }
    return response.json();
  }

  async create(input: CreatePlayerInput): Promise<PlayerDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error creating player");
    }
    return response.json();
  }

  async update(id: number, input: UpdatePlayerInput): Promise<PlayerDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating player");
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error deleting player");
    }
  }
}

export const playersService = new PlayersService();

