"use client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EllipsisVerticalIcon, Loader2Icon } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionType = "income" | "expense";

interface Transaction {
  id: number;
  description: string;
  type: TransactionType;
  category: string;
  created_at: string;
  amount: number;
  status: string;
}

export default function Cashier() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    description: "",
    category: "",
    type: "income",
    amount: 0,
    status: "completed",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTransaction((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTransaction = async () => {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTransaction),
      });

      if (response.ok) {
        const addedTransaction = await response.json();
        setTransactions((prev) => [...prev, addedTransaction]);
        setNewTransaction({
          description: "",
          category: "",
          type: "income",
          amount: 0,
          status: "completed",
        });
      } else {
        console.error("Failed to add transaction");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleDeleteTransaction = useCallback(async () => {
    if (!transactionToDelete) return;
    try {
      const response = await fetch(
        `/api/transactions/${transactionToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setTransactions(
          transactions.filter((t) => t.id !== transactionToDelete.id)
        );
        setIsDeleteConfirmationOpen(false);
        setTransactionToDelete(null);
      } else {
        console.error("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  }, [transactionToDelete, transactions]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/transactions");
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cashier Transactions</CardTitle>
          <CardDescription>Manage your cashier transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.id}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type}>{transaction.type}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(transaction.created_at)}</TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        transaction.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <EllipsisVerticalIcon className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setTransactionToDelete(transaction);
                            setIsDeleteConfirmationOpen(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>New</TableCell>
                <TableCell>
                  <Input
                    name="description"
                    value={newTransaction.description}
                    onChange={handleInputChange}
                    placeholder="Description"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name="category"
                    value={newTransaction.category}
                    onChange={handleInputChange}
                    placeholder="Category"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={newTransaction.type}
                    onValueChange={(value) =>
                      setNewTransaction({
                        ...newTransaction,
                        type: value as TransactionType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatDate(new Date().toISOString())}</TableCell>
                <TableCell>
                  <Input
                    name="amount"
                    type="number"
                    value={newTransaction.amount}
                    onChange={handleInputChange}
                    placeholder="Amount"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    defaultValue={newTransaction.status}
                    onValueChange={(value) =>
                      setNewTransaction({
                        ...newTransaction,
                        status: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button onClick={handleAddTransaction}>Add</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        {/* Remove card footer */}
      </Card>
      <Dialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTransaction}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
