"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { SearchIcon, FilterIcon, FilePenIcon, TrashIcon, EyeIcon } from "lucide-react";
import { customers } from "@/lib/constants";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    orders: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(10);

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter((customer) => {
      if (filters.status !== "all" && customer.status !== filters.status) {
        return false;
      }
      if (
        filters.orders !== "all" &&
        (filters.orders === "with-orders"
          ? customer.totalOrders === 0
          : customer.totalOrders > 0)
      ) {
        return false;
      }
      return (
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    return filtered;
  }, [filters.status, filters.orders, searchTerm]);

  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: "status" | "orders", value: string) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [type]: value,
    }));
    setCurrentPage(1);
  };

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={handleSearch}
                className="pr-8"
              />
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <FilterIcon className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.status === "all"}
                  onCheckedChange={() => handleFilterChange("status", "all")}
                >
                  All Statuses
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "active"}
                  onCheckedChange={() => handleFilterChange("status", "active")}
                >
                  Active
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "inactive"}
                  onCheckedChange={() => handleFilterChange("status", "inactive")}
                >
                  Inactive
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.orders === "all"}
                  onCheckedChange={() => handleFilterChange("orders", "all")}
                >
                  All Orders
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.orders === "with-orders"}
                  onCheckedChange={() => handleFilterChange("orders", "with-orders")}
                >
                  With Orders
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.orders === "without-orders"}
                  onCheckedChange={() => handleFilterChange("orders", "without-orders")}
                >
                  Without Orders
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm">Add Customer</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.totalOrders}</TableCell>
                  <TableCell>{customer.status}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href="#" prefetch={false}>
                        <Button size="icon" variant="ghost">
                          <FilePenIcon className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost">
                        <TrashIcon className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                      <Link href="#" prefetch={false}>
                        <Button size="icon" variant="ghost">
                          <EyeIcon className="w-4 h-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
      </CardFooter>
    </Card>
  );
}
