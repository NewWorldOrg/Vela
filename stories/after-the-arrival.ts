const ROUNDS = 4

export function fastForward(document: Document): Animation[] {
  const running = document.getAnimations().filter((one) => {
    const timing = one.effect?.getTiming()

    return (
      one.playState !== 'finished' &&
      timing !== undefined &&
      timing.iterations !== Infinity
    )
  })

  for (const one of running) {
    try {
      one.finish()
    } catch {
      continue
    }
  }

  return running
}

export async function afterTheArrival(
  canvasElement: HTMLElement,
): Promise<void> {
  const document = canvasElement.ownerDocument

  for (let round = 0; round < ROUNDS; round += 1) {
    const running = fastForward(document)

    await Promise.all(running.map((one) => one.finished.catch(() => undefined)))
    await new Promise((painted) => requestAnimationFrame(painted))

    if (running.length === 0) {
      break
    }
  }

  await document.fonts.ready
}
