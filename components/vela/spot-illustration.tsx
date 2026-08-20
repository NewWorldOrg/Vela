import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

export type SpotName = 'antenna' | 'tuner' | 'tape' | 'star' | 'device'

const LINE = 'stroke-ink-3 fill-none [stroke-width:1.5]'
const ACCENT = 'stroke-brand fill-none [stroke-width:1.5]'
const FILL = 'fill-tint-lavender stroke-none'
const FILL_2 = 'fill-tint-butter stroke-none'

/**
 * Small drawings for empty states and section headers, taken from the
 * recording domain (antenna, tuner board, tape, star) rather than a generic
 * box / magnifier.
 */
export function SpotIllustration({
  name = 'antenna',
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name?: SpotName }) {
  return (
    <svg
      viewBox="0 0 56 56"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[74px]', className)}
      {...props}
    >
      {name === 'antenna' && (
        <>
          <ellipse className={FILL} cx="28" cy="45" rx="18" ry="4.5" />
          <path className={LINE} d="M28 45V26" />
          <path className={LINE} d="m20.5 33.5 7.5-7.5 7.5 7.5" />
          <circle className={FILL_2} cx="28" cy="20" r="6.5" />
          <circle className={LINE} cx="28" cy="20" r="6.5" />
          <path
            className={ACCENT}
            d="M40 13.5a10 10 0 0 1 0 13M44.5 9a16 16 0 0 1 0 22"
          />
          <path className={ACCENT} d="M16 13.5a10 10 0 0 0 0 13" />
        </>
      )}
      {name === 'tuner' && (
        <>
          <ellipse className={FILL_2} cx="28" cy="47" rx="16" ry="3.8" />
          <rect
            className={LINE}
            x="12.5"
            y="31"
            width="31"
            height="14"
            rx="3.2"
          />
          <path className={LINE} d="M17.5 38.2h4.4M30.6 38.2h4.8" />
          <circle className={LINE} cx="26.2" cy="38.2" r="1.6" />
          <path className={LINE} d="M25.4 31V19.4" />
          <path
            className={LINE}
            d="M20.2 21.6h10.6M22.4 17.2h6.4M23.8 13.4h3.6"
          />
          <path
            className={ACCENT}
            d="M36.4 15.4a9.4 9.4 0 0 1 .4 12.4M41 11.4a15.4 15.4 0 0 1 .6 20.4"
          />
        </>
      )}
      {name === 'tape' && (
        <>
          <rect
            className={FILL_2}
            x="8.5"
            y="16.5"
            width="39"
            height="25"
            rx="5"
          />
          <rect
            className={LINE}
            x="8.5"
            y="16.5"
            width="39"
            height="25"
            rx="5"
          />
          <circle className={FILL} cx="21" cy="28" r="6.2" />
          <circle className={LINE} cx="21" cy="28" r="6.2" />
          <circle className={FILL} cx="35" cy="28.4" r="6.2" />
          <circle className={LINE} cx="35" cy="28.4" r="6.2" />
          <circle className={LINE} cx="21" cy="28" r="1.5" />
          <circle className={LINE} cx="35" cy="28.4" r="1.5" />
          <path className={LINE} d="M21 34.2h14" />
          <path className={ACCENT} d="M28 12.5V6M28 6l4.5 3M28 6l-4.5 3" />
        </>
      )}
      {name === 'star' && (
        <>
          <ellipse className={FILL} cx="28" cy="46" rx="14" ry="3.6" />
          <path
            className={FILL_2}
            d="M28 10.5 32 24.2l13.8 4-13.8 4.4L28 46l-4.2-13.4L10 28.2l13.8-4Z"
          />
          <path
            className={LINE}
            d="M28 10.5 32 24.2l13.8 4-13.8 4.4L28 46l-4.2-13.4L10 28.2l13.8-4Z"
          />
          <path className={ACCENT} d="M43.5 12.5v6M40.5 15.5h6" />
        </>
      )}
      {name === 'device' && (
        <>
          <rect className={FILL} x="5" y="14" width="26" height="17" rx="3" />
          <rect className={LINE} x="5" y="14" width="26" height="17" rx="3" />
          <path className={LINE} d="M14 36h8M18 31v5" />
          <rect
            className={LINE}
            x="36"
            y="18"
            width="13"
            height="21"
            rx="2.6"
            strokeDasharray="3 3"
          />
          <path className={ACCENT} d="M42.5 26v6M39.5 29h6" />
          <path className={LINE} d="M28 44.5h-9M37 44.5h-4" />
        </>
      )}
    </svg>
  )
}
