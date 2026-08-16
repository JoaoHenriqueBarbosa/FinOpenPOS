import type { AddonContext } from "@finopenpos/addon-kit";
import { sql } from "drizzle-orm";
import type { FiscalDb } from "./context";
import { cities } from "./schema";

const STATES = [
	"AC",
	"AL",
	"AM",
	"AP",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MG",
	"MS",
	"MT",
	"PA",
	"PB",
	"PE",
	"PI",
	"PR",
	"RJ",
	"RN",
	"RO",
	"RR",
	"RS",
	"SC",
	"SE",
	"SP",
	"TO",
];

/** Popula os municípios do IBGE (dados de referência do addon fiscal). */
export async function seedFiscal(ctx: AddonContext): Promise<void> {
	const db = ctx.db as FiscalDb;

	const existingCities = await db
		.select({ count: sql<number>`count(*)` })
		.from(cities);

	if (Number(existingCities[0]?.count ?? 0) > 0) return;

	let total = 0;

	for (const uf of STATES) {
		try {
			const res = await fetch(
				`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
			);
			if (!res.ok) {
				ctx.logger.warn(`Failed to fetch cities for ${uf}: ${res.status}`);
				continue;
			}

			const data: Array<{ id: number; nome: string }> = await res.json();

			if (data.length > 0) {
				// Insert in batches of 500 to avoid query size limits
				for (let i = 0; i < data.length; i += 500) {
					const batch = data.slice(i, i + 500);
					await db.insert(cities).values(
						batch.map((city) => ({
							id: city.id,
							name: city.nome,
							state_code: uf,
						})),
					);
				}
				total += data.length;
			}
		} catch (err) {
			ctx.logger.warn(`Error fetching cities for ${uf}:`, err);
		}
	}

	ctx.logger.info(`[addon:fiscal] seeded ${total} cities`);
}
