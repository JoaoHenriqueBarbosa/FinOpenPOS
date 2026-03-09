const messages = {
	common: {
		locale: "English",
		switchLocale: "Português",
	},
	header: {
		features: "Features",
		docs: "Documentation",
		apiDocs: "API",
		github: "GitHub",
		demo: "Live Demo",
		getStarted: "Get Started",
	},
	hero: {
		title: "The open-source POS",
		titleAccent: "Brazil deserves",
		subtitle:
			"A complete point-of-sale system with fiscal integration, built by developers, for everyone. Free, transparent, and community-driven.",
		cta: "View on GitHub",
		ctaSecondary: "Read the Docs",
	},
	problem: {
		text: "Most can't afford expensive POS systems with fiscal compliance. The few open-source alternatives are outdated, poorly maintained, and lack <highlight>real NF-e and NFC-e integration</highlight>. We're changing that.",
		count: "small businesses in Brazil",
	},
	techStack: {
		title: "Built with the <accent>best tools</accent> for the job",
		pglite: {
			name: "PGLite",
			description:
				"Full PostgreSQL in the browser via WASM. No server needed. Your data stays with you.",
		},
		nextjs: {
			name: "Next.js 16",
			description:
				"The latest React framework with Server Components, Turbopack, and the new proxy architecture.",
		},
		drizzle: {
			name: "Drizzle ORM",
			description:
				"Type-safe SQL that feels like writing queries. Zero overhead, maximum developer experience.",
		},
		tailwind: {
			name: "Tailwind CSS 4",
			description:
				"Utility-first CSS rebuilt from the ground up. Lightning-fast, incredibly powerful.",
		},
		trpc: {
			name: "tRPC",
			description:
				"End-to-end type-safe APIs. No code generation, no schemas to maintain.",
		},
		betterAuth: {
			name: "Better Auth",
			description:
				"Modern authentication that just works. Email/password, sessions, and more.",
		},
	},
	features: {
		title: "Everything you need to <accent>run a business</accent>",
		pos: {
			name: "Point of Sale",
			description:
				"Fast, intuitive checkout. Works offline with PGLite. Supports multiple payment methods.",
		},
		fiscal: {
			name: "Fiscal Integration",
			description:
				"Complete NF-e and NFC-e support. SEFAZ communication, digital certificates, DANFE generation.",
		},
		multiTenant: {
			name: "Multi-Tenancy",
			description:
				"One installation, multiple businesses. Each with isolated data and configurations.",
		},
		offline: {
			name: "Offline-First",
			description:
				"Powered by PGLite — full PostgreSQL in the browser. No server dependency for daily operations.",
		},
		dashboard: {
			name: "Analytics Dashboard",
			description:
				"Sales reports, revenue charts, customer insights. All in real-time with beautiful visualizations.",
		},
		i18n: {
			name: "Internationalization",
			description:
				"Built-in support for multiple languages. Currently English and Portuguese (Brazil).",
		},
	},
	socialProof: {
		stars: "Stars",
		contributors: "Contributors",
		commits: "Commits",
		license: "License",
		joinMessage:
			"Join {count} developers building the future of POS in Brazil",
	},
	getStarted: {
		title: "Up and running in <accent>under a minute</accent>",
		step1Comment: "# Clone the repository",
		step1: "git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS.git",
		step2Comment: "# Install dependencies",
		step2: "cd FinOpenPOS && bun install",
		step3Comment: "# Start development server",
		step3: "bun run dev",
		copyTooltip: "Copy to clipboard",
		copied: "Copied!",
	},
	cta: {
		title: "Ready to contribute?",
		subtitle:
			"FinOpenPOS is open-source and community-driven. Every contribution counts.",
		starOnGithub: "Star on GitHub",
		readDocs: "Read the Docs",
	},
	footer: {
		builtWith: "Built with",
		by: "by the FinOpenPOS community",
		github: "GitHub",
		docs: "Documentation",
		license: "MIT License",
	},
} as const;

export default messages;

type DeepStringify<T> = {
	[K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Messages = DeepStringify<typeof messages>;
