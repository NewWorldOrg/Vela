import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

export type IconProps = SVGProps<SVGSVGElement>

/**
 * Every Vela icon is drawn here rather than pulled from a generic icon set.
 * Shared geometry: 24x24, 1.6 stroke, round caps/joins, no fill. Shapes are
 * deliberately a little off-axis so the set keeps a hand-drawn feel.
 */
function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('size-4 shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

export function VelaMark(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M12 3.2 5.4 20.4h13.2Z" />
      <path d="M12 3.2V20.4" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4.5a6.6 6.6 0 1 0 6.6 6.6" />
      <path d="M15.6 15.4 20 19.8" />
    </Icon>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 4.2v2.4M12 17.4v2.4M19.8 12h-2.4M6.6 12H4.2M17.5 6.5l-1.7 1.7M8.2 15.8l-1.7 1.7M17.5 17.5l-1.7-1.7M8.2 8.2 6.5 6.5" />
    </Icon>
  )
}

export function TunerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15.5V21" />
      <path d="M12 15.5 4.6 5.6" />
      <path d="M12 15.5 19.4 5.6" />
      <circle cx="12" cy="16.6" r="1.4" />
    </Icon>
  )
}

export function ChannelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="7.4" width="16.8" height="12.6" rx="2.2" />
      <path d="m8 7.4 4-3.6 4 3.6" />
    </Icon>
  )
}

export function EncodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h3l2.5-5 3 10L16 12h3" />
    </Icon>
  )
}

export function QualityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 18.5V11M9.4 18.5V6M14.8 18.5v-9M20 18.5v-4" />
    </Icon>
  )
}

export function SystemIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2.4" />
      <path d="M9 19v2M15 19v2" />
    </Icon>
  )
}

export function ProgramGuideIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.4h16" />
      <path d="M5.6 12.2h4.2M12.4 12.2h6M5.6 16.6h8.4" />
    </Icon>
  )
}

export function OutcomeTruncatedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.2 12h6.4" />
      <path d="M13.4 12h1.2M17.4 12h2.4" />
      <path d="M12 4.6v2.2M12 17.2v2.2" />
    </Icon>
  )
}

export function OutcomeFailedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M9.2 9.2 14.8 14.8M14.8 9.2 9.2 14.8" />
    </Icon>
  )
}

export function ThumbShotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
      <path d="m5.4 16.4 4.2-4.6 3 2.8 3-3.4 4.6 5.2" />
      <circle cx="9" cy="9.4" r="1.3" />
    </Icon>
  )
}

export function ThumbPendingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
      <path d="M7.6 12h8.8" />
    </Icon>
  )
}

export function ThumbMissingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.6 4.6 19.4 19.4" />
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
    </Icon>
  )
}

export function ThumbErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
      <path d="M8 10.4h8M8 13.6h5" />
    </Icon>
  )
}

export function SignInIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.6 3.4h4.2a1.6 1.6 0 0 1 1.6 1.6v14a1.6 1.6 0 0 1-1.6 1.6h-4.2" />
      <path d="m9.6 7.2 4.9 4.8-4.9 4.9" />
      <path d="M14.4 12H3.2" />
    </Icon>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 5.8 18.4 12 9 18.2Z" />
    </Icon>
  )
}

export function LiveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12.2" r="2.2" />
      <path d="M8.4 8.4a5 5 0 0 0 0 7.6M15.6 8.4a5 5 0 0 1 .2 7.6" />
      <path d="M5.4 5.4a9.3 9.3 0 0 0 0 13.4M18.6 5.4a9.3 9.3 0 0 1 .3 13.4" />
    </Icon>
  )
}

export function LibraryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="6.6" width="16.8" height="11" rx="2.8" />
      <circle cx="9" cy="12" r="2.6" />
      <circle cx="15.1" cy="12.2" r="2.6" />
      <path d="M9 17.6h6.2" />
    </Icon>
  )
}

export function ReservationIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.6" width="16" height="14" rx="2.6" />
      <path d="M4 10h16M9 3.8v3.4M15 3.8v3.4" />
      <circle cx="12" cy="14.6" r="1.5" />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5.6" width="16" height="14" rx="2.6" />
      <path d="M4 10h16M9 3.8v3.4M15 3.8v3.4" />
    </Icon>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6.4h16M4 12h11.4M4 17.6h7.6" />
    </Icon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.6 6.4 15.2 12l-5.6 5.6" />
    </Icon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.4 6.4 8.8 12l5.6 5.6" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.4 9.4 12 15l5.6-5.6" />
    </Icon>
  )
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.4 14.6 12 9l5.6 5.6" />
    </Icon>
  )
}

