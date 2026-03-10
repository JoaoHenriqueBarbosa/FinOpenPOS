"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

const COOKIE_NAME = "locale";
const MAX_AGE = 60 * 60 * 24 * 365;

export function LocaleSync() {
  const params = useParams();
  const lang = params?.lang as string | undefined;

  useEffect(() => {
    if (!lang) return;
    document.cookie = `${COOKIE_NAME}=${lang};path=/;max-age=${MAX_AGE};samesite=lax`;
  }, [lang]);

  return null;
}
