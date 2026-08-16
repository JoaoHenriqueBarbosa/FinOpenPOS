import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { addonRouters } from "@/lib/addons/installed";
import { router } from "./init";
import { customersRouter } from "./routers/customers";
import { dashboardRouter } from "./routers/dashboard";
import { ordersRouter } from "./routers/orders";
import { paymentMethodsRouter } from "./routers/payment-methods";
import { productsRouter } from "./routers/products";
import { transactionsRouter } from "./routers/transactions";

export const appRouter = router({
	products: productsRouter,
	customers: customersRouter,
	orders: ordersRouter,
	transactions: transactionsRouter,
	paymentMethods: paymentMethodsRouter,
	dashboard: dashboardRouter,
	// Routers contribuídos pelos addons instalados (fiscal, ...)
	...addonRouters,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
