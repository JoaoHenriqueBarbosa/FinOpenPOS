import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;
  redirect(`/${lang}/docs`);
}
