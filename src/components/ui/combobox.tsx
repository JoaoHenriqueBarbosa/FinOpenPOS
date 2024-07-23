"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  items: { id: number | string; name: string }[];
  placeholder: string;
  onSelect: (id: number | string) => void;
  noSelect?: boolean;
  className?: string;
}

export function Combobox({ items, placeholder, onSelect, noSelect, className }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [popoverWidth, setPopoverWidth] = useState(0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          ref={(element) => {
            if (element) {
              setPopoverWidth(element.offsetWidth);
            }
          }}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start"
        style={{ width: popoverWidth }}
      >
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No item found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id.toString()}
                  onSelect={(currentValue) => {
                    if (typeof item.id === "string") {
                      onSelect(currentValue);
                    } else {
                      onSelect(Number(currentValue));
                    }
                    setOpen(false);
                    if (noSelect) return;
                    setValue(item.name);
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
