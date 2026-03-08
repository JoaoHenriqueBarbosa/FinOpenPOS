import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { router } from "./init";
import { productsRouter } from "./routers/products";
import { customersRouter } from "./routers/customers";
import { ordersRouter } from "./routers/orders";
import { transactionsRouter } from "./routers/transactions";
import { paymentMethodsRouter } from "./routers/payment-methods";
import { dashboardRouter } from "./routers/dashboard";
import { fiscalSettingsRouter } from "./routers/fiscal-settings";
import { fiscalRouter } from "./routers/fiscal";
import { citiesRouter } from "./routers/cities";

export const appRouter = router({
  products: productsRouter,
  customers: customersRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
  paymentMethods: paymentMethodsRouter,
  dashboard: dashboardRouter,
  fiscalSettings: fiscalSettingsRouter,
  fiscal: fiscalRouter,
  cities: citiesRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
