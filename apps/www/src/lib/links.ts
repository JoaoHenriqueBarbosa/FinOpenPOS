import { env } from "@finopenpos/env/web";

export const links = {
	github: "https://github.com/JoaoHenriqueBarbosa/FinOpenPOS",
	docs: env.NEXT_PUBLIC_DOCS_URL,
	apiDocs: env.NEXT_PUBLIC_API_DOCS_URL,
	license: "https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/main/LICENSE",
} as const;
