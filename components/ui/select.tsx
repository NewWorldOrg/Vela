'use client'

import * as React from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@/components/vela/icons'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

export const SELECT_LEAST_ROOM = 228

const HeldTrigger =
  React.createContext<React.RefObject<HTMLButtonElement | null> | null>(null)

function makeRoomBelow(trigger: HTMLButtonElement | null): void {
  if (!trigger) {
    return
  }

  const box = trigger.getBoundingClientRect()

  if (window.innerHeight - box.bottom >= SELECT_LEAST_ROOM) {
    return
  }

  trigger.scrollIntoView({ block: 'center' })
}

function Select({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const trigger = React.useRef<HTMLButtonElement | null>(null)

  const answer = (open: boolean) => {
    if (open) {
      makeRoomBelow(trigger.current)
    }

    onOpenChange?.(open)
  }

  return (
    <HeldTrigger.Provider value={trigger}>
      <SelectPrimitive.Root
        data-slot="select"
        onOpenChange={answer}
        {...props}
      />
    </HeldTrigger.Provider>
  )
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}) {
  const heldRef = React.useContext(HeldTrigger)

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "tap-target flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-line-strong bg-surface px-[13px] text-[13px] whitespace-nowrap text-ink outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out enabled:hover:border-ink-3 focus-visible:border-brand focus-visible:shadow-ring disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-ink-3 aria-invalid:border-coral aria-invalid:bg-coral-soft data-[placeholder]:text-ink-3 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-ink-3",
        className,
      )}
      {...props}
      ref={heldRef}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 text-ink-3" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  align = 'center',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'relative z-50 min-w-[8rem] origin-(--radix-select-content-transform-origin) translate-y-1 overflow-x-hidden overflow-y-auto rounded-lg border border-line-strong bg-surface text-ink shadow-pop-xl slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          className,
        )}
        align={align}
        {...props}
        position="popper"
        side="bottom"
        avoidCollisions={false}
        style={{
          ...props.style,
          maxHeight: `max(var(--radix-select-content-available-height), ${SELECT_LEAST_ROOM}px)`,
        }}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1 p-1">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('px-2.5 py-1.5 text-micro text-ink-3', className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2.5 text-ui outline-hidden select-none focus:bg-surface-2 focus:text-ink data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-ink-3 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        'pointer-events-none -mx-1 my-1 h-px border-t border-dashed border-line',
        className,
      )}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-default items-center justify-center py-1',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
