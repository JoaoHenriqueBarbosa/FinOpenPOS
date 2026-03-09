"use client";

import { useState, useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Button } from "@finopenpos/ui/components/button";
import { Card, CardContent, CardHeader } from "@finopenpos/ui/components/card";
import { FilePenIcon, TrashIcon, PlusIcon, PackageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@finopenpos/ui/components/dialog";
import { Input } from "@finopenpos/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@finopenpos/ui/components/select";
import { Label } from "@finopenpos/ui/components/label";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@finopenpos/ui/components/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/use-crud-mutation";
import { DataTable, TableActions, TableActionButton, type Column, type ExportColumn } from "@finopenpos/ui/components/data-table";
import { SearchFilter, type FilterOption } from "@finopenpos/ui/components/search-filter";
import type { RouterOutputs } from "@/lib/trpc/router";
import { useTranslations, useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";

type Product = RouterOutputs["products"]["list"][number];

export default function Products() {
  const trpc = useTRPC();
  const { data: products = [], isLoading } = useQuery(trpc.products.list.queryOptions());
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const locale = useLocale();

  const productFormSchema = z.object({
    name: z.string().min(1, t("nameRequired")),
    description: z.string(),
    price: z.number().min(0, t("priceMustBePositive")),
    in_stock: z.number().int().min(0, t("stockMustBeNonNegative")),
    category: z.string(),
    ncm: z.string(),
    cfop: z.string(),
    icms_cst: z.string(),
    pis_cst: z.string(),
    cofins_cst: z.string(),
    unit_of_measure: z.string(),
  });

  const categoryFilterOptions: FilterOption[] = [
    { label: tc("all"), value: "all" },
    { label: t("electronics"), value: "electronics" },
    { label: t("home"), value: "home" },
    { label: t("health"), value: "health" },
  ];

  const stockFilterOptions: FilterOption[] = [
    { label: t("allStock"), value: "all" },
    { label: t("inStock"), value: "in-stock", variant: "success" },
    { label: t("outOfStock"), value: "out-of-stock", variant: "danger" },
  ];

  const columns: Column<Product>[] = [
    { key: "name", header: t("product"), sortable: true, className: "font-medium" },
    { key: "description", header: tc("description"), hideOnMobile: true },
    {
      key: "price",
      header: tc("price"),
      sortable: true,
      accessorFn: (row) => row.price,
      render: (row) => formatCurrency(row.price, locale),
    },
    { key: "in_stock", header: t("stock"), sortable: true },
  ];

  const exportColumns: ExportColumn<Product>[] = [
    { key: "name", header: tc("name"), getValue: (p) => p.name },
    { key: "description", header: tc("description"), getValue: (p) => p.description ?? "" },
    { key: "price", header: tc("price"), getValue: (p) => (p.price / 100).toFixed(2) },
    { key: "in_stock", header: t("stock"), getValue: (p) => p.in_stock },
    { key: "category", header: tc("category"), getValue: (p) => p.category ?? "" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  const isEditing = editingId !== null;
  const invalidateKeys = trpc.products.list.queryOptions().queryKey;

  const createMutation = useCrudMutation({
    mutationOptions: trpc.products.create.mutationOptions(),
    invalidateKeys,
    successMessage: t("created"),
    errorMessage: t("createError"),
    onSuccess: () => setIsDialogOpen(false),
  });

  const updateMutation = useCrudMutation({
    mutationOptions: trpc.products.update.mutationOptions(),
    invalidateKeys,
    successMessage: t("updated"),
    errorMessage: t("updateError"),
    onSuccess: () => setIsDialogOpen(false),
  });

  const deleteMutation = useCrudMutation({
    mutationOptions: trpc.products.delete.mutationOptions(),
    invalidateKeys,
    successMessage: t("deleted"),
    errorMessage: t("deleteError"),
  });

  const form = useForm({
    defaultValues: { name: "", description: "", price: 0, in_stock: 0, category: "", ncm: "", cfop: "", icms_cst: "", pis_cst: "", cofins_cst: "", unit_of_measure: "" },
    validators: {
      onSubmit: productFormSchema,
    },
    onSubmit: ({ value }) => {
      const payload = {
        name: value.name,
        description: value.description || undefined,
        price: Math.round(value.price * 100),
        in_stock: value.in_stock,
        category: value.category || undefined,
        ncm: value.ncm || undefined,
        cfop: value.cfop || undefined,
        icms_cst: value.icms_cst || undefined,
        pis_cst: value.pis_cst || undefined,
        cofins_cst: value.cofins_cst || undefined,
        unit_of_measure: value.unit_of_measure || undefined,
      };
      if (isEditing) {
        updateMutation.mutate({ id: editingId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (stockFilter === "in-stock" && p.in_stock === 0) return false;
      if (stockFilter === "out-of-stock" && p.in_stock > 0) return false;
      return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [products, categoryFilter, stockFilter, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    form.reset();
    form.setFieldValue("name", p.name);
    form.setFieldValue("description", p.description ?? "");
    form.setFieldValue("price", p.price / 100);
    form.setFieldValue("in_stock", p.in_stock);
    form.setFieldValue("category", p.category ?? "");
    form.setFieldValue("ncm", p.ncm ?? "");
    form.setFieldValue("cfop", p.cfop ?? "");
    form.setFieldValue("icms_cst", p.icms_cst ?? "");
    form.setFieldValue("pis_cst", p.pis_cst ?? "");
    form.setFieldValue("cofins_cst", p.cofins_cst ?? "");
    form.setFieldValue("unit_of_measure", p.unit_of_measure ?? "");
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ id: deleteId });
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const actionsColumn: Column<Product> = {
    key: "actions",
    header: tc("actions"),
    render: (row) => (
      <TableActions>
        <TableActionButton onClick={() => openEdit(row)} icon={<FilePenIcon className="w-4 h-4" />} label={tc("edit")} />
        <TableActionButton variant="danger" onClick={() => { setDeleteId(row.id); setIsDeleteOpen(true); }} icon={<TrashIcon className="w-4 h-4" />} label={tc("delete")} />
      </TableActions>
    ),
  };

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4 p-3 sm:gap-6 sm:p-6">
        <CardHeader className="p-0"><div className="flex items-center justify-between"><Skeleton className="h-10 w-48" /><Skeleton className="h-9 w-32" /></div></CardHeader>
        <CardContent className="p-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-12" /><Skeleton className="h-8 w-20" /></div>))}
        </CardContent>
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
              { options: categoryFilterOptions, value: categoryFilter, onChange: setCategoryFilter },
              { options: stockFilterOptions, value: stockFilter, onChange: setStockFilter },
            ]}
          >
            <Button size="sm" onClick={openCreate}>
              <PlusIcon className="w-4 h-4 mr-2" />{t("addProduct")}
            </Button>
          </SearchFilter>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredProducts}
            columns={[...columns, actionsColumn]}
            exportColumns={exportColumns}
            exportFilename="products"
            emptyMessage={t("noProducts")}
            emptyIcon={<PackageIcon className="w-8 h-8" />}
            defaultSort={[{ id: "name", desc: false }]}
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? t("editProduct") : t("addNewProduct")}</DialogTitle>
            <DialogDescription>{isEditing ? t("editDescription") : t("addDescription")}</DialogDescription>
          </DialogHeader>
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
                    <Label htmlFor="name" className="sm:text-right">{tc("name")}</Label>
                    <div className="col-span-3">
                      <Input
                        id="name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="description">
                {(field) => (
                  <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="description" className="sm:text-right">{tc("description")}</Label>
                    <Input id="description" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="col-span-3" />
                  </div>
                )}
              </form.Field>
              <form.Field name="price">
                {(field) => (
                  <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="price" className="sm:text-right">{tc("price")}</Label>
                    <div className="col-span-3">
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                        error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="in_stock">
                {(field) => (
                  <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="in_stock" className="sm:text-right">{t("inStock")}</Label>
                    <div className="col-span-3">
                      <Input
                        id="in_stock"
                        type="number"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                        error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined}
                      />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="category">
                {(field) => (
                  <div className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
                    <Label htmlFor="category" className="sm:text-right">{tc("category")}</Label>
                    <Select value={field.state.value} onValueChange={(value) => field.handleChange(value)}>
                      <SelectTrigger className="col-span-3"><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">{t("electronics")}</SelectItem>
                        <SelectItem value="clothing">{t("clothing")}</SelectItem>
                        <SelectItem value="books">{t("books")}</SelectItem>
                        <SelectItem value="home">{t("home")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
              {/* Fiscal Data */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-1">{t("fiscalData")}</p>
                <p className="text-xs text-muted-foreground mb-3">{t("fiscalDataHint")}</p>
                <div className="grid grid-cols-3 gap-3">
                  <form.Field name="ncm">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("ncm")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={8} placeholder="00000000" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="cfop">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("cfop")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={4} placeholder="5102" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="unit_of_measure">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("unitOfMeasure")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={6} placeholder="UN" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="icms_cst">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("icmsCst")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={3} placeholder="00" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="pis_cst">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("pisCst")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={2} placeholder="99" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="cofins_cst">
                    {(field) => (
                      <div className="space-y-1">
                        <Label className="text-xs">{t("cofinsCst")}</Label>
                        <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} maxLength={2} placeholder="99" className="h-8 text-sm" />
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
            <DialogFooter>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                    {isEditing ? t("updateProduct") : t("addProduct")}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description={t("deleteMessage")} />
    </>
  );
}
