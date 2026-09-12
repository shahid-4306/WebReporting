import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// options: [{ code, name }]
export default function SearchableSelect({ value, placeholder, options = [], onChange, allowAll = false, allLabel = "All" }) {
  const [open, setOpen] = useState(false);
  const selected = (options || []).find((o) => o.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-10 w-full justify-between font-normal">
          <span className={cn("truncate", !selected && !value && "text-muted-foreground")}>
            {selected ? `${selected.code} - ${selected.name}` : value ? value : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No record found.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  onSelect={() => { onChange(""); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              )}
              {(options || []).map((o) => (
                <CommandItem
                  key={o.code}
                  value={`${o.code} ${o.name}`}
                  onSelect={() => { onChange(o.code); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.code ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.code} - {o.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}