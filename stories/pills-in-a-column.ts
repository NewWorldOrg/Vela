import { expect, within } from 'storybook/test'

export function hasAnEdge(node: Element): boolean {
  if (!(node instanceof HTMLElement)) {
    return false
  }

  const drawn = getComputedStyle(node)

  return drawn.borderTopStyle !== 'none' && parseFloat(drawn.borderTopWidth) > 0
}

export function pillsIn(row: HTMLElement, column: number): HTMLElement[] {
  const cell = within(row).getAllByRole('cell')[column]

  if (!cell) {
    throw new Error(`no column ${column} in this row`)
  }

  return [...cell.querySelectorAll('*')].filter((node): node is HTMLElement =>
    hasAnEdge(node),
  )
}

export function pillOf(row: HTMLElement, column: number): HTMLElement {
  const [pill] = pillsIn(row, column)

  if (!pill) {
    throw new Error(`nothing with an edge in column ${column}`)
  }

  return pill
}

export function widthOf(node: HTMLElement): number {
  return Math.round(node.getBoundingClientRect().width)
}

export function heightOf(node: HTMLElement): number {
  return Math.round(node.getBoundingClientRect().height)
}

export function shapeOf(node: HTMLElement): string {
  const drawn = getComputedStyle(node)

  return [
    drawn.borderTopStyle,
    drawn.borderTopWidth,
    drawn.borderTopLeftRadius,
    drawn.fontWeight,
    drawn.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'clear' : 'filled',
  ].join(' ')
}

export function bodyRows(canvasElement: HTMLElement): HTMLElement[] {
  return within(canvasElement)
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
}

export function rowsOfTheTableHeaded(
  canvasElement: HTMLElement,
  heading: string,
): HTMLElement[] {
  const table = [...canvasElement.querySelectorAll('table')].find((one) =>
    one.querySelector('th')?.textContent?.includes(heading),
  )

  if (!table) {
    throw new Error(`no table headed ${heading}`)
  }

  return bodyRows(table)
}

export async function fillsTheColumn(
  rows: HTMLElement[],
  column: number,
): Promise<void> {
  const pills = rows.map((row) => pillOf(row, column))
  const widths = pills.map(widthOf)

  await expect(new Set(widths).size).toBe(1)

  const said = pills.map((pill) => pill.textContent ?? '')

  await expect(new Set(said).size).toBeGreaterThan(1)
}

export async function oneShapeDownTheColumn(
  rows: HTMLElement[],
  column: number,
): Promise<void> {
  const shapes = rows.map((row) => shapeOf(pillOf(row, column)))

  await expect(new Set(shapes).size).toBe(1)
}
