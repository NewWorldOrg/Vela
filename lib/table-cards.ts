export const READABLE_LINE = 'max-w-[calc(880rem/16)]'

export type CardPlace = 'select' | 'end' | 'lead' | 'meta' | 'field' | 'actions'

export function cardPlace(
  place: CardPlace,
  label?: string,
): { 'data-card': CardPlace; 'data-label'?: string } {
  return label === undefined
    ? { 'data-card': place }
    : { 'data-card': place, 'data-label': label }
}
