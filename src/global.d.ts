import type messages from "@/messages/en";

type IntlMessages = typeof messages;

declare module "next-intl" {
  interface AppIntlMessages extends IntlMessages {}
}
