import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect } from 'storybook/test'

import { Brand } from '@/components/vela/app-shell'
import { VelaMark } from '@/components/vela/marks'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'

const meta = {
  title: 'Foundations/Marks',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

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
      <SectionHeading>しるし</SectionHeading>
      <Surface className="flex flex-wrap items-end gap-6">
        <VelaMark className="size-[140px]" />
        <VelaMark className="size-[34px]" />
        <VelaMark small className="size-6" />
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

    await expect(marks).toHaveLength(4)

    for (const mark of marks) {
      const [keel, sail, star] = [...mark.querySelectorAll(':scope > path')]

      await expect(getComputedStyle(keel).stroke).toBe(tokenOf('--mark-keel'))
      await expect(getComputedStyle(sail).stroke).toBe(tokenOf('--mark-sail'))
      await expect(getComputedStyle(star).stroke).toBe(tokenOf('--mark-star'))
      await expect(star).toHaveAttribute('mask')
      await expect(mark).toHaveAttribute('aria-hidden', 'true')
    }

    const [large, middle, small, brand] = marks

    await expect(large).toHaveAttribute('data-cut', 'full')
    await expect(middle).toHaveAttribute('data-cut', 'full')
    await expect(small).toHaveAttribute('data-cut', 'small')
    await expect(brand).toHaveAttribute('data-cut', 'small')
  },
}
