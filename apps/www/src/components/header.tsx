import { useTranslations } from "next-intl";
import { links } from "@/lib/links";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileMenu } from "./mobile-menu";

const NAV_LINKS = [
	{ href: "#features", key: "features" as const },
	{ href: links.app, key: "demo" as const },
	{ href: links.docs, key: "docs" as const },
	{ href: links.apiDocs, key: "apiDocs" as const },
	{ href: links.github, key: "github" as const },
];

export default function Header() {
	const t = useTranslations("header");

	return (
		<header className="sticky top-0 z-50 border-neon-border border-b bg-[#0C0D0D]/80 backdrop-blur-[16px]">
			<nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
				{/* Logo */}
				<a href="/" className="group flex items-center gap-2">
					<span className="relative flex h-1.5 w-1.5">
						<span className="absolute inline-flex h-full w-full animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-neon-accent opacity-75" />
						<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-accent shadow-[0_0_8px_rgba(52,213,154,0.6)]" />
					</span>
					<span className="font-medium text-base text-white tracking-tight">
						FinOpenPOS
					</span>
				</a>

				{/* Desktop nav */}
				<div className="hidden items-center gap-8 md:flex">
					{NAV_LINKS.map((link) => (
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

				{/* Desktop right section */}
				<div className="hidden items-center gap-4 md:flex">
					<LocaleSwitcher />
					<a
						href={links.github}
						className="rounded-md bg-neon-green px-4 py-2 font-medium text-sm text-white transition-all duration-200 hover:bg-neon-accent hover:shadow-[0_0_20px_rgba(52,213,154,0.3)]"
					>
						{t("getStarted")}
					</a>
				</div>

				{/* Mobile menu (client component) */}
				<div className="md:hidden">
					<MobileMenu
						links={NAV_LINKS.map((link) => ({
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
