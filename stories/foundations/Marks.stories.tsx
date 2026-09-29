import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect } from 'storybook/test'

import { Brand } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { Usher, VelaMark, type UsherMood } from '@/components/vela/marks'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { MarkDots, MarkStar } from '@/components/vela/icons'

const meta = {
  title: 'Foundations/Marks',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const MOODS: [UsherMood, string][] = [
  ['plain', 'ふつう'],
  ['glad', '喜んだ'],
  ['troubled', '困った'],
]

function tokenOf(name: string): string {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

export const しるし: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <SectionHeading mark={MarkStar}>しるし</SectionHeading>
      <Surface className="flex flex-wrap items-end gap-6">
        <VelaMark className="size-[140px]" />
        <VelaMark className="size-[34px]" />
        <VelaMark small className="size-8" />
        <VelaMark small className="size-4" />
        <Brand />
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const marks = [
      ...canvasElement.querySelectorAll<SVGSVGElement>(
        '[data-slot="vela-mark"]',
      ),
    ]

    await expect(marks.map((mark) => mark.dataset.cut)).toEqual([
      'full',
      'full',
      'small',
      'small',
      'small',
    ])

    for (const mark of marks) {
      const [keel, sail, star] = [...mark.querySelectorAll(':scope > path')]
      const thick = mark.dataset.cut === 'small' ? '21' : '16'

      await expect(keel.getAttribute('stroke-width')).toBe(thick)
      await expect(getComputedStyle(keel).stroke).toBe(tokenOf('--sky'))
      await expect(getComputedStyle(sail).stroke).toBe(tokenOf('--accent'))
      await expect(getComputedStyle(star).stroke).toBe(tokenOf('--spark'))
      await expect(star.getAttribute('mask')).toMatch(/^url\(#vela-mark-/)
      await expect(mark).toHaveAttribute('aria-hidden', 'true')
    }

    const masks = marks.map((mark) => mark.querySelector('mask')?.id)
    await expect(new Set(masks).size).toBe(marks.length)
  },
}

export const 案内役: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <SectionHeading mark={MarkDots}>案内役</SectionHeading>
      <Surface className="flex flex-wrap items-end justify-around gap-6">
        {MOODS.map(([mood, label]) => (
          <div key={mood} className="flex flex-col items-center gap-1.5">
            <Usher mood={mood} className="size-[140px]" />
            <span className="text-note text-ink-3">{label}</span>
          </div>
        ))}
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ushers = [
      ...canvasElement.querySelectorAll<SVGSVGElement>('[data-slot="usher"]'),
    ]

    await expect(ushers.map((usher) => usher.dataset.mood)).toEqual([
      'plain',
      'glad',
      'troubled',
    ])

    const antennas = new Set<string | null>()
    for (const usher of ushers) {
      const star = usher.querySelector('[data-star]')
      const hull = usher.querySelector(':scope > rect')
      const sail = usher.querySelector('g[mask] > path')

      await expect(getComputedStyle(star!).fill).toBe(tokenOf('--spark'))
      await expect(getComputedStyle(hull!).fill).toBe(tokenOf('--sky'))
      await expect(getComputedStyle(sail!).stroke).toBe(tokenOf('--accent'))
      await expect(usher).toHaveAttribute('aria-hidden', 'true')
      antennas.add(sail!.getAttribute('d'))
    }

    await expect(antennas.size).toBe(MOODS.length)
  },
}

export const 空状態の三つの表情: Story = {
  render: () => (
    <div className="mx-auto grid max-w-[900px] gap-3 p-6 sm:grid-cols-3">
      <EmptyState title="まだ録画がありません" />
      <EmptyState usher="glad" title="食い違いはありません" />
      <EmptyState usher="troubled" title="ページが見つかりません" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const moods = [
      ...canvasElement.querySelectorAll<SVGSVGElement>('[data-slot="usher"]'),
    ].map((usher) => usher.dataset.mood)

    await expect(moods).toEqual(['plain', 'glad', 'troubled'])
  },
}

export const 動きを止めた人には動かさない: Story = {
  render: () => (
    <div className="mx-auto max-w-[420px] p-6">
      <EmptyState usher="glad" title="食い違いはありません" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = document.documentElement
    const usher = canvasElement.querySelector<SVGSVGElement>(
      '[data-slot="usher"]',
    )!
    const star = usher.querySelector('[data-star]')!
    const before = root.dataset.motion

    root.dataset.motion = 'moves'
    await expect(getComputedStyle(usher).animationName).toBe('stamp')
    await expect(getComputedStyle(star).animationName).toBe('twinkle')
    await expect(getComputedStyle(usher).animationIterationCount).toBe('1')

    root.dataset.motion = 'still'
    await expect(getComputedStyle(usher).animationName).toBe('none')
    await expect(getComputedStyle(star).animationName).toBe('none')

    if (before === undefined) {
      delete root.dataset.motion
    } else {
      root.dataset.motion = before
    }
  },
}
