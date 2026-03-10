import { useTranslations, useLocale } from "next-intl";
import { links } from "@/lib/links";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";

export default function Header() {
  const t = useTranslations("header");
  const locale = useLocale();

  const navLinks = [
    { href: "#features", key: "features" as const },
    { href: links.app, key: "demo" as const },
    { href: `/${locale}/docs`, key: "docs" as const },
    { href: links.apiDocs, key: "apiDocs" as const },
    { href: links.github, key: "github" as const },
  ];

  return (
    <header className="sticky top-0 z-50 border-neon-border border-b bg-[#0C0D0D]/80 backdrop-blur-[16px]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href={`/${locale}`} className="group flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-neon-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-accent shadow-[0_0_8px_rgba(52,213,154,0.6)]" />
          </span>
          <span className="font-medium text-base text-white tracking-tight">
            FinOpenPOS
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="font-medium text-neon-text-muted text-sm transition-colors duration-200 hover:text-white"
              {...(link.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {t(link.key)}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <LocaleSwitcher />
          <a
            href={links.github}
            className="rounded-md bg-neon-green px-4 py-2 font-medium text-sm text-white transition-all duration-200 hover:bg-neon-accent hover:shadow-[0_0_20px_rgba(52,213,154,0.3)]"
          >
            {t("getStarted")}
          </a>
        </div>

        <div className="md:hidden">
          <MobileMenu
            links={navLinks.map((link) => ({
              ...link,
              label: t(link.key),
            }))}
            ctaLabel={t("getStarted")}
            ctaHref={links.github}
          />
        </div>
      </nav>
    </header>
  );
}
