import { expect } from 'storybook/test'

/** A press is a ground with its word on it: one drawn as a word alone reads as a line of text, not as something to press. */
export async function standsOnAGround(press: HTMLElement): Promise<void> {
  const ground = getComputedStyle(press).backgroundColor
  const alpha = ground.match(/[\d.]+/gu)?.[3]

  await expect(
    ground !== 'transparent' && (alpha === undefined || Number(alpha) > 0),
  ).toBe(true)
}
