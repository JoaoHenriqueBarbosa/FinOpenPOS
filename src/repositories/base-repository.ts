import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Base repository class that provides common database operations
 * All repositories should extend this class
 */
export abstract class BaseRepository {
  constructor(protected supabase: SupabaseClient, protected userId: string) {}

  /**
   * Helper to ensure user_uid is always included in queries
   */
  protected withUserFilter<T>(query: any) {
    return query.eq("user_uid", this.userId);
  }
}

