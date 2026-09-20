import { cn } from '@/lib/utils'
import type { ProgramItem } from '@/repository/programs'
import { ListIcon, PersonIcon } from '@/components/vela/icons'

export function ProgramDescription({
  description,
  className,
}: {
  description: string
  className?: string
}) {
  return (
    <p
      data-slot="program-description"
      className={cn(
        'mb-5 text-[13.5px] leading-[1.95] whitespace-pre-wrap',
        className,
      )}
    >
      {description}
    </p>
  )
}

export function ProgramExtended({ item }: { item: ProgramItem }) {
  const HeadingIcon = /出演|司会|ゲスト|キャスト/.test(item.heading)
    ? PersonIcon
    : ListIcon

  return (
    <section data-slot="program-extended" className="mb-5">
      {item.heading && (
        <h2 className="heading mb-[7px] flex items-center gap-[7px] text-[13px]">
          <HeadingIcon className="size-[15px] shrink-0 text-brand" />
          {item.heading}
          <span className="h-px flex-1 border-t border-dashed border-line" />
        </h2>
      )}
      <p className="text-[13px] leading-[1.95] whitespace-pre-wrap text-ink-2">
        {item.text}
      </p>
    </section>
  )
}
