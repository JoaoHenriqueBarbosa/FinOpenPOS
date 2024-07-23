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

const products = [
  {
    id: 1,
    name: "Gamer Gear Pro Controller",
    description: "High-performance gaming controller",
    price: 59.99,
    inStock: 100,
    category: "electronics",
  },
  {
    id: 2,
    name: "Luminous VR Headset",
    description: "Immersive virtual reality experience",
    price: 199.99,
    inStock: 50,
    category: "electronics",
  },
  {
    id: 3,
    name: "TechTonic Energy Drink",
    description: "Refreshing energy boost",
    price: 2.99,
    inStock: 1000,
    category: "beverages",
  },
  {
    id: 4,
    name: "Laser Lemonade Machine",
    description: "Futuristic lemonade maker",
    price: 499.99,
    inStock: 25,
    category: "electronics",
  },
  {
    id: 5,
    name: "Hypernova Headphones",
    description: "High-fidelity audio experience",
    price: 129.99,
    inStock: 75,
    category: "electronics",
  },
  {
    id: 6,
    name: "AeroGlow Desk Lamp",
    description: "Sleek and energy-efficient lighting",
    price: 39.99,
    inStock: 200,
    category: "electronics",
  },
  {
    id: 7,
    name: "Zest Juicers",
    description: "Healthy juice extraction",
    price: 79.99,
    inStock: 100,
    category: "electronics",
  },
  {
    id: 8,
    name: "Flexi Wearables",
    description: "Comfortable and stylish fitness trackers",
    price: 49.99,
    inStock: 150,
    category: "electronics",
  },
  {
    id: 9,
    name: "Glimmer Lamps",
    description: "Ambient lighting for any space",
    price: 99.99,
    inStock: 75,
    category: "electronics",
  },
  {
    id: 10,
    name: "Aqua Filters",
    description: "Advanced water filtration system",
    price: 129.99,
    inStock: 50,
    category: "electronics",
  },
];
export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    inStock: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      if (filters.category !== "all" && product.category !== filters.category) {
        return false;
      }
      if (
        filters.inStock !== "all" &&
        filters.inStock === "in-stock" &&
        product.inStock === 0
      ) {
        return false;
      }
      return product.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    return filtered;
  }, [filters.category, filters.inStock, searchTerm]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: "category" | "inStock", value: string) => {
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
                placeholder="Search products..."
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
                  checked={filters.category === "all"}
                  onCheckedChange={() => handleFilterChange("category", "all")}
                >
                  All Categories
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.category === "electronics"}
                  onCheckedChange={() =>
                    handleFilterChange("category", "electronics")
                  }
                >
                  Electronics
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.category === "home"}
                  onCheckedChange={() => handleFilterChange("category", "home")}
                >
                  Home
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.category === "health"}
                  onCheckedChange={() =>
                    handleFilterChange("category", "health")
                  }
                >
                  Health
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.inStock === "all"}
                  onCheckedChange={() => handleFilterChange("inStock", "all")}
                >
                  All Stock
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.inStock === "in-stock"}
                  onCheckedChange={() =>
                    handleFilterChange("inStock", "in-stock")
                  }
                >
                  In Stock
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.inStock === "out-of-stock"}
                  onCheckedChange={() =>
                    handleFilterChange("inStock", "out-of-stock")
                  }
                >
                  Out of Stock
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm">Add Product</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.description}</TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.inStock}</TableCell>
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
      <CardFooter></CardFooter>
    </Card>
  );
}
