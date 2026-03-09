"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlusCircle, FilePenIcon, TrashIcon, CreditCardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/use-crud-mutation";
import { DataTable, TableActions, TableActionButton, type Column } from "@/components/ui/data-table";
import type { RouterOutputs } from "@/lib/trpc/router";
import { useTranslations } from "next-intl";

type PaymentMethod = RouterOutputs["paymentMethods"]["list"][number];

export default function PaymentMethodsPage() {
  const trpc = useTRPC();
  const { data: methods = [], isLoading, error } = useQuery(trpc.paymentMethods.list.queryOptions());
  const t = useTranslations("paymentMethods");
  const tc = useTranslations("common");

  const paymentMethodSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
  });

  const tableColumns: Column<PaymentMethod>[] = [
    { key: "name", header: tc("name"), sortable: true, className: "font-medium" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isEditing = editingId !== null;
  const invalidateKeys = trpc.paymentMethods.list.queryOptions().queryKey;

  const createMutation = useCrudMutation({
    mutationOptions: trpc.paymentMethods.create.mutationOptions(),
    invalidateKeys,
    successMessage: t("created"),
    errorMessage: t("createError"),
    onSuccess: () => setIsDialogOpen(false),
  });

  const updateMutation = useCrudMutation({
    mutationOptions: trpc.paymentMethods.update.mutationOptions(),
    invalidateKeys,
    successMessage: t("updated"),
    errorMessage: t("updateError"),
    onSuccess: () => setIsDialogOpen(false),
  });

  const deleteMutation = useCrudMutation({
    mutationOptions: trpc.paymentMethods.delete.mutationOptions(),
    invalidateKeys,
    successMessage: t("deleted"),
    errorMessage: t("deleteError"),
  });

  const form = useForm({
    defaultValues: { name: "" },
    validators: {
      onSubmit: paymentMethodSchema,
    },
    onSubmit: ({ value }) => {
      if (isEditing) {
        updateMutation.mutate({ id: editingId, name: value.name });
      } else {
        createMutation.mutate({ name: value.name });
      }
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    form.reset();
    form.setFieldValue("name", m.name);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ id: deleteId });
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const actionsColumn: Column<PaymentMethod> = {
    key: "actions",
    header: tc("actions"),
    headerClassName: "w-[100px]",
    render: (row) => (
      <TableActions>
        <TableActionButton onClick={() => openEdit(row)} icon={<FilePenIcon className="w-4 h-4" />} label={tc("edit")} />
        <TableActionButton variant="danger" onClick={() => { setDeleteId(row.id); setIsDeleteOpen(true); }} icon={<TrashIcon className="w-4 h-4" />} label={tc("delete")} />
      </TableActions>
    ),
  };

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0"><div className="flex items-center justify-between"><Skeleton className="h-5 w-24" /><Skeleton className="h-9 w-28" /></div></CardHeader>
        <CardContent className="p-0 space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-20" /></div>))}</CardContent>
      </Card>
    );
  }

  if (error) { return <Card><CardContent><p className="text-red-500">{error.message}</p></CardContent></Card>; }

  return (
    <Card className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCardIcon className="w-5 h-5" />
            <span className="text-sm">{t("methodCount", { count: methods.length })}</span>
          </div>
          <Button size="sm" onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" />{t("addMethod")}</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={methods}
          columns={[...tableColumns, actionsColumn]}
          emptyMessage={t("noMethods")}
          emptyIcon={<CreditCardIcon className="w-8 h-8" />}
          defaultSort={[{ id: "name", desc: false }]}
        />
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? t("editMethod") : t("newMethod")}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="grid gap-4 py-4">
              <form.Field name="name">
                {(field) => (
                  <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="method-name">{tc("name")}</Label>
                    <div className="col-span-3">
                      <Input
                        id="method-name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={t("namePlaceholder")}
                        error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); form.handleSubmit(); } }}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>{tc("cancel")}</Button>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                    {isEditing ? tc("update") : tc("create")}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description={t("deleteMessage")} />
    </Card>
  );
}
