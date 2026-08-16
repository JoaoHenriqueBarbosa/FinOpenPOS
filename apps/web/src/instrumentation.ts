export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		// Boot dos addons antes de qualquer request (setup + contexto)
		const { bootAddons, seedInstalledAddons } = await import(
			"@/lib/addons/bootstrap"
		);
		await bootAddons();

		const { seed } = await import("@/lib/db/seed");
		await seed();

		// Seeds dos addons (dados de referência, ex.: municípios IBGE)
		await seedInstalledAddons();
	}
}
