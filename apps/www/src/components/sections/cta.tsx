import { Github } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { links } from "@/lib/links";

export default async function CTA() {
	const t = await getTranslations("cta");

	return (
		<section className="relative overflow-hidden py-32 lg:py-44">
			{/* Gradient orb */}
			<div
				className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
				style={{
					background: "radial-gradient(circle, rgba(52,213,154,0.15) 0%, transparent 70%)",
				}}
			/>

			<div className="relative mx-auto max-w-3xl px-6 text-center">
				<h2 className="font-display font-medium text-[clamp(2rem,7vw,5rem)] leading-[0.95] tracking-[-0.03em] text-white">
					{t("title")}
				</h2>

				<p className="mx-auto mt-6 max-w-md text-[17px] leading-[1.7] text-[#64676F]">
					{t("subtitle")}
				</p>

				<div className="mt-10">
					<a
						href={links.github}
						target="_blank"
						rel="noopener noreferrer"
						className="btn-shimmer group inline-flex items-center gap-2.5 rounded-lg bg-[#2C6D4C] px-8 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[#34D59A] hover:shadow-[0_0_50px_rgba(52,213,154,0.25)]"
					>
						<Github size={18} className="transition-transform duration-300 group-hover:scale-110" />
						{t("starOnGithub")}
					</a>
				</div>
			</div>
		</section>
	);
}
