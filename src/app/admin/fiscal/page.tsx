"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceiptTextIcon, EyeIcon, XCircleIcon, FileDownIcon, RefreshCwIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable, TableActions, TableActionButton, type Column } from "@/components/ui/data-table";
import { SearchFilter, type FilterOption } from "@/components/ui/search-filter";
import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";

type Invoice = {
  id: number;
  model: number;
  series: number;
  number: number;
  access_key: string | null;
  status: string;
  total_amount: number;
  recipient_name: string | null;
  recipient_tax_id: string | null;
  issued_at: string | null;
  is_contingency: boolean | null;
  created_at: string | null;
};

export default function FiscalPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery(trpc.fiscal.list.queryOptions());
  const t = useTranslations("fiscal");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [cancelReason, setCancelReason] = useState("");

  const cancelMutation = useMutation(trpc.fiscal.cancel.mutationOptions({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(t("cancelSuccess"));
        queryClient.invalidateQueries(trpc.fiscal.list.queryOptions());
      } else {
        toast.error(`${t("cancelError")}: ${data.statusMessage}`);
      }
      setCancelDialog({ open: false, id: null });
      setCancelReason("");
    },
    onError: () => toast.error(t("cancelError")),
  }));

  const syncMutation = useMutation(trpc.fiscal.syncPending.mutationOptions({
    onSuccess: (data) => {
      toast.success(t("syncResult", { authorized: data.authorized, total: data.total }));
      queryClient.invalidateQueries(trpc.fiscal.list.queryOptions());
    },
  }));

  const statusOptions: FilterOption[] = [
    { label: tc("all"), value: "all" },
    { label: t("authorized"), value: "authorized", variant: "success" },
    { label: t("pending"), value: "pending", variant: "warning" },
    { label: t("contingency"), value: "contingency", variant: "warning" },
    { label: t("rejected"), value: "rejected", variant: "danger" },
    { label: t("cancelled"), value: "cancelled", variant: "danger" },
  ];

  const modelOptions: FilterOption[] = [
    { label: tc("all"), value: "all" },
    { label: t("nfe"), value: "55" },
    { label: t("nfce"), value: "65" },
  ];

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case "authorized": return "default" as const;
      case "pending": case "contingency": return "secondary" as const;
      case "rejected": case "cancelled": case "denied": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      authorized: t("authorized"), rejected: t("rejected"), cancelled: t("cancelled"),
      denied: t("denied"), pending: t("pending"), voided: t("voided"), contingency: t("contingency"),
    };
    return labels[status] || status;
  };

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: t("number"),
      sortable: true,
      render: (row) => `${row.series}-${String(row.number).padStart(9, "0")}`,
    },
    {
      key: "model",
      header: t("model"),
      sortable: true,
      render: (row) => <Badge variant="outline">{row.model === 65 ? t("nfce") : t("nfe")}</Badge>,
    },
    {
      key: "recipient_name",
      header: t("recipient"),
      hideOnMobile: true,
      render: (row) => row.recipient_name || "—",
    },
    {
      key: "total_amount",
      header: tc("total"),
      sortable: true,
      accessorFn: (row) => row.total_amount,
      render: (row) => formatCurrency(row.total_amount, locale),
    },
    {
      key: "status",
      header: tc("status"),
      sortable: true,
      render: (row) => (
        <Badge variant={statusBadgeVariant(row.status)}>
          {statusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: "issued_at",
      header: t("issuedAt"),
      sortable: true,
      hideOnMobile: true,
      accessorFn: (row) => row.issued_at ? new Date(row.issued_at).getTime() : 0,
      render: (row) => row.issued_at ? new Date(row.issued_at).toLocaleDateString() : "",
    },
  ];

  const actionsColumn: Column<Invoice> = {
    key: "actions",
    header: tc("actions"),
    render: (row) => (
      <TableActions>
        <Link href={`/admin/fiscal/${row.id}`} prefetch={false} onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
        </Link>
        {row.status === "authorized" && (
          <TableActionButton
            variant="danger"
            onClick={() => setCancelDialog({ open: true, id: row.id })}
            icon={<XCircleIcon className="w-4 h-4" />}
            label={t("cancelInvoice")}
          />
        )}
      </TableActions>
    ),
  };

  const filteredInvoices = (invoices as Invoice[]).filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (modelFilter !== "all" && String(inv.model) !== modelFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        (inv.access_key || "").toLowerCase().includes(q) ||
        (inv.recipient_name || "").toLowerCase().includes(q) ||
        String(inv.number).includes(q)
      );
    }
    return true;
  });

  const hasPending = (invoices as Invoice[]).some((i) => i.status === "contingency");

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0"><Skeleton className="h-10 w-48" /></CardHeader>
        <CardContent className="p-0 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-4 w-24" /></div>)}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        <CardHeader className="p-0">
          <SearchFilter
            search={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t("searchPlaceholder")}
            filters={[
              { options: statusOptions, value: statusFilter, onChange: setStatusFilter },
              { options: modelOptions, value: modelFilter, onChange: setModelFilter },
            ]}
          >
            {hasPending && (
              <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                {syncMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : <RefreshCwIcon className="h-4 w-4 mr-2" />}
                {t("syncPending")}
              </Button>
            )}
          </SearchFilter>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredInvoices}
            columns={[...columns, actionsColumn]}
            emptyMessage={t("noInvoices")}
            emptyIcon={<ReceiptTextIcon className="w-8 h-8" />}
            defaultSort={[{ id: "issued_at", desc: true }]}
          />
        </CardContent>
      </Card>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, id: null }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("cancelInvoice")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("cancelReason")}</Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelDialog({ open: false, id: null })}>{tc("cancel")}</Button>
            <Button
              variant="destructive"
              disabled={cancelReason.length < 15 || cancelMutation.isPending}
              onClick={() => cancelDialog.id && cancelMutation.mutate({ id: cancelDialog.id, reason: cancelReason })}
            >
              {cancelMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
              {t("cancelInvoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
