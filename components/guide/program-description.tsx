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
        'mb-5 text-body leading-[1.95] whitespace-pre-wrap',
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
        <h2 className="heading mb-[calc(7rem/16)] flex items-center gap-[calc(7rem/16)] text-[calc(13rem/16)]">
          <HeadingIcon className="size-[calc(15rem/16)] shrink-0 text-brand" />
          {item.heading}
          <span className="h-px flex-1 border-t border-dashed border-line" />
        </h2>
      )}
      <p className="text-[calc(13rem/16)] leading-[1.95] whitespace-pre-wrap text-ink-2">
        {item.text}
      </p>
    </section>
  )
}
