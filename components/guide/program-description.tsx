import { cn } from '@/lib/utils'

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
