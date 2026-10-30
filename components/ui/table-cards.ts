export const READABLE_LINE = 'max-w-[calc(880rem/16)]'

/**
 * Where a cell goes when its table, marked `data-cards`, lays each row as a card on a phone:
 * `select` the row's checkbox at the card's left, `end` a fold or a way to the detail at its top
 * right, `lead` the name across the first line, `meta` a value that says what it is (a channel, a
 * date, a length, a size) on the next, `field` a value read with its column's name after them,
 * and `actions` the row's buttons on the last. A cell with none takes the card's whole width.
 */
export type CardPlace = 'select' | 'end' | 'lead' | 'meta' | 'field' | 'actions'

export function cardPlace(
  place: CardPlace,
  label?: string,
): { 'data-card': CardPlace; 'data-label'?: string } {
  return label === undefined
    ? { 'data-card': place }
    : { 'data-card': place, 'data-label': label }
}
