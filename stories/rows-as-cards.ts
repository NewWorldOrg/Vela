import { expect } from 'storybook/test'

export const PHONE = { width: 390, height: 844 }

export const NARROW_PHONE = { width: 360, height: 800 }

export const FROM_600 = { width: 600, height: 900 }

const PRESSABLE = 'button, a[href], [role="checkbox"], [role="switch"]'

function tablesIn(canvasElement: HTMLElement): HTMLTableElement[] {
  return [
    ...canvasElement.querySelectorAll<HTMLTableElement>('table[data-cards]'),
  ]
}

function containerOf(table: HTMLElement): HTMLElement {
  const container = table.closest<HTMLElement>('[data-slot="table-container"]')

  if (!container) {
    throw new Error('a list of cards has no container')
  }

  return container
}

function cardsOf(table: HTMLTableElement): HTMLTableRowElement[] {
  return [...table.tBodies].flatMap((body) =>
    [...body.rows].filter((row) => row.querySelector(':scope > [data-card]')),
  )
}

/** Every part of a list says what it is in the table, so a reader that is told a laid-out table is no table still hears rows, cells and the heading of each column. */
async function saysItIsATable(table: HTMLTableElement): Promise<void> {
  await expect(table.getAttribute('role')).toBe('table')

  for (const group of [table.tHead, ...table.tBodies]) {
    if (group) {
      await expect(group.getAttribute('role')).toBe('rowgroup')
    }
  }

  for (const row of table.rows) {
    await expect(row.getAttribute('role')).toBe('row')

    for (const cell of row.cells) {
      await expect(cell.getAttribute('role')).toBe(
        cell.tagName === 'TH' ? 'columnheader' : 'cell',
      )
    }
  }
}

/** Each row of every list is a card inside its container: nothing runs off to the side, every value and label is drawn whole, and every button says its word at a size a finger can press. */
export async function laysRowsAsCards(
  canvasElement: HTMLElement,
): Promise<void> {
  const tables = tablesIn(canvasElement)

  await expect(tables.length).toBeGreaterThan(0)

  for (const table of tables) {
    const container = containerOf(table)
    const edge = container.getBoundingClientRect()

    await saysItIsATable(table)

    await expect(getComputedStyle(table).display).toBe('block')
    await expect(container.scrollWidth).toBeLessThanOrEqual(
      container.clientWidth + 1,
    )

    const cards = cardsOf(table)

    await expect(cards.length).toBeGreaterThan(0)

    for (const card of cards) {
      await expect(getComputedStyle(card).display).toBe('flex')

      for (const cell of card.querySelectorAll<HTMLElement>(
        ':scope > [data-card]',
      )) {
        await cellIsWhole(cell, edge)
      }

      for (const button of card.querySelectorAll<HTMLElement>(
        ':scope > [data-card="actions"] :is(button, a[href])',
      )) {
        const box = button.getBoundingClientRect()

        await expect(box.height).toBeGreaterThanOrEqual(40)
        await expect(box.width).toBeGreaterThanOrEqual(44)
        await expect(button.textContent?.trim()).not.toBe('')
        await expect(button.scrollWidth).toBeLessThanOrEqual(
          button.clientWidth + 1,
        )
      }
    }
  }
}

async function cellIsWhole(cell: HTMLElement, edge: DOMRect): Promise<void> {
  const box = cell.getBoundingClientRect()
  const empty =
    (cell.textContent ?? '').trim() === '' && !cell.querySelector(PRESSABLE)

  if (empty) {
    return
  }

  await expect(box.width).toBeGreaterThan(0)
  await expect(box.left).toBeGreaterThanOrEqual(edge.left - 0.5)
  await expect(box.right).toBeLessThanOrEqual(edge.right + 0.5)

  const pressables = [...cell.querySelectorAll<HTMLElement>(PRESSABLE)]

  if (pressables.length === 0) {
    await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth + 1)
  }

  for (const pressable of pressables) {
    const drawn = pressable.getBoundingClientRect()

    await expect(drawn.left).toBeGreaterThanOrEqual(edge.left - 0.5)
    await expect(drawn.right).toBeLessThanOrEqual(edge.right + 0.5)
  }

  const label = cell.dataset.label

  if (label !== undefined) {
    await expect(getComputedStyle(cell, '::before').content).toBe(
      JSON.stringify(label),
    )
  }
}

/** From 600px up every list is the table it was: a header row of column names and a row of cells for each line. */
export async function laysRowsAsATable(
  canvasElement: HTMLElement,
): Promise<void> {
  const tables = tablesIn(canvasElement)

  await expect(tables.length).toBeGreaterThan(0)

  for (const table of tables) {
    await expect(getComputedStyle(table).display).toBe('table')
    await saysItIsATable(table)

    if (table.tHead) {
      await expect(getComputedStyle(table.tHead).display).toBe(
        'table-header-group',
      )
    }

    for (const card of cardsOf(table)) {
      await expect(getComputedStyle(card).display).toBe('table-row')

      for (const cell of card.querySelectorAll<HTMLElement>(
        ':scope > [data-card]',
      )) {
        await expect(getComputedStyle(cell).display).toBe('table-cell')
        await expect(getComputedStyle(cell, '::before').content).toBe('none')
      }
    }
  }
}
