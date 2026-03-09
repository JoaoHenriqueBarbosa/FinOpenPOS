import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

const techs = [
	{ key: "pglite", color: "#34D59A" },
	{ key: "nextjs", color: "#ffffff" },
	{ key: "drizzle", color: "#37C38F" },
	{ key: "tailwind", color: "#34D59A" },
	{ key: "trpc", color: "#2C6D4C" },
	{ key: "betterAuth", color: "#37C38F" },
] as const;

export default async function TechStack() {
	const t = await getTranslations("techStack");

	return (
		<section className="relative overflow-hidden py-28 lg:py-36">
			{/* Top edge glow */}
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2C6D4C]/20 to-transparent" />

			<div className="mx-auto max-w-6xl px-6">
				<p className="mb-4 text-[13px] font-medium uppercase tracking-[0.2em] text-[#2C6D4C]">
					Tech Stack
				</p>
				<h2 className="max-w-2xl indent-0 text-[24px] font-normal leading-[1.15] tracking-tighter text-[#94979E] md:text-[32px] lg:indent-20 lg:text-[44px]">
					{t.rich("title", {
						accent: (chunks: ReactNode) => (
							<strong className="font-normal text-white">
								{chunks}
							</strong>
						),
					})}
				</h2>

				{/* Tech list — editorial */}
				<div className="mt-16 space-y-0 divide-y divide-[#1a1a1a]">
					{techs.map((tech, i) => (
						<div
							key={tech.key}
							className="group grid grid-cols-1 items-baseline gap-4 py-6 transition-colors duration-300 md:grid-cols-[120px_1fr_2fr] md:gap-8 md:py-8"
						>
							<span className="font-mono text-[12px] uppercase tracking-widest text-[#2C6D4C]/40">
								0{i + 1}
							</span>
							<h3 className="text-[20px] font-medium tracking-tight text-white/90 transition-colors group-hover:text-[#34D59A] md:text-[22px]">
								{t(`${tech.key}.name`)}
							</h3>
							<p className="text-[15px] leading-[1.7] text-[#64676F]">
								{t(`${tech.key}.description`)}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
