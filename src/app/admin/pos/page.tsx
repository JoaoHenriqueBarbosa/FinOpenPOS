"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, MinusIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@/lib/trpc/router";

type Product = RouterOutputs["products"]["list"][number];
type POSProduct = Pick<Product, "id" | "name" | "price" | "in_stock"> & { category: string; quantity: number };

export default function POSPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: products = [], isLoading: loadingProducts } = useQuery(trpc.products.list.queryOptions());
  const { data: customers = [], isLoading: loadingCustomers } = useQuery(trpc.customers.list.queryOptions());
  const { data: paymentMethods = [], isLoading: loadingMethods } = useQuery(trpc.paymentMethods.list.queryOptions());

  const loading = loadingProducts || loadingCustomers || loadingMethods;

  const createOrderMutation = useMutation(trpc.orders.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.orders.list.queryOptions());
      queryClient.invalidateQueries(trpc.products.list.queryOptions());
      toast.success("Order created successfully");
      setSelectedProducts([]);
      setSelectedCustomer(null);
      setPaymentMethod(null);
    },
    onError: (err) => toast.error(err.message || "Failed to create order"),
  }));

  const [selectedProducts, setSelectedProducts] = useState<POSProduct[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<{ id: number; name: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const handleSelectProduct = (productId: number | string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.in_stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    const existing = selectedProducts.find((p) => p.id === productId);
    if (existing && existing.quantity >= product.in_stock) {
      toast.error(`Only ${product.in_stock} units of ${product.name} available`);
      return;
    }
    if (existing) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedProducts([...selectedProducts, { id: product.id, name: product.name, price: product.price, in_stock: product.in_stock, category: product.category ?? "", quantity: 1 }]);
    }
  };

  const handleSelectCustomer = (customerId: number | string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) setSelectedCustomer(customer);
  };

  const handleSelectPaymentMethod = (paymentMethodId: number | string) => {
    const method = paymentMethods.find((pm) => pm.id === paymentMethodId);
    if (method) setPaymentMethod(method);
  };

  const handleQuantityChange = (productId: number, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const newQty = p.quantity + delta;
        if (newQty <= 0) return p;
        if (product && newQty > product.in_stock) {
          toast.error(`Only ${product.in_stock} units available`);
          return p;
        }
        return { ...p, quantity: newQty };
      })
    );
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const total = selectedProducts.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0
  );

  const canCreate = selectedProducts.length > 0 && selectedCustomer && paymentMethod;

  const handleCreateOrder = () => {
    if (!canCreate) return;
    createOrderMutation.mutate({
      customerId: selectedCustomer!.id,
      paymentMethodId: paymentMethod!.id,
      products: selectedProducts.map((p) => ({
        id: p.id,
        quantity: p.quantity,
        price: p.price,
      })),
      total,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Sale Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <Combobox
              items={customers}
              placeholder="Select Customer"
              onSelect={handleSelectCustomer}
            />
          </div>
          <div className="flex-1">
            <Combobox
              items={paymentMethods}
              placeholder="Select Payment Method"
              onSelect={handleSelectPaymentMethod}
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 !mt-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Combobox
              items={filteredProducts.map((p) => ({
                id: p.id,
                name: `${p.name} — $${(p.price / 100).toFixed(2)} (${p.in_stock} in stock)`,
              }))}
              placeholder="Add Product"
              noSelect
              onSelect={handleSelectProduct}
            />
          </div>
        </CardHeader>
        <CardContent>
          {selectedProducts.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              Select products above to add them to the order
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Price</TableHead>
                    <TableHead className="hidden md:table-cell">Stock</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => {
                    const source = products.find((p) => p.id === product.id);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">${(product.price / 100).toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={source && source.in_stock > 5 ? "default" : "destructive"}>
                            {source?.in_stock ?? 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(product.id, -1)}
                              disabled={product.quantity <= 1}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center tabular-nums">{product.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(product.id, 1)}
                              disabled={source ? product.quantity >= source.in_stock : false}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${(product.quantity * product.price / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveProduct(product.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <strong className="text-lg">Total: ${(total / 100).toFixed(2)}</strong>
            <Button
              onClick={handleCreateOrder}
              disabled={!canCreate || createOrderMutation.isPending}
              size="lg"
              className="w-full sm:w-auto"
            >
              {createOrderMutation.isPending && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
              Create Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
