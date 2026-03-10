"use client";

import { useParams, usePathname, useRouter } from "next/navigation";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const lang = (params.lang as string) || "en";

  const label = lang === "en" ? "EN" : "PT";
  const nextLang = lang === "en" ? "pt-BR" : "en";

  function handleSwitch() {
    const newPath = pathname.replace(`/${lang}`, `/${nextLang}`);
    router.push(newPath);
  }

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className="cursor-pointer rounded border border-neon-border px-2 py-1 font-medium text-neon-text-muted text-xs uppercase tracking-wider transition-colors duration-200 hover:text-white"
    >
      {label}
    </button>
  );
}
