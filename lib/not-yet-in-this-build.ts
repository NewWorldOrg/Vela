export const NOT_YET_IN_THIS_BUILD = 'この版がまだ知らない値'

export const NOT_YET_IN_THIS_BUILD_SAYING = 'この版がまだ知らない値です。'

export function shapeFor<K extends PropertyKey, V, F>(
  table: Record<K, V>,
  key: K,
  instead: F,
): V | F {
  return Object.hasOwn(table, key) ? table[key] : instead
}

export function wordFor<K extends PropertyKey>(
  table: Record<K, string>,
  key: K,
): string {
  return shapeFor(table, key, NOT_YET_IN_THIS_BUILD)
}
