"use client";

import { type ReactNode } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Filter button types ────────────────────────────────────────────────────

export interface FilterOption {
  label: string;
  value: string;
  variant?: "default" | "success" | "danger" | "warning";
}

interface SearchFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  children?: ReactNode;
}

const variantClasses: Record<string, string> = {
  default: "",
  success: "data-[active=true]:bg-green-100 data-[active=true]:text-green-800 data-[active=true]:border-green-300 dark:data-[active=true]:bg-green-950 dark:data-[active=true]:text-green-300 dark:data-[active=true]:border-green-800",
  danger: "data-[active=true]:bg-red-100 data-[active=true]:text-red-800 data-[active=true]:border-red-300 dark:data-[active=true]:bg-red-950 dark:data-[active=true]:text-red-300 dark:data-[active=true]:border-red-800",
  warning: "data-[active=true]:bg-yellow-100 data-[active=true]:text-yellow-800 data-[active=true]:border-yellow-300 dark:data-[active=true]:bg-yellow-950 dark:data-[active=true]:text-yellow-300 dark:data-[active=true]:border-yellow-800",
};

export function SearchFilter({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  children,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 pr-8 w-[200px] sm:w-[250px]"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {filters?.map((filter, fi) => (
          <div key={fi} className="flex items-center gap-1">
            {filter.options.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                data-active={filter.value === opt.value}
                className={cn(
                  "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
                  variantClasses[opt.variant ?? "default"]
                )}
                onClick={() => filter.onChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        ))}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
