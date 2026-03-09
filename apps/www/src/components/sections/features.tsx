"use client";

import {
	BarChart3,
	FileText,
	Languages,
	ShoppingCart,
	Users,
	Database,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRef, useEffect } from "react";

const features = [
	{
		key: "pos",
		icon: ShoppingCart,
		span: "md:col-span-2",
		visual: "terminal",
	},
	{ key: "fiscal", icon: FileText, span: "", visual: "code" },
	{ key: "multiTenant", icon: Users, span: "", visual: null },
	{ key: "offline", icon: Database, span: "", visual: null },
	{ key: "dashboard", icon: BarChart3, span: "", visual: "chart" },
	{ key: "i18n", icon: Languages, span: "md:col-span-2", visual: null },
] as const;

function MiniTerminal() {
	return (
		<div className="mt-4 overflow-hidden rounded-md border border-[#1a1a1a] bg-[#0A0A0B] p-3 font-mono text-[10px] leading-relaxed">
			<span className="text-[#34D59A]">$</span>{" "}
			<span className="text-[#64676F]">Total: R$</span>
			<span className="text-white">42,90</span>
			<br />
			<span className="text-[#34D59A]">$</span>{" "}
			<span className="text-[#64676F]">Payment:</span>{" "}
			<span className="text-[#34D59A]">PIX</span>
			<br />
			<span className="text-[#34D59A]">✓</span>{" "}
			<span className="text-[#64676F]">Sale completed</span>
		</div>
	);
}

function MiniCode() {
	return (
		<div className="mt-4 overflow-hidden rounded-md border border-[#1a1a1a] bg-[#0A0A0B] p-3 font-mono text-[10px] leading-relaxed">
			<span className="text-[#34D59A]">await</span>{" "}
			<span className="text-[#C9CBCF]">sefaz.</span>
			<span className="text-[#F7B983]">authorize</span>
			<span className="text-[#94979E]">(</span>
			<span className="text-[#C9CBCF]">nfce</span>
			<span className="text-[#94979E]">)</span>
			<br />
			<span className="text-[#64676F]">// status: 100 - Autorizada</span>
		</div>
	);
}

function MiniChart() {
	return (
		<div className="mt-4 flex items-end gap-1.5">
			{[35, 55, 40, 70, 50, 80, 65].map((h, i) => (
				<div
					key={i}
					className="w-full rounded-sm bg-[#2C6D4C]/30 transition-all duration-300 hover:bg-[#34D59A]/50"
					style={{ height: `${h}%`, maxHeight: "48px", minHeight: `${h * 0.48}px` }}
				/>
			))}
		</div>
	);
}

function BentoCard({
	children,
	className = "",
	onMouseMove,
}: {
	children: ReactNode;
	className?: string;
	onMouseMove?: (e: React.MouseEvent) => void;
}) {
	const ref = useRef<HTMLDivElement>(null);

	function handleMouseMove(e: React.MouseEvent) {
		if (!ref.current) return;
		const rect = ref.current.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 100;
		const y = ((e.clientY - rect.top) / rect.height) * 100;
		ref.current.style.setProperty("--mouse-x", `${x}%`);
		ref.current.style.setProperty("--mouse-y", `${y}%`);
	}

	return (
		<div
			ref={ref}
			onMouseMove={handleMouseMove}
			className={`bento-card group relative overflow-hidden rounded-2xl p-6 ${className}`}
		>
			<div
				className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
				style={{
					background:
						"radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(52,213,154,0.06), transparent 40%)",
				}}
			/>
			<div className="relative z-10 flex h-full flex-col justify-between">
				{children}
			</div>
		</div>
	);
}

export default function Features() {
	const t = useTranslations("features");

	return (
		<section id="features" className="relative py-32 lg:py-44">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2C6D4C]/30 to-transparent" />

			<div className="mx-auto max-w-6xl px-6">
				<p className="mb-4 text-[13px] font-medium uppercase tracking-[0.2em] text-[#2C6D4C]">
					Features
				</p>
				<h2 className="max-w-2xl text-[28px] font-normal leading-[1.15] tracking-tighter text-[#94979E] md:text-[36px] lg:text-[48px]">
					{t.rich("title", {
						accent: (chunks: ReactNode) => (
							<strong className="font-normal text-white">{chunks}</strong>
						),
					})}
				</h2>

				<div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-4">
					{features.map(({ key, icon: Icon, span, visual }) => (
						<BentoCard key={key} className={span}>
							<div>
								<Icon
									size={22}
									strokeWidth={1.5}
									className="text-[#34D59A] transition-transform duration-500 group-hover:scale-110"
								/>
								<h3 className="mt-3 font-medium text-[15px] text-white/90 tracking-tight">
									{t(`${key}.name`)}
								</h3>
								<p className="mt-1.5 text-[13px] leading-relaxed text-[#64676F]">
									{t(`${key}.description`)}
								</p>
							</div>
							{visual === "terminal" && <MiniTerminal />}
							{visual === "code" && <MiniCode />}
							{visual === "chart" && <MiniChart />}
						</BentoCard>
					))}
				</div>
			</div>
		</section>
	);
}
