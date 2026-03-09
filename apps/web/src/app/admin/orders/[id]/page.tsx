"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@finopenpos/ui/components/card";
import { Badge } from "@finopenpos/ui/components/badge";
import { Button } from "@finopenpos/ui/components/button";
import { Skeleton } from "@finopenpos/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@finopenpos/ui/components/table";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = parseInt(id);
  const trpc = useTRPC();
  const { data: order, isLoading } = useQuery(trpc.orders.get.queryOptions({ id: orderId })) as { data: any; isLoading: boolean };
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  if (!order) {
    return <div className="text-muted-foreground">{t("orderNotFound")}</div>;
  }

  const statusColor = order.status === "completed" ? "text-green-600" : order.status === "cancelled" ? "text-red-600" : "text-yellow-600";
  const statusLabel = order.status === "completed" ? tc("completed") : order.status === "cancelled" ? tc("cancelled") : tc("pending");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon"><ArrowLeftIcon className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("orderDetails")} #{order.id}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("orderDetails")}</CardTitle>
            <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("customer")}</dt>
              <dd className="font-medium">{order.customer?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{tc("total")}</dt>
              <dd className="text-lg font-bold">{formatCurrency(order.total_amount, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("createdAt")}</dt>
              <dd>{order.created_at ? new Date(order.created_at).toLocaleString() : "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {order.orderItems && order.orderItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t("items")}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{tc("category")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("unitPrice")}</TableHead>
                    <TableHead>{t("subtotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.orderItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name ?? `#${item.product_id}`}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.product?.category ? <Badge variant="outline">{item.product.category}</Badge> : "—"}
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.price, locale)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.price * item.quantity, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
