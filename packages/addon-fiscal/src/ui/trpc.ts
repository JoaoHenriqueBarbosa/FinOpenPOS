"use client";

import { useAddonTRPC } from "@finopenpos/addon-kit/ui";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { FiscalRouter } from "../routers";

/** Cliente tRPC do host tipado com o recorte deste addon. */
export function useFiscalTRPC(): TRPCOptionsProxy<FiscalRouter> {
	return useAddonTRPC<TRPCOptionsProxy<FiscalRouter>>();
}
