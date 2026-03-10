import type { Messages } from "@/messages/en";

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

export async function loadMessages(locale: string): Promise<Messages> {
  if (locale === "pt-BR") {
    return (await import("@/messages/pt-BR")).default;
  }
  return (await import("@/messages/en")).default;
}

export function getTranslations(messages: Messages, ns: Namespace) {
  const section = messages[ns] as Record<string, NestedValue>;

  function t(key: string, vars?: Record<string, string | number>): string {
    let str = resolve(section as Record<string, unknown>, key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  return t;
}
