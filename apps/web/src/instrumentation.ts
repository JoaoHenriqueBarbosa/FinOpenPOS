export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seed } = await import("@/lib/db/seed");
    await seed();
  }
}
