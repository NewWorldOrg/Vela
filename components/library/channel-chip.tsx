'use client'

export function ChannelChip({
  label,
  on,
  onClick,
}: {
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={
        on
          ? 'rounded-full border border-brand-line bg-brand-soft px-[13px] py-1 text-sub font-bold whitespace-nowrap text-brand shadow-pop transition-[translate,box-shadow] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none'
          : 'rounded-full border border-line-strong bg-surface px-[13px] py-1 text-sub font-medium whitespace-nowrap text-ink-2 shadow-pop transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg active:translate-x-px active:translate-y-px active:shadow-pop-none'
      }
    >
      {label}
    </button>
  )
}