/** Both directions at once — the "sortable, not yet sorted" column marker. */
export function SortIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.4 10.2 12 6.4l3.6 3.8" />
      <path d="M8.4 13.8 12 17.6l3.6-3.8" />
    </Icon>
  )
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5.6" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="18.4" cy="12" r="1.4" />
    </Icon>
  )
}

export function ColumnsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.4h9.4M4 12h16M4 16.6h6.6" />
      <circle cx="16.6" cy="7.4" r="1.5" />
      <circle cx="13.6" cy="16.6" r="1.5" />
    </Icon>
  )
}

export function DotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </Icon>
  )
}

export function SuccessIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.4 12.2 2.6 2.6 4.8-5.2" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4.1" />
      <path d="M12 3.4v2.2M12 18.4v2.2M20.6 12h-2.2M5.6 12H3.4M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.2A8.4 8.4 0 0 1 9.6 4.2a8.6 8.6 0 1 0 10.4 10Z" />
    </Icon>
  )
}

export function DisplayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="5" width="16.8" height="11.4" rx="2.2" />
      <path d="M9 19.6h6.2" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.4 6.2 17.6 17.8M17.6 6.2 6.4 17.8" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={3.2} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11.2v4.6M12 8.2h.01" />
    </Icon>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4.2 3.4 19.4h17.2Z" />
      <path d="M12 10.2v4M12 17h.01" />
    </Icon>
  )
}

export function DangerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.8v4.6M12 16h.01" />
    </Icon>
  )
}

export function SignalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 17.4h.01" />
      <path d="M8.6 14.2a4.9 4.9 0 0 1 6.9 0" />
      <path d="M5.5 10.8a9.3 9.3 0 0 1 13 0" />
    </Icon>
  )
}

/** Section marks — a different small shape per section, never reused twice. */
export function MarkStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.4 12 18 10.3 12.4 5 10.6 10.3 9Z" />
    </Icon>
  )
}

export function MarkDoubleCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="3.4" />
    </Icon>
  )
}

export function MarkSlashes(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.4 16.6 12.6 7M10.4 17.2 16.6 7.6M14.4 17.8 19.6 9.4" />
    </Icon>
  )
}

export function MarkPanel(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16" />
    </Icon>
  )
}

export function MarkCup(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 4.5h11l-2 6h-7Z" />
      <path d="M8.5 10.5 7 19.5h10l-1.5-9" />
    </Icon>
  )
}

export function MarkDots(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </Icon>
  )
}

export function MarkPill(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.6" y="8.4" width="16.8" height="7.4" rx="3.7" />
      <circle cx="8.2" cy="12.1" r="1.3" />
    </Icon>
  )
}

export function MarkAxis(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.6 12h5M14.4 12h5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 4.6v3M12 16.4v3" />
    </Icon>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.6V12l3 2" />
    </Icon>
  )
}

export function TunerTerrestrialIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="9" width="16" height="10" rx="2" />
      <path d="m8.5 9 3.5-4.5L15.5 9" />
    </Icon>
  )
}

export function TunerSatelliteIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 19.5a11 11 0 0 1 11-11" />
      <path d="M4.5 19.5a6 6 0 0 1 6-6" />
      <circle cx="5.4" cy="18.6" r="1.3" />
    </Icon>
  )
}

export function MarkRuler(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8.6h16v6.8H4Z" />
      <path d="M8 8.6v2.6M12 8.6v3.6M16 8.6v2.6" />
    </Icon>
  )
}

export function MarkType(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 7h14M9 7v11M15 7v11M5 18h14" />
    </Icon>
  )
}

export function MarkSplit(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.8" y="5" width="16.4" height="14" rx="2.6" />
      <path d="M14.6 5v14" />
    </Icon>
  )
}

export function RecordIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function RelayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.2 12h12.2" />
      <path d="m12.4 7.2 4.6 4.8-4.6 4.8" />
      <path d="M20.2 5.4v13.4" />
    </Icon>
  )
}

export function PersonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9.6" cy="8.4" r="3.2" />
      <path d="M4 19.4c.6-3.2 2.9-4.9 5.7-4.9s5 1.7 5.6 4.9" />
      <path d="M16.4 6.4a3 3 0 0 1 .2 5.6" />
    </Icon>
  )
}
