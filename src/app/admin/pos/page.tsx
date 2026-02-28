"use client";

import React, { useState, useEffect, useMemo } from "react";
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

type Product = {
  id: number;
  name: string;
  price: number;
  in_stock: number;
  category: string;
};

type Customer = {
  id: number;
  name: string;
};

type PaymentMethod = {
  id: number;
  name: string;
};

interface POSProduct extends Product {
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<POSProduct[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/payment-methods").then((r) => r.json()),
    ])
      .then(([prods, custs, methods]) => {
        setProducts(prods);
        setCustomers(custs);
        setPaymentMethods(methods);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load data");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
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
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1 }]);
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
      prev
        .map((p) => {
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

  const handleCreateOrder = async () => {
    if (!canCreate) return;

    setCreating(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer!.id,
          paymentMethodId: paymentMethod!.id,
          products: selectedProducts.map((p) => ({
            id: p.id,
            quantity: p.quantity,
            price: p.price,
          })),
          total,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to create order");
      }

      toast.success("Order created successfully");
      setSelectedProducts([]);
      setSelectedCustomer(null);
      setPaymentMethod(null);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCreating(false);
    }
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
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Sale Details</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
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
          <div className="flex gap-3 !mt-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products by name or category..."
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProducts.map((product) => {
                  const source = products.find((p) => p.id === product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${(product.price / 100).toFixed(2)}</TableCell>
                      <TableCell>
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
          )}
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <strong className="text-lg">Total: ${(total / 100).toFixed(2)}</strong>
            <Button
              onClick={handleCreateOrder}
              disabled={!canCreate || creating}
              size="lg"
            >
              {creating && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
              Create Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
