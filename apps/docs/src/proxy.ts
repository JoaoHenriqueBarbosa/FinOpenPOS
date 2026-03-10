import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { i18n } from "@/lib/i18n";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";

const fumadocsMiddleware = createI18nMiddleware(i18n);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const hasLocale = i18n.languages.some(
    (lang) => pathname === `/${lang}` || pathname.startsWith(`/${lang}/`),
  );

  if (!hasLocale) {
    const cookieLocale = request.cookies.get("locale")?.value;
    if (cookieLocale && (i18n.languages as readonly string[]).includes(cookieLocale)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${cookieLocale}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  return fumadocsMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
