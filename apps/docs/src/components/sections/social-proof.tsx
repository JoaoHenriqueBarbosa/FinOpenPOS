import { getTranslations } from "@/lib/translations-server";
import { getContributors, getGitHubStats } from "../../lib/github";
import type { Messages } from "@/messages/en";

export default async function SocialProof({ locale, messages }: { locale: string; messages: Messages }) {
	const t = getTranslations(messages, "socialProof");
	const [stats, contributors] = await Promise.all([
		getGitHubStats(),
		getContributors(),
	]);

	const statItems = [
		{ value: stats.stars, label: t("stars") },
		{ value: stats.contributors, label: t("contributors") },
		{ value: stats.forks, label: t("commits") },
	].filter((s): s is NonNullable<typeof s> => s !== null && s.value > 0);

	if (statItems.length === 0 && contributors.length === 0) return null;

	return (
		<section className="relative py-28 lg:py-36">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1a1a1a] to-transparent" />

			<div className="mx-auto max-w-5xl px-6">
				{statItems.length > 0 && (
					<div className="grid grid-cols-3 gap-8 border-b border-[#1a1a1a] pb-12">
						{statItems.map((stat) => (
							<div key={stat.label}>
								<span className="block font-display text-[clamp(2rem,5vw,4rem)] font-light tracking-tight text-white">
									{stat.value}
								</span>
								<span className="mt-1 block text-[12px] font-medium uppercase tracking-[0.15em] text-[#64676F]">
									{stat.label}
								</span>
							</div>
						))}
					</div>
				)}

				{contributors.length > 0 && (
					<div className="mt-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
						<p className="max-w-sm text-[15px] leading-relaxed text-[#64676F]">
							{t("joinMessage", { count: String(stats.contributors) })}
						</p>
						<div className="flex -space-x-3">
							{contributors.map((c) => (
								<a
									key={c.login}
									href={c.profileUrl}
									target="_blank"
									rel="noopener noreferrer"
									title={c.login}
									className="relative transition-transform duration-200 hover:z-10 hover:scale-110"
								>
									<img
										src={c.avatarUrl}
										alt={c.login}
										width={36}
										height={36}
										className="h-9 w-9 rounded-full border-2 border-[#0C0D0D] grayscale transition-all duration-200 hover:grayscale-0"
									/>
								</a>
							))}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
