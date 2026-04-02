'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface ComboboxOptionGroup {
  group: string;
  items: string[];
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: string[] | ComboboxOptionGroup[];
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  error?: boolean;
  id?: string;
}

export function SearchableCombobox({
  value,
  onChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  emptyMessage = 'Tidak ditemukan',
  options,
  disabled = false,
  className,
  label,
  required,
  error,
  id,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const isGrouped = options.length > 0 && typeof options[0] === 'object' && options[0] !== null && 'items' in (options[0] as object);

  const flatOptions: string[] = isGrouped
    ? (options as ComboboxOptionGroup[]).flatMap(g => g.items).filter(Boolean)
    : (options as string[]).filter(Boolean);

  // Normalize value for matching (case-insensitive)
  const normalizedValue = value?.toLowerCase().trim() || '';

  // Find the display label for the current value
  const displayLabel = React.useMemo(() => {
    if (!value) return '';
    // Direct match first
    const directMatch = flatOptions.find(
      opt => opt.toLowerCase() === normalizedValue
    );
    if (directMatch) return directMatch;
    // Partial match
    const partialMatch = flatOptions.find(
      opt => opt.toLowerCase().includes(normalizedValue) || normalizedValue.includes(opt.toLowerCase())
    );
    return partialMatch || value;
  }, [value, flatOptions, normalizedValue]);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label htmlFor={id} className="text-xs text-gray-600">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-9 w-full justify-between font-normal text-left',
              !value && 'text-muted-foreground',
              error && 'border-red-500',
              'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="truncate">
              {displayLabel || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-9"
            />
            <CommandList className="max-h-[280px]">
              <CommandEmpty>
                <div className="flex items-center justify-center gap-2 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{emptyMessage}</span>
                </div>
              </CommandEmpty>
              {isGrouped ? (
                (options as ComboboxOptionGroup[]).map((group) => (
                  <CommandGroup key={group.group} heading={group.group}>
                    {group.items.map((item) => (
                      <CommandItem
                        key={item}
                        value={item}
                        onSelect={() => {
                          onChange(item);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            item.toLowerCase() === normalizedValue
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        {item}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              ) : (
                <CommandGroup>
                  {(options as string[]).map((item) => (
                    <CommandItem
                      key={item}
                      value={item}
                      onSelect={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          item.toLowerCase() === normalizedValue
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {item}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
