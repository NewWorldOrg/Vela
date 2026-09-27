export function groundOf(
  canvasElement: HTMLElement,
  className: string,
): string {
  const probe = canvasElement.ownerDocument.createElement('div')

  probe.className = className
  canvasElement.append(probe)

  const ground = getComputedStyle(probe).backgroundColor

  probe.remove()

  return ground
}
