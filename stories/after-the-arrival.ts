export async function afterTheArrival(
  canvasElement: HTMLElement,
): Promise<void> {
  const running = canvasElement.ownerDocument.getAnimations().filter((one) => {
    const timing = one.effect?.getTiming()

    return timing !== undefined && timing.iterations !== Infinity
  })

  await Promise.all(running.map((one) => one.finished.catch(() => undefined)))
}
