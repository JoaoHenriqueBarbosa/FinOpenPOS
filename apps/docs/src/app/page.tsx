import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center text-center px-4">
      <h1 className="mb-4 text-4xl font-bold">FinOpenPOS</h1>
      <p className="mb-8 text-lg text-fd-muted-foreground">
        Open-source Point of Sale system documentation
      </p>
      <Link
        href="/docs"
        className="rounded-lg bg-fd-primary px-6 py-3 text-fd-primary-foreground font-medium hover:bg-fd-primary/90 transition-colors"
      >
        Read the Docs
      </Link>
    </main>
  );
}
