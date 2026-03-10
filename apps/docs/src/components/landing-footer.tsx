import { getTranslations, getLocale } from "next-intl/server";
import { links } from "@/lib/links";

export default async function Footer() {
	const t = await getTranslations("footer");
	const locale = await getLocale();

	return (
		<footer className="border-t border-[#1a1a1a] py-8">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
				<p className="text-[13px] text-[#4E5159]">
					{t("builtWith")}{" "}
					<span className="text-[#64676F]">Next.js, PGLite, Drizzle</span>{" "}
					{t("by")}
				</p>
				<div className="flex gap-6">
					<a
						href={links.github}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[13px] text-[#4E5159] transition-colors hover:text-[#94979E]"
					>
						{t("github")}
					</a>
					<a
						href={`/${locale}/docs`}
						className="text-[13px] text-[#4E5159] transition-colors hover:text-[#94979E]"
					>
						{t("docs")}
					</a>
					<a
						href={links.apiDocs}
						className="text-[13px] text-[#4E5159] transition-colors hover:text-[#94979E]"
					>
						API
					</a>
					<a
						href={links.license}
						target="_blank"
						rel="noopener noreferrer"
						className="text-[13px] text-[#4E5159] transition-colors hover:text-[#94979E]"
					>
						{t("license")}
					</a>
				</div>
			</div>
		</footer>
	);
}
