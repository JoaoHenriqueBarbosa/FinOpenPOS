"use client";

import React, { useState } from "react";
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
import { products, customers, paymentMethods } from "@/lib/constants";
import { Button } from "@/components/ui/button";

type Product = (typeof products)[number];
type Customer = (typeof customers)[number];
type PaymentMethod = (typeof paymentMethods)[number];

interface POSProduct extends Product {
  quantity: number;
}

export default function POSPage() {
  const [selectedProducts, setSelectedProducts] = useState<POSProduct[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSelectProduct = (productId: number | string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (selectedProducts.some((p) => p.id === productId)) {
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
    if (customer) {
      setSelectedCustomer(customer);
    }
  };

  const handleSelectPaymentMethod = (paymentMethodId: number | string) => {
    const paymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId);
    if (paymentMethod) {
      setPaymentMethod(paymentMethod);
    }
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.id === productId ? { ...p, quantity: newQuantity } : p
      )
    );
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  const total = selectedProducts.reduce(
    (sum, product) => sum + product.price * (product.quantity || 1),
    0
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Point of Sale</h1>
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
          <Combobox
              items={products}
              placeholder="Select Product"
              noSelect
              onSelect={handleSelectProduct}
              className="!mt-5"
            />
        </CardHeader>
        <CardContent>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity || 1}
                      onChange={(e) =>
                        handleQuantityChange(
                          product.id,
                          parseInt(e.target.value)
                        )
                      }
                      className="w-16 p-1 border rounded"
                    />
                  </TableCell>
                  <TableCell>
                    ${((product.quantity || 1) * product.price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-right">
            <strong>Total: ${total.toFixed(2)}</strong>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
