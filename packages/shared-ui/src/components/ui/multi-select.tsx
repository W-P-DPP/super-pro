import { useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Spinner } from './spinner'

export type MultiSelectOption = {
  value: string
  label: string
  description?: string
  keywords?: string
  disabled?: boolean
}

function buildDefaultTriggerLabel(selectedOptions: MultiSelectOption[], placeholder: string) {
  if (selectedOptions.length === 0) {
    return placeholder
  }

  return selectedOptions
    .map((option) => option.label.trim())
    .filter(Boolean)
    .join(' / ')
}

function toggleValue(currentValues: string[], nextValue: string) {
  return currentValues.includes(nextValue)
    ? currentValues.filter((value) => value !== nextValue)
    : [...currentValues, nextValue]
}

function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Please select',
  searchPlaceholder = 'Search',
  emptyText = 'No matching options.',
  noOptionsText = 'No options available.',
  loading = false,
  loadingText = 'Loading...',
  errorText,
  retryText = 'Retry',
  clearText = 'Clear',
  countText,
  disabled = false,
  onRetry,
  renderValue,
  className,
  triggerClassName,
  contentClassName,
}: {
  value: string[]
  onValueChange: (nextValue: string[]) => void
  options: MultiSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  noOptionsText?: string
  loading?: boolean
  loadingText?: string
  errorText?: string
  retryText?: string
  clearText?: string
  countText?: (selectedCount: number, totalCount: number) => string
  disabled?: boolean
  onRetry?: () => void
  renderValue?: (selectedOptions: MultiSelectOption[]) => string
  className?: string
  triggerClassName?: string
  contentClassName?: string
}) {
  const [open, setOpen] = useState(false)

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  )

  const triggerLabel =
    renderValue?.(selectedOptions) ?? buildDefaultTriggerLabel(selectedOptions, placeholder)

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn('h-9 w-full justify-between px-3', triggerClassName)}
          >
            <span className="truncate text-left text-sm">{triggerLabel}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn('w-[var(--radix-popover-trigger-width)] p-0', contentClassName)}
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>{loadingText}</span>
            </div>
          ) : errorText ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
              <span>{errorText}</span>
              {onRetry ? (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                  {retryText}
                </Button>
              ) : null}
            </div>
          ) : options.length > 0 ? (
            <Command>
              <CommandInput placeholder={searchPlaceholder} />
              <CommandList className="max-h-60">
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isChecked = value.includes(option.value)

                    return (
                      <CommandItem
                        key={option.value}
                        value={`${option.label} ${option.keywords ?? option.description ?? ''}`}
                        disabled={option.disabled}
                        onSelect={() => onValueChange(toggleValue(value, option.value))}
                      >
                        <CheckIcon
                          className={
                            isChecked ? 'size-4 text-foreground' : 'size-4 text-muted-foreground opacity-20'
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{option.label}</span>
                          {option.description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
              <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {countText ? countText(value.length, options.length) : `${options.length} options`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={value.length === 0}
                  onClick={() => onValueChange([])}
                >
                  {clearText}
                </Button>
              </div>
            </Command>
          ) : (
            <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
              {noOptionsText}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { MultiSelect }
