import { getTranslations } from "next-intl/server";

export default async function Problem() {
	const t = await getTranslations("problem");

	return (
		<section className="relative py-32 lg:py-44">
			{/* Left accent line */}
			<div className="absolute bottom-0 left-[10%] top-0 hidden w-px bg-gradient-to-b from-transparent via-[#2C6D4C]/20 to-transparent lg:block" />

			<div className="mx-auto max-w-6xl px-6">
				{/* Big number + text layout */}
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr] lg:gap-16">
					{/* Large stat */}
					<div className="flex flex-col">
						<span className="font-display text-[80px] font-light leading-none tracking-tighter text-[#2C6D4C] lg:text-[120px]">
							20M
						</span>
						<span className="mt-2 text-[13px] font-medium uppercase tracking-[0.15em] text-[#4E5159]">
							{t("count")}
						</span>
					</div>

					{/* Storytelling text */}
					<p className="text-[24px] font-normal leading-[1.4] tracking-tighter text-[#94979E] md:text-[32px] lg:text-[40px]">
						{t.rich("text", {
							highlight: (chunks) => (
								<strong className="font-normal text-white">{chunks}</strong>
							),
						})}
					</p>
				</div>
			</div>
		</section>
	);
}
