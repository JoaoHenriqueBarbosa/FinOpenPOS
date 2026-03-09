const messages = {
	common: {
		locale: "Português",
		switchLocale: "English",
	},
	header: {
		features: "Funcionalidades",
		docs: "Documentação",
		apiDocs: "API",
		github: "GitHub",
		getStarted: "Começar",
	},
	hero: {
		title: "O PDV open-source que o",
		titleAccent: "Brasil merece",
		subtitle:
			"Um sistema completo de ponto de venda com integração fiscal, construído por desenvolvedores, para todos. Gratuito, transparente e movido pela comunidade.",
		cta: "Ver no GitHub",
		ctaSecondary: "Ler a Documentação",
	},
	problem: {
		text: "A maioria não pode pagar por sistemas de PDV caros com conformidade fiscal. As poucas alternativas open-source são desatualizadas, mal mantidas e não têm <highlight>integração real com NF-e e NFC-e</highlight>. Estamos mudando isso.",
		count: "pequenas empresas no Brasil",
	},
	techStack: {
		title: "Construído com as <accent>melhores ferramentas</accent> para o trabalho",
		pglite: {
			name: "PGLite",
			description:
				"PostgreSQL completo no navegador via WASM. Sem necessidade de servidor. Seus dados ficam com você.",
		},
		nextjs: {
			name: "Next.js 16",
			description:
				"O mais recente framework React com Server Components, Turbopack e a nova arquitetura de proxy.",
		},
		drizzle: {
			name: "Drizzle ORM",
			description:
				"SQL type-safe que parece escrever queries. Zero overhead, máxima experiência do desenvolvedor.",
		},
		tailwind: {
			name: "Tailwind CSS 4",
			description:
				"CSS utility-first reconstruído do zero. Extremamente rápido, incrivelmente poderoso.",
		},
		trpc: {
			name: "tRPC",
			description:
				"APIs type-safe de ponta a ponta. Sem geração de código, sem schemas para manter.",
		},
		betterAuth: {
			name: "Better Auth",
			description:
				"Autenticação moderna que simplesmente funciona. Email/senha, sessões e muito mais.",
		},
	},
	features: {
		title: "Tudo que você precisa para <accent>gerenciar um negócio</accent>",
		pos: {
			name: "Ponto de Venda",
			description:
				"Checkout rápido e intuitivo. Funciona offline com PGLite. Suporta múltiplos métodos de pagamento.",
		},
		fiscal: {
			name: "Integração Fiscal",
			description:
				"Suporte completo a NF-e e NFC-e. Comunicação SEFAZ, certificados digitais, geração de DANFE.",
		},
		multiTenant: {
			name: "Multi-Tenancy",
			description:
				"Uma instalação, múltiplos negócios. Cada um com dados e configurações isolados.",
		},
		offline: {
			name: "Offline-First",
			description:
				"Alimentado por PGLite — PostgreSQL completo no navegador. Sem dependência de servidor para operações diárias.",
		},
		dashboard: {
			name: "Painel Analítico",
			description:
				"Relatórios de vendas, gráficos de receita, insights de clientes. Tudo em tempo real com visualizações bonitas.",
		},
		i18n: {
			name: "Internacionalização",
			description:
				"Suporte integrado para múltiplos idiomas. Atualmente Inglês e Português (Brasil).",
		},
	},
	socialProof: {
		stars: "Estrelas",
		contributors: "Contribuidores",
		commits: "Commits",
		license: "Licença",
		joinMessage:
			"Junte-se a {count} desenvolvedores construindo o futuro do PDV no Brasil",
	},
	getStarted: {
		title: "Funcionando em <accent>menos de um minuto</accent>",
		step1Comment: "# Clone o repositório",
		step1: "git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS.git",
		step2Comment: "# Instale as dependências",
		step2: "cd FinOpenPOS && bun install",
		step3Comment: "# Inicie o servidor de desenvolvimento",
		step3: "bun run dev",
		copyTooltip: "Copiar para área de transferência",
		copied: "Copiado!",
	},
	cta: {
		title: "Pronto para contribuir?",
		subtitle:
			"FinOpenPOS é open-source e movido pela comunidade. Cada contribuição conta.",
		starOnGithub: "Estrelar no GitHub",
		readDocs: "Ler a Documentação",
	},
	footer: {
		builtWith: "Construído com",
		by: "pela comunidade FinOpenPOS",
		github: "GitHub",
		docs: "Documentação",
		license: "Licença MIT",
	},
} as const;

export default messages;

type DeepStringify<T> = {
	[K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Messages = DeepStringify<typeof messages>;
