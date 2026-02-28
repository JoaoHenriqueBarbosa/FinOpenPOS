import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-guard";

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

type RouteContext = { params: Promise<Record<string, string>> };

type AuthHandler = (
  user: AuthUser,
  request: Request,
  context: RouteContext
) => Promise<NextResponse | Response>;

/**
 * Wraps a route handler with auth check + try/catch error handling.
 * Eliminates the repeated getAuthUser() + 401 check and try/catch + 500 pattern.
 */
export function authHandler(handler: AuthHandler) {
  return async (request: Request, context: RouteContext) => {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      return await handler(user, request, context);
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 500 }
      );
    }
  };
}

/** Shortcut to return JSON. */
export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
