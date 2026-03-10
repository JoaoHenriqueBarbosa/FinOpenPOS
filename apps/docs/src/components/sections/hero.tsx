import { Github, BookOpen } from "lucide-react";
import { getTranslations } from "@/lib/translations-server";
import { links } from "@/lib/links";
import type { Messages } from "@/messages/en";

export default function Hero({ locale, messages }: { locale: string; messages: Messages }) {
	const t = getTranslations(messages, "hero");

	return (
		<section className="relative -mt-16 min-h-[100svh] overflow-hidden">
			{/* ── Perspective grid floor ── */}
			<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60vh]">
				<div className="perspective-grid h-full w-full" />
			</div>

			{/* ── Large gradient orb ── */}
			<div
				className="pointer-events-none absolute left-1/2 top-[30%] h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 animate-glow-pulse rounded-full opacity-60 blur-[120px]"
				style={{
					background:
						"radial-gradient(circle, rgba(52,213,154,0.2) 0%, rgba(44,109,76,0.1) 40%, transparent 70%)",
				}}
			/>

			{/* ── Horizon glow line ── */}
			<div className="glow-line pointer-events-none absolute bottom-[40%] left-0 right-0 opacity-40" />

			{/* ── Floating code snippet (left) ── */}
			<div
				className="pointer-events-none absolute left-[8%] top-[35%] hidden rotate-[-4deg] rounded-lg border border-[#1a1a1a] bg-[#0A0A0B]/90 px-4 py-3 font-mono text-[11px] leading-relaxed opacity-30 backdrop-blur xl:block"
				style={{ animation: "float 6s ease-in-out infinite" }}
			>
				<span className="text-[#34D59A]">const</span>{" "}
				<span className="text-[#C9CBCF]">db</span>{" "}
				<span className="text-[#94979E]">=</span>{" "}
				<span className="text-[#34D59A]">drizzle</span>
				<span className="text-[#94979E]">(</span>
				<span className="text-[#F7B983]">pglite</span>
				<span className="text-[#94979E]">);</span>
			</div>

			{/* ── Floating code snippet (right) ── */}
			<div
				className="pointer-events-none absolute right-[8%] top-[45%] hidden rotate-[3deg] rounded-lg border border-[#1a1a1a] bg-[#0A0A0B]/90 px-4 py-3 font-mono text-[11px] leading-relaxed opacity-25 backdrop-blur xl:block"
				style={{ animation: "float 7s ease-in-out infinite 1s" }}
			>
				<span className="text-[#94979E]">{"// NFC-e emission"}</span>
				<br />
				<span className="text-[#34D59A]">await</span>{" "}
				<span className="text-[#C9CBCF]">sefaz</span>
				<span className="text-[#94979E]">.</span>
				<span className="text-[#F7B983]">emit</span>
				<span className="text-[#94979E]">(</span>
				<span className="text-[#C9CBCF]">invoice</span>
				<span className="text-[#94979E]">);</span>
			</div>

			{/* ── Content ── */}
			<div className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6">
				{/* Badge */}
				<div
					className="mb-10 animate-fade-in inline-flex items-center gap-2 rounded-full border border-[#2C6D4C]/40 bg-[#2C6D4C]/5 px-4 py-1.5 text-[13px] tracking-wide"
				>
					<span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34D59A] shadow-[0_0_6px_rgba(52,213,154,0.8)]" />
					<span className="text-[#34D59A]/90">Open Source POS System</span>
				</div>

				{/* Headline */}
				<h1
					className="animate-fade-in-up max-w-[900px] text-balance text-center font-display font-medium text-[clamp(2.5rem,8vw,5.5rem)] leading-[1.05] tracking-[-0.03em]"
					style={{ animationDelay: "100ms" }}
				>
					{t("title")}{" "}
					<span className="gradient-text">{t("titleAccent")}</span>
				</h1>

				{/* Subtitle */}
				<p
					className="mt-8 max-w-lg animate-fade-in-up text-center text-[17px] leading-[1.7] text-[#7a7d84]"
					style={{ animationDelay: "200ms" }}
				>
					{t("subtitle")}
				</p>

				{/* CTAs */}
				<div
					className="mt-10 flex animate-fade-in-up flex-col gap-3 sm:flex-row sm:gap-4"
					style={{ animationDelay: "300ms" }}
				>
					<a
						href={links.github}
						target="_blank"
						rel="noopener noreferrer"
						className="btn-shimmer group inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#2C6D4C] px-7 py-3.5 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[#34D59A] hover:shadow-[0_0_40px_rgba(52,213,154,0.3)]"
					>
						<Github size={17} className="transition-transform duration-300 group-hover:scale-110" />
						{t("cta")}
					</a>
					<a
						href={`/${locale}/docs`}
						className="inline-flex items-center justify-center gap-2.5 rounded-lg border border-[#222] bg-transparent px-7 py-3.5 text-[15px] font-medium text-[#94979E] transition-all duration-300 hover:border-[#2C6D4C]/50 hover:text-white"
					>
						<BookOpen size={17} />
						{t("ctaSecondary")}
					</a>
				</div>

				{/* Scroll line */}
				<div
					className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-fade-in"
					style={{ animationDelay: "600ms" }}
				>
					<div className="h-12 w-px bg-gradient-to-b from-transparent via-[#2C6D4C]/50 to-transparent" />
				</div>
			</div>
		</section>
	);
}
