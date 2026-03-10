"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";

const DEMO_HOST = "fin-open-pos.johnenrique.tech";
const STORAGE_KEY = "cookie-consent";

const messages = {
  en: {
    text: "This demo uses essential cookies only for authentication and session management.",
    accept: "Accept",
    learnMore: "Learn more",
  },
  "pt-BR": {
    text: "Esta demo utiliza apenas cookies essenciais para autenticação e gerenciamento de sessão.",
    accept: "Aceitar",
    learnMore: "Saiba mais",
  },
} as const;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  const lang = locale === "pt-BR" ? "pt-BR" : "en";
  const t = messages[lang];

  useEffect(() => {
    if (window.location.hostname !== DEMO_HOST) return;
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setMounted(false);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  const privacyUrl = `${window.location.origin}/${lang}/docs/legal/privacy`;

  return (
    <div
      className={`fixed right-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-out ${
        mounted ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <p className="flex-1 text-center text-sm text-muted-foreground sm:text-left">
            {t.text}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <a
              href={privacyUrl}
              className="rounded border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.learnMore}
            </a>
            <button
              type="button"
              onClick={handleAccept}
              className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
