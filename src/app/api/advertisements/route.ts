export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("advertisements")
      .select(
        `
          id,
          name,
          image_url,
          target_url,
          description,
          is_active,
          ordering,
          created_at
        `
      )
      .eq("user_uid", user.id)
      .eq("is_active", true)
      .order("ordering", { ascending: true });

    if (error) {
      console.error("GET /advertisements error:", error);
      return NextResponse.json(
        { error: error.message || "No se pudieron cargar las publicidades" },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /advertisements error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
