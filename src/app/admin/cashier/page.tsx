"use client"
import { Input } from "@/components/ui/input";                                                                                                    
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
  CardFooter,                                                                                                                                     
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
  DialogTrigger,                                                                                                                                  
  DialogContent,                                                                                                                                  
  DialogHeader,                                                                                                                                   
  DialogTitle,                                                                                                                                    
  DialogDescription,                                                                                                                              
  DialogFooter,                                                                                                                                   
  DialogClose,                                                                                                                                    
} from "@/components/ui/dialog";                                                                                                                  
import { Label } from "@/components/ui/label";                                                                                                    
import {                                                                                                                                          
  Select,                                                                                                                                         
  SelectTrigger,                                                                                                                                  
  SelectValue,                                                                                                                                    
  SelectContent,                                                                                                                                  
  SelectItem,                                                                                                                                     
} from "@/components/ui/select";                                                                                                                  
import { MoveVerticalIcon, PlusIcon, FilePenIcon, Trash2Icon, EllipsisVerticalIcon } from "lucide-react";                                         
import { useState, useEffect, useMemo, useCallback } from "react";                                                                                
import Link from "next/link";                                                                                                                     
                                                                                                                                                  
interface Transaction {                                                                                                                           
  id: number;                                                                                                                                     
  date: string;                                                                                                                                   
  amount: number;                                                                                                                                 
  status: string;                                                                                                                                 
}                                                                                                                                                 
                                                                                                                                                  
export default function Cashier() {                                                                                                               
  const [transactions, setTransactions] = useState<Transaction[]>([]);                                                                            
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);                                                                
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);                                                       
  const [loading, setLoading] = useState(true);                                                                                                   
                                                                                                                                                  
  const handleDeleteTransaction = useCallback(async () => {                                                                                       
    if (!transactionToDelete) return;                                                                                                             
    try {                                                                                                                                         
      const response = await fetch(`/api/transactions/${transactionToDelete.id}`, {                                                               
        method: "DELETE",                                                                                                                         
      });                                                                                                                                         
                                                                                                                                                  
      if (response.ok) {                                                                                                                          
        setTransactions(transactions.filter((t) => t.id !== transactionToDelete.id));                                                             
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
        {/* Add a loading spinner here */}                                                                                                        
        Loading...                                                                                                                                
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
                <TableHead>Date</TableHead>                                                                                                       
                <TableHead>Amount</TableHead>                                                                                                     
                <TableHead>Status</TableHead>                                                                                                     
                <TableHead>Status</TableHead>                                                                                                     
                <TableHead>                                                                                                                       
                  <span className="sr-only">Actions</span>                                                                                        
                </TableHead>                                                                                                                      
              </TableRow>                                                                                                                         
            </TableHeader>                                                                                                                        
            <TableBody>                                                                                                                           
              {transactions.map((transaction) => (                                                                                                
                <TableRow key={transaction.id}>                                                                                                   
                  <TableCell>{transaction.id}</TableCell>                                                                                         
                  <TableCell>{transaction.date}</TableCell>                                                                                       
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>                                                                         
                  <TableCell>                                                                                                                     
                    <Badge variant={transaction.status === 'Completed' ? 'secondary' : 'outline'}>                                                
                      {transaction.status}                                                                                                        
                    </Badge>                                                                                                                      
                  </TableCell>                                                                                                                    
                  <TableCell>                                                                                                                     
                    <DropdownMenu>                                                                                                                
                      <DropdownMenuTrigger asChild>                                                                                               
                        <Button aria-haspopup="true" size="icon" variant="ghost">                                                                 
                          <EllipsisVerticalIcon className="h-4 w-4" />                                                                            
                          <span className="sr-only">Toggle menu</span>                                                                            
                        </Button>                                                                                                                 
                      </DropdownMenuTrigger>                                                                                                      
                      <DropdownMenuContent align="end">                                                                                           
                        <DropdownMenuItem>Edit</DropdownMenuItem>                                                                                 
                        <DropdownMenuItem onClick={() => {                                                                                        
                          setTransactionToDelete(transaction);                                                                                    
                          setIsDeleteConfirmationOpen(true);                                                                                      
                        }}>Delete</DropdownMenuItem>                                                                                              
                      </DropdownMenuContent>                                                                                                      
                    </DropdownMenu>                                                                                                               
                  </TableCell>                                                                                                                    
                </TableRow>                                                                                                                       
              ))}                                                                                                                                 
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
              Are you sure you want to delete this transaction? This action cannot                                                                
              be undone.                                                                                                                          
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