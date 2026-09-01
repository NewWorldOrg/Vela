'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/vela/icons'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  size = 'default',
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  size?: 'default' | 'reading'
}) {
  /**
   * Where focus was when the surface went up, so that closing it puts focus
   * back there. Radix hands focus to the trigger the dialog was opened from,
   * and a dialog opened from state — which is most of them here — has no
   * trigger to hand it to, so focus lands on the body and the reader is
   * nowhere. Held on the shared part rather than on each screen: a surface
   * that can be reached by keyboard has to give the keyboard its place back,
   * and a rule copied per screen is a rule half of them will be missing.
   */
  const cameFrom = React.useRef<HTMLElement | null>(null)

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-size={size}
        onOpenAutoFocus={(event) => {
          const surface = event.target
          const held =
            surface instanceof Node
              ? surface.ownerDocument?.activeElement
              : undefined

          cameFrom.current = held instanceof HTMLElement ? held : null

          onOpenAutoFocus?.(event)
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)

          const back = cameFrom.current

          if (!event.defaultPrevented && back !== null && back.isConnected) {
            event.preventDefault()
            back.focus({ preventScroll: true })
          }
        }}
        /**
         * The ceiling is a share of the window rather than a count of pixels:
         * the floor is the content, and what it leaves showing around every
         * edge is what tells a layer over a screen apart from a screen of its
         * own. It sits here beside the width, so no screen writes its own.
         *
         * Across, there are two steps and the screen picks one by name rather
         * than by writing a number: a surface that asks something is as wide as
         * the question, and a surface that is read carries a synopsis, a cast
         * and a list of what else it is on, which the width of a question
         * squeezes into a column. Both stop short of the window's edge, so what
         * is under the layer is still there around it either way.
         *
         * Which row gives way is the screen's to say — these surfaces carry
         * anywhere from one child to four, and a template written for two
         * pushes the third out from under the fourth. A body marked
         * `dialog-body`, carrying `min-h-0 overflow-y-auto`, takes the row
         * that can shrink, so the reading sends inside it while the title and
         * the way out stay where they were put.
         */
        className={cn(
          'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2.5rem)] max-h-[85dvh] translate-x-[-50%] translate-y-[-50%] gap-[15px] rounded-xl border border-line-strong bg-surface px-5 pt-[18px] pb-[17px] text-ink shadow-pop-xl duration-200 outline-none has-[>[data-slot=dialog-body]]:grid-rows-[auto_minmax(0,1fr)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-2xl data-[size=reading]:sm:max-w-[min(56rem,calc(100%-2.5rem))]',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="tap-target absolute top-[15px] right-[15px] inline-flex size-[27px] cursor-pointer items-center justify-center rounded-full border border-edge text-ink-2 transition-[background-color,color,transform] duration-150 ease-toy hover:-rotate-6 hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring focus-visible:outline-hidden"
          >
            <CloseIcon className="size-[13px]" />
            <span className="sr-only">閉じる</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-[9px] sm:flex-row sm:justify-center',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline" size="sm">
            閉じる
          </Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('heading text-title leading-[1.55]', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-ui text-ink-2', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
