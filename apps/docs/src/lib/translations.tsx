"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { Messages } from "@/messages/en";

interface TranslationContext {
  messages: Messages;
  locale: string;
}

const Ctx = createContext<TranslationContext | null>(null);

export function TranslationProvider({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ messages, locale }}>{children}</Ctx.Provider>;
}

type Namespace = keyof Messages;
type NestedValue = string | Record<string, unknown>;

function resolve(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

function richParse(
  template: string,
  components: Record<string, (children: ReactNode) => ReactNode>,
): ReactNode {
  const regex = /<(\w+)>(.*?)<\/\1>/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push(template.slice(lastIndex, match.index));
    }
    const tag = match[1];
    const inner = match[2];
    const fn = components[tag];
    parts.push(fn ? <span key={++key}>{fn(inner)}</span> : inner);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}

export function useTranslations(ns: Namespace) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TranslationProvider missing");

  const section = ctx.messages[ns] as Record<string, NestedValue>;

  function t(key: string, vars?: Record<string, string | number>): string {
    let str = resolve(section as Record<string, unknown>, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  t.rich = (
    key: string,
    components: Record<string, (children: ReactNode) => ReactNode>,
  ): ReactNode => {
    const str = resolve(section as Record<string, unknown>, key);
    return richParse(str, components);
  };

  return t;
}

export function useLocale(): string {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TranslationProvider missing");
  return ctx.locale;
}
