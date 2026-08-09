/**
 * The touch feel shared by everything pressable: hover lifts by 1px, press
 * sinks by 1px, both over 150ms on the overshooting toy easing. Pair it with
 * `shadow-pop` -> `hover:shadow-pop-lg` -> `active:shadow-pop-none` so the hard
 * offset shadow stretches on hover and disappears on press.
 */
export const tactile =
  'transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px'

/** The same transition without the movement, for surfaces that only tint. */
export const tactileQuiet =
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out'
