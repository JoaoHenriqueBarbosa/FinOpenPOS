"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "cookie-consent";

const messages = {
  en: {
    text: "This site uses essential cookies only for authentication and session management.",
    accept: "Accept",
    learnMore: "Learn more",
  },
  "pt-BR": {
    text: "Este site utiliza apenas cookies essenciais para autenticacao e gerenciamento de sessao.",
    accept: "Aceitar",
    learnMore: "Saiba mais",
  },
} as const;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const lang = params?.lang === "pt-BR" ? "pt-BR" : "en";
  const t = messages[lang];

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMounted(true);
        });
      });
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setMounted(false);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed right-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-out ${
        mounted ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-neon-border border-t bg-[#0C0D0D]/95 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <p className="flex-1 text-center text-sm text-neon-text-secondary sm:text-left">
            {t.text}
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href={`/${lang}/docs/legal/privacy`}
              className="border-neon-border rounded border px-3 py-1.5 text-sm text-neon-text-secondary transition-colors duration-200 hover:text-white"
            >
              {t.learnMore}
            </Link>
            <button
              onClick={handleAccept}
              className="rounded bg-neon-green px-4 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:bg-neon-accent hover:shadow-[0_0_20px_rgba(52,213,154,0.3)]"
            >
              {t.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
