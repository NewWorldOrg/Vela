export function nothingToFollow(): () => void {
  return () => undefined
}

export function slotNamed(id: string): () => HTMLElement | null {
  return () => document.getElementById(id)
}

export function noSlotOnTheServer(): null {
  return null
}
