"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/locale";
import { locales, type Locale } from "@/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@finopenpos/ui/components/select";

const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  async function onChange(value: string) {
    await setLocale(value as Locale);
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={onChange}>
      <SelectTrigger className="w-[130px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((loc) => (
          <SelectItem key={loc} value={loc}>
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
