export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrate } = await import("@/lib/db/migrate");
    await migrate();
    const { seed } = await import("@/lib/db/seed");
    await seed();
  }
}
