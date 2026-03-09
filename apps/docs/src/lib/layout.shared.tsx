import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "FinOpenPOS",
    },
    links: [
      {
        text: "GitHub",
        url: "https://github.com/JoaoHenriqueBarbosa/FinOpenPOS",
      },
    ],
  };
}
