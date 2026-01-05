import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Base repository class that provides common database operations
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  constructor(protected supabase: SupabaseClient, protected userId: string) {}
}

