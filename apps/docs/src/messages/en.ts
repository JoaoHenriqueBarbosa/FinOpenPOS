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
		titleAccent: "you deserve",
		subtitle:
			"A complete point-of-sale system with fiscal integration, built by developers, for everyone. Free, transparent, and community-driven.",
		cta: "View on GitHub",
		ctaSecondary: "Read the Docs",
	},
	problem: {
		text: "Most small businesses can't afford expensive POS systems with fiscal compliance. The few open-source alternatives are outdated, poorly maintained, and lack <highlight>real tax and invoice integration</highlight>. We're changing that.",
		count: "small businesses worldwide",
	},
	techStack: {
		title: "Built with the <accent>best tools</accent> for the job",
		pglite: {
			name: "PGLite",
			description:
				"Embedded PostgreSQL via WASM. No database server to install. Clone, run, develop.",
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
				"Complete tax document and invoice support. Government API communication, digital certificates, document generation.",
		},
		multiTenant: {
			name: "Multi-Tenancy",
			description:
				"One installation, multiple businesses. Each with isolated data and configurations.",
		},
		offline: {
			name: "Zero-Setup Database",
			description:
				"Powered by PGLite — embedded PostgreSQL via WASM. No database server to install or configure. Just run and go.",
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
			"Join {count} developers building the future of open-source POS",
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
