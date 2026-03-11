"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "./button";
import { ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "../lib/utils";
import { useTranslations } from "next-intl";

const SCANNER_MAX_INTERVAL_MS = 50;
const SCANNER_MIN_LENGTH = 4;

function parseMultiplier(raw: string): { quantity: number; searchTerm: string } {
  const starIndex = raw.indexOf("*");
  if (starIndex <= 0) return { quantity: 1, searchTerm: raw };
  const qty = parseInt(raw.slice(0, starIndex), 10);
  if (isNaN(qty) || qty <= 0) return { quantity: 1, searchTerm: raw };
  return { quantity: qty, searchTerm: raw.slice(starIndex + 1) };
}

export interface ComboboxItem {
  id: number | string;
  name: string;
  /** Extra terms to match against (e.g. barcode). Defaults to name. */
  searchValue?: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  placeholder: string;
  onSelect: (id: number | string, quantity?: number) => void;
  /** Controlled display value — shows this in the trigger button */
  value?: string;
  noSelect?: boolean;
  className?: string;
  /** Called when a scanner-like input is detected (rapid keystrokes + Enter) */
  onScannerInput?: (code: string, quantity: number) => void;
}

export function Combobox({
  items,
  placeholder,
  onSelect,
  value: controlledValue,
  noSelect,
  className,
  onScannerInput,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [popoverWidth, setPopoverWidth] = useState(0);
  const tc = useTranslations("common");

  const lastKeyTimeRef = useRef<number>(0);
  const intervalsRef = useRef<number[]>([]);

  const displayValue = controlledValue ?? internalValue;

  // Only parse multiplier when scanner mode is enabled
  const { quantity, searchTerm } = onScannerInput
    ? parseMultiplier(inputValue)
    : { quantity: 1, searchTerm: inputValue };

  const hasMultiplier = quantity > 1;

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = Date.now();

      if (e.key !== "Enter") {
        if (lastKeyTimeRef.current > 0) {
          intervalsRef.current.push(now - lastKeyTimeRef.current);
          if (intervalsRef.current.length > 30) intervalsRef.current.shift();
        }
        lastKeyTimeRef.current = now;
        return;
      }

      // Enter pressed — evaluate if it's a scanner
      const code = searchTerm.trim();
      const intervals = intervalsRef.current;
      lastKeyTimeRef.current = 0;
      intervalsRef.current = [];

      if (
        onScannerInput &&
        code.length >= SCANNER_MIN_LENGTH &&
        intervals.length >= 2
      ) {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (avg < SCANNER_MAX_INTERVAL_MS) {
          e.preventDefault();
          setInputValue("");
          onScannerInput(code, hasMultiplier ? quantity : 1);
          return;
        }
      }
    },
    [searchTerm, quantity, hasMultiplier, onScannerInput]
  );

  const customFilter = useCallback(
    (itemValue: string, search: string) => {
      const term = onScannerInput
        ? parseMultiplier(search).searchTerm
        : search;
      if (!term) return 1;
      return itemValue.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
    },
    [onScannerInput]
  );

  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o);
    if (!o) {
      setInputValue("");
      lastKeyTimeRef.current = 0;
      intervalsRef.current = [];
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
          ref={(element) => {
            if (element) setPopoverWidth(element.offsetWidth);
          }}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start" style={{ width: popoverWidth }}>
        <Command filter={customFilter}>
          <CommandInput
            placeholder={`${tc("search").replace("...", "")} ${placeholder.toLowerCase()}...`}
            value={inputValue}
            onValueChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          {hasMultiplier && (
            <div className="px-3 py-1.5 text-xs border-b bg-muted/50 flex items-center gap-1.5">
              <span className="font-semibold text-foreground tabular-nums">{quantity}×</span>
              <span className="text-muted-foreground truncate">
                {searchTerm || "..."}
              </span>
            </div>
          )}
          <CommandEmpty>{tc("noItemFound")}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.searchValue ?? item.name}
                  onSelect={() => {
                    onSelect(item.id, hasMultiplier ? quantity : undefined);
                    setOpen(false);
                    setInputValue("");
                    if (noSelect) return;
                    setInternalValue(item.name);
                  }}
                >
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
