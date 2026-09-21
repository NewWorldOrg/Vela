import { expect, userEvent, waitFor, within } from 'storybook/test'

export function hasAnEdge(node: Element): boolean {
  if (!(node instanceof HTMLElement)) {
    return false
  }

  const drawn = getComputedStyle(node)

  return drawn.borderTopStyle !== 'none' && parseFloat(drawn.borderTopWidth) > 0
}

export function saidIn(row: HTMLElement, column: number): HTMLElement[] {
  const cell = within(row).getAllByRole('cell')[column]

  if (!cell) {
    throw new Error(`no column ${column} in this row`)
  }

  return [
    ...cell.querySelectorAll('[data-state-say], [data-slot="badge"]'),
  ].filter((node): node is HTMLElement => node instanceof HTMLElement)
}

export function sayOf(row: HTMLElement, column: number): HTMLElement {
  const [said] = saidIn(row, column)

  if (!said) {
    throw new Error(`nothing says a state in column ${column}`)
  }

  return said
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

export async function saysItWithoutAnEdge(
  rows: HTMLElement[],
  column: number,
): Promise<void> {
  const said = rows.map((row) => sayOf(row, column))

  await expect(said.length).toBeGreaterThan(1)

  for (const one of said) {
    if (one.dataset.slot === 'badge') {
      continue
    }

    await expect(hasAnEdge(one)).toBe(false)
    await expect(getComputedStyle(one).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  }

  await expect(
    new Set(said.map((one) => one.textContent ?? '')).size,
  ).toBeGreaterThan(1)
}

export async function oneShapeDownTheColumn(
  rows: HTMLElement[],
  column: number,
): Promise<void> {
  const shapes = rows.map((row) => shapeOf(sayOf(row, column)))

  await expect(new Set(shapes).size).toBe(1)
}

export async function tipIn(host: HTMLElement): Promise<HTMLElement> {
  const trigger =
    host.querySelector<HTMLElement>('[data-slot="term-tip"]') ??
    host.querySelector<HTMLElement>('[data-slot="tooltip-trigger"]') ??
    host.querySelector<HTMLElement>('[data-state-say]') ??
    host.querySelector<HTMLElement>('[data-slot="badge"]')

  if (!trigger) {
    throw new Error(
      `nothing here carries a tip: ${host.outerHTML.slice(0, 400)}`,
    )
  }

  await userEvent.hover(trigger)
  trigger.focus()

  return await waitFor(
    () => {
      const named = trigger.getAttribute('aria-describedby')
      const said = named ? document.getElementById(named) : null

      if (!said) {
        throw new Error('the tip did not open')
      }

      return said
    },
    { timeout: 3000 },
  )
}

export function cellOf(row: HTMLElement, column: number): HTMLElement {
  const cell = within(row).getAllByRole('cell')[column]

  if (!cell) {
    throw new Error(`no column ${column} in this row`)
  }

  return cell
}
