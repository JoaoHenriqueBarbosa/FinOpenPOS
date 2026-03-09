"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";

export default function GettingStarted() {
	const t = useTranslations("getStarted");
	const [copied, setCopied] = useState(false);

	const steps = [
		{ comment: t("step1Comment"), command: t("step1") },
		{ comment: t("step2Comment"), command: t("step2") },
		{ comment: t("step3Comment"), command: t("step3") },
	];

	function handleCopy() {
		const commands = steps.map((s) => s.command).join("\n");
		navigator.clipboard.writeText(commands);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<section className="relative py-28 lg:py-36">
			<div className="mx-auto max-w-3xl px-6">
				<p className="mb-4 text-[13px] font-medium uppercase tracking-[0.2em] text-[#2C6D4C]">
					Quick Start
				</p>
				<h2 className="max-w-lg text-[24px] font-normal leading-[1.15] tracking-tighter text-[#94979E] md:text-[28px] lg:text-[40px]">
					{t.rich("title", {
						accent: (chunks: ReactNode) => (
							<strong className="font-normal text-white">{chunks}</strong>
						),
					})}
				</h2>

				{/* Terminal */}
				<div className="group mt-12 overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0A0A0B] transition-colors duration-300 hover:border-[#2C6D4C]/30">
					{/* Terminal header */}
					<div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-3.5">
						<div className="flex items-center gap-3">
							<div className="flex gap-1.5">
								<span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]/80" />
								<span className="h-2.5 w-2.5 rounded-full bg-[#28C840]/80" />
							</div>
							<span className="font-mono text-[11px] text-[#64676F]">terminal</span>
						</div>
						<button
							type="button"
							onClick={handleCopy}
							className={`cursor-pointer rounded-md px-2.5 py-1 font-mono text-[11px] transition-all duration-200 ${
								copied
									? "bg-[#2C6D4C]/10 text-[#34D59A]"
									: "text-[#64676F] hover:bg-white/5 hover:text-white"
							}`}
						>
							{copied ? (
								<span className="flex items-center gap-1.5">
									<Check size={12} /> {t("copied")}
								</span>
							) : (
								<span className="flex items-center gap-1.5">
									<Copy size={12} /> {t("copyTooltip")}
								</span>
							)}
						</button>
					</div>

					{/* Terminal body */}
					<div className="p-5 font-mono text-[13px] leading-[2]">
						{steps.map((step, i) => (
							<div key={i} className={i > 0 ? "mt-3" : ""}>
								<div className="text-[#4E5159]">{step.comment}</div>
								<div className="text-[#C9CBCF]">
									<span className="select-none text-[#34D59A]">$ </span>
									{step.command}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
