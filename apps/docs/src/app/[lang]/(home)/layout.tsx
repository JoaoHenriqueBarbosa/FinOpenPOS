"use client";

import { useEffect, type ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.classList.contains("dark");
    html.classList.add("dark");
    html.style.colorScheme = "dark";

    return () => {
      if (!prev) {
        html.classList.remove("dark");
        html.style.colorScheme = "";
      }
    };
  }, []);

  return <>{children}</>;
}
