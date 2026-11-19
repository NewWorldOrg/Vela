import { expect } from 'storybook/test'

export async function standsOnAGround(press: HTMLElement): Promise<void> {
  const ground = getComputedStyle(press).backgroundColor
  const alpha = ground.match(/[\d.]+/gu)?.[3]

  await expect(
    ground !== 'transparent' && (alpha === undefined || Number(alpha) > 0),
  ).toBe(true)
}
