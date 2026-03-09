import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Redirect root to landing page if not using basePath (direct access)
  if (pathname === "/" && process.env.BASE_URL && process.env.BASE_URL !== "http://localhost" && !process.env.BASE_PATH) {
    return NextResponse.redirect(process.env.BASE_URL);
  }

  if (
    !sessionCookie &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/api/docs") &&
    !pathname.startsWith("/api/openapi.json")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
