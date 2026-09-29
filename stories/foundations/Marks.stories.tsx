import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor } from 'storybook/test'

import { Brand } from '@/components/vela/app-shell'
import { AnsweringUsher } from '@/components/vela/answering-usher'
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
      const hull = usher.querySelector('[data-part="hull"] > rect')
      const sail = usher.querySelector('[data-sail]')
      const antenna = usher.querySelector('[data-part="antenna"] path')

      await expect(getComputedStyle(star!).fill).toBe(tokenOf('--spark'))
      await expect(getComputedStyle(hull!).fill).toBe(tokenOf('--sky'))
      await expect(getComputedStyle(sail!).stroke).toBe(tokenOf('--accent'))
      await expect(getComputedStyle(antenna!).stroke).toBe(tokenOf('--accent'))
      await expect(sail!.getAttribute('mask')).toMatch(/^url\(#vela-usher-/)
      await expect(usher).toHaveAttribute('aria-hidden', 'true')
      antennas.add(antenna!.getAttribute('d'))
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

const ARRIVING = '[data-slot="answering-usher"] [data-slot="usher"]'

function arriving(canvas: HTMLElement): SVGSVGElement[] {
  return [...canvas.querySelectorAll<SVGSVGElement>(ARRIVING)]
}

function standing(canvas: HTMLElement): SVGSVGElement[] {
  return [
    ...canvas.querySelectorAll<SVGSVGElement>(
      '[data-standing] [data-slot="usher"]',
    ),
  ]
}

function partOf(usher: SVGSVGElement, part: string): Element {
  return usher.querySelector(`[data-part="${part}"]`)!
}

function movementOf(element: Element): string {
  return getComputedStyle(element).animationName
}

function movingWith(motion: 'moves' | 'still' | undefined) {
  return () => {
    const root = document.documentElement
    const before = root.dataset.motion

    if (motion === undefined) {
      delete root.dataset.motion
    } else {
      root.dataset.motion = motion
    }

    return () => {
      if (before === undefined) {
        delete root.dataset.motion
      } else {
        root.dataset.motion = before
      }
    }
  }
}

function boxesOf(usher: SVGSVGElement): string[] {
  const at = usher.getBoundingClientRect()

  return [
    '[data-sail]',
    '[data-part="antenna"] path',
    '[data-part="hull"] > rect',
    '[data-star]',
  ].map((part) => {
    const box = usher.querySelector(part)!.getBoundingClientRect()

    return [box.x - at.x, box.y - at.y, box.width, box.height]
      .map((value) => value.toFixed(1))
      .join(' ')
  })
}

function ArrivingThree() {
  return (
    <div className="mx-auto grid max-w-[900px] gap-6 p-6 pt-16 sm:grid-cols-3">
      {MOODS.map(([mood, label]) => (
        <div
          key={mood}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-5 pt-14 pb-6"
        >
          <AnsweringUsher mood={mood} className="usher-arrives size-[140px]" />
          <span className="text-note text-ink-3">{label}</span>
          <div data-standing="" aria-hidden="true" className="opacity-0">
            <Usher mood={mood} className="size-[140px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const 出てくるとき表情ごとに動く: Story = {
  beforeEach: movingWith('moves'),
  render: () => <ArrivingThree />,
  play: async ({ canvasElement }) => {
    const [plain, glad, troubled] = arriving(canvasElement)

    await expect(movementOf(partOf(plain, 'leap'))).toBe('usher-leap')
    await expect(movementOf(partOf(glad, 'leap'))).toBe('usher-leap')
    await expect(movementOf(partOf(troubled, 'leap'))).toBe('usher-peek')
    await expect(movementOf(partOf(troubled, 'antenna'))).toBe('usher-wilt')
    await expect(movementOf(partOf(plain, 'antenna'))).toBe('usher-sway')
    await expect(
      getComputedStyle(partOf(plain, 'leap')).animationDuration,
    ).toBe('1s')
    await expect(getComputedStyle(partOf(glad, 'leap')).animationDuration).toBe(
      '1.1s',
    )
    await expect(
      getComputedStyle(partOf(troubled, 'leap')).animationDuration,
    ).toBe('1.2s')

    const blinking = (usher: SVGSVGElement) =>
      [...usher.querySelectorAll('[data-part="lid"]')].map(movementOf)
    await expect(blinking(plain)).toEqual(['usher-blink', 'usher-blink'])
    await expect(blinking(glad)).toEqual([])
    await expect(blinking(troubled)).toEqual([
      'usher-blink-once',
      'usher-blink-once',
    ])

    const scattering = (usher: SVGSVGElement) =>
      [...usher.querySelectorAll('[data-part="sparks"] > *')].filter(
        (spark) => movementOf(spark) === 'usher-spark',
      ).length
    await expect(scattering(plain)).toBe(3)
    await expect(scattering(glad)).toBe(4)
    await expect(scattering(troubled)).toBe(0)

    await expect(plain.querySelector('[data-part="sweat"]')).toBeNull()
    await expect(movementOf(partOf(troubled, 'sweat'))).toBe('usher-sweat')

    for (const usher of arriving(canvasElement)) {
      for (const running of usher.getAnimations({ subtree: true })) {
        await expect(running.effect?.getComputedTiming().iterations).toBe(1)
      }
    }

    for (const usher of arriving(canvasElement)) {
      for (const running of usher.getAnimations({ subtree: true })) {
        running.finish()
      }
    }

    const still = standing(canvasElement)
    for (const [nth, usher] of arriving(canvasElement).entries()) {
      await expect(boxesOf(usher)).toEqual(boxesOf(still[nth]))
      for (const spark of usher.querySelectorAll('[data-part="sparks"] > *')) {
        await expect(getComputedStyle(spark).opacity).toBe('0')
      }
      for (const lid of usher.querySelectorAll('[data-part="lid"]')) {
        await expect(lid.getBoundingClientRect().height).toBeLessThan(0.5)
      }
    }
    await expect(getComputedStyle(partOf(troubled, 'sweat')).opacity).toBe('0')
  },
}

export const 触れると跳ねる: Story = {
  beforeEach: movingWith('moves'),
  render: () => <ArrivingThree />,
  play: async ({ canvasElement }) => {
    const [plain] = arriving(canvasElement)
    const answering = plain.parentElement!

    for (const running of plain.getAnimations({ subtree: true })) {
      running.finish()
    }
    await expect(answering).not.toHaveAttribute('data-answering')

    await userEvent.hover(answering)
    await waitFor(() => expect(answering).toHaveAttribute('data-answering'))
    await expect(movementOf(partOf(plain, 'answer'))).toBe('usher-answer')
    await expect(movementOf(partOf(plain, 'antenna-answer'))).toBe(
      'usher-answer-sway',
    )
    await expect(movementOf(partOf(plain, 'star-answer'))).toBe(
      'usher-answer-star',
    )

    const hop = () =>
      plain
        .getAnimations({ subtree: true })
        .find(
          (running) =>
            running instanceof CSSAnimation &&
            running.animationName === 'usher-answer',
        )!

    hop().finish()
    await expect(hop().playState).toBe('finished')

    await userEvent.unhover(answering)
    await userEvent.hover(answering)
    await expect(hop().playState).toBe('running')
    await expect(Number(hop().currentTime)).toBeLessThan(250)
  },
}

export const 動きを止めた人には動かさない: Story = {
  beforeEach: movingWith('still'),
  render: () => <ArrivingThree />,
  play: async ({ canvasElement }) => {
    const ushers = arriving(canvasElement)

    for (const usher of ushers) {
      await expect(usher.getAnimations({ subtree: true })).toHaveLength(0)
    }

    await userEvent.hover(ushers[0].parentElement!)
    await waitFor(() =>
      expect(ushers[0].parentElement).toHaveAttribute('data-answering'),
    )
    await expect(ushers[0].getAnimations({ subtree: true })).toHaveLength(0)

    const still = standing(canvasElement)
    for (const [nth, usher] of ushers.entries()) {
      await expect(boxesOf(usher)).toEqual(boxesOf(still[nth]))
    }
  },
}

export const 動きを減らす端末では小さく弾むだけ: Story = {
  parameters: { lessMotion: true },
  beforeEach: movingWith(undefined),
  render: () => <ArrivingThree />,
  play: async ({ canvasElement }) => {
    await expect(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ).toBe(true)

    for (const usher of arriving(canvasElement)) {
      const moving = usher
        .getAnimations({ subtree: true })
        .map((running) => (running as CSSAnimation).animationName)

      await expect(moving).toEqual(['usher-bob'])
      await expect(
        usher.getAnimations({ subtree: true })[0].effect?.getComputedTiming()
          .duration,
      ).toBe(260)
    }

    const [plain] = arriving(canvasElement)
    await userEvent.hover(plain.parentElement!)
    await waitFor(() =>
      expect(movementOf(partOf(plain, 'answer'))).toBe('usher-bob'),
    )
    await expect(movementOf(partOf(plain, 'antenna-answer'))).toBe('none')
    await expect(movementOf(partOf(plain, 'star-answer'))).toBe('none')
  },
}
