"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage() {
  const t = useTranslations("error");
  return <p>{t("somethingWentWrong")}</p>;
}
