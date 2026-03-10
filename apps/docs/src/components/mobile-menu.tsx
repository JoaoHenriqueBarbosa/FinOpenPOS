"use client";

import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LocaleSwitcher } from "./locale-switcher";

interface MobileMenuProps {
	links: { href: string; key: string; label: string }[];
	ctaLabel: string;
	ctaHref: string;
}

export function MobileMenu({ links, ctaLabel, ctaHref }: MobileMenuProps) {
	const [isOpen, setIsOpen] = useState(false);

	const close = useCallback(() => setIsOpen(false), []);

	// Lock body scroll when menu is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	// Close on escape key
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") close();
		}
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [isOpen, close]);

	return (
		<>
			{/* Hamburger button */}
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-neon-text-muted transition-colors duration-200 hover:text-white"
				aria-label="Open menu"
			>
				<Menu className="h-5 w-5" />
			</button>

			{/* Overlay */}
			<div
				className={`fixed inset-0 z-50 transition-all duration-300 ${
					isOpen
						? "visible opacity-100"
						: "pointer-events-none invisible opacity-0"
				}`}
			>
				{/* Backdrop */}
				<button
					type="button"
					className="absolute inset-0 cursor-default bg-[#0C0D0D]/95 backdrop-blur-[20px]"
					onClick={close}
					aria-label="Close menu"
					tabIndex={-1}
				/>

				{/* Menu panel */}
				<div
					className={`relative flex h-full flex-col transition-transform duration-300 ease-out ${
						isOpen ? "translate-y-0" : "-translate-y-4"
					}`}
				>
					{/* Close button row */}
					<div className="flex h-16 items-center justify-between px-6">
						{/* Logo duplicate for visual consistency */}
						<div className="flex items-center gap-2">
							<span className="relative flex h-1.5 w-1.5">
								<span className="absolute inline-flex h-full w-full animate-[pulse_2s_ease-in-out_infinite] rounded-full bg-neon-accent opacity-75" />
								<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon-accent shadow-[0_0_8px_rgba(52,213,154,0.6)]" />
							</span>
							<span className="font-medium text-base text-white tracking-tight">
								FinOpenPOS
							</span>
						</div>
						<button
							type="button"
							onClick={close}
							className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-neon-text-muted transition-colors duration-200 hover:text-white"
							aria-label="Close menu"
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					{/* Navigation links */}
					<div className="flex flex-1 flex-col items-center justify-center gap-8 bg-[#0C0D0D]">
						{links.map((link, i) => (
							<a
								key={link.key}
								href={link.href}
								onClick={close}
								className={`font-medium text-2xl text-neon-text-muted transition-all duration-300 hover:text-white ${
									isOpen
										? "translate-y-0 opacity-100"
										: "translate-y-4 opacity-0"
								}`}
								style={{
									transitionDelay: isOpen ? `${(i + 1) * 75}ms` : "0ms",
								}}
								{...(link.href.startsWith("http")
									? { target: "_blank", rel: "noopener noreferrer" }
									: {})}
							>
								{link.label}
							</a>
						))}

						{/* CTA button */}
						<a
							href={ctaHref}
							onClick={close}
							className={`mt-4 rounded-md bg-neon-green px-8 py-3 font-medium text-base text-white transition-all duration-300 hover:bg-neon-accent hover:shadow-[0_0_20px_rgba(52,213,154,0.3)] ${
								isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
							}`}
							style={{
								transitionDelay: isOpen
									? `${(links.length + 1) * 75}ms`
									: "0ms",
							}}
						>
							{ctaLabel}
						</a>

						{/* Locale switcher */}
						<div
							className={`mt-2 transition-all duration-300 ${
								isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
							}`}
							style={{
								transitionDelay: isOpen
									? `${(links.length + 2) * 75}ms`
									: "0ms",
							}}
						>
							<LocaleSwitcher />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
