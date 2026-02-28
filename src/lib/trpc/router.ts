import { router } from "./init";
import { productsRouter } from "./routers/products";
import { customersRouter } from "./routers/customers";
import { ordersRouter } from "./routers/orders";
import { transactionsRouter } from "./routers/transactions";
import { paymentMethodsRouter } from "./routers/payment-methods";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  products: productsRouter,
  customers: customersRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
  paymentMethods: paymentMethodsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
