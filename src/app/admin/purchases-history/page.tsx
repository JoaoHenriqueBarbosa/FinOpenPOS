"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PurchasesHistoryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/purchases");
  }, [router]);

  return null;
}
