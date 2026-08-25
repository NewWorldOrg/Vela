/**
 * The touch feel shared by everything pressable: hover lifts by 1px, press
 * sinks by 1px, both over 150ms on the overshooting toy easing. Pair it with
 * `shadow-pop` -> `hover:shadow-pop-lg` -> `active:shadow-pop-none` so the hard
 * offset shadow stretches on hover and disappears on press.
 */
export const tactile =
  'transition-[translate,transform,box-shadow,background-color,border-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px'

/** The same transition without the movement, for surfaces that only tint. */
export const tactileQuiet =
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out'

/**
 * What the pointer says over something pressable. Tailwind v4's preflight sets
 * `button { cursor: default }`, so a control that says nothing about the cursor
 * says the wrong thing, and the one sign that a thing can be pressed at all
 * goes missing from every button at once. `<a href>` keeps `pointer` from the
 * browser and nothing else does, which is why the gap read as one screen's
 * problem rather than the whole app's.
 *
 * A switched-off control stays in the pointer events on purpose: an element
 * taken out of them shows the cursor of whatever is behind it, so it cannot say
 * `not-allowed` at all, and `disabled` on a real control already stops the
 * press without help. Pair this with `still` wherever hover moves something.
 */
export const pressable = 'cursor-pointer disabled:cursor-not-allowed'

/**
 * Holds a switched-off control where it stands, now that the pointer reaches
 * it: the lift, the sink and the icon's tilt all stay put under it. Colours are
 * not here — they differ per control, and each one freezes its own.
 */
export const still =
  'disabled:hover:translate-0 disabled:hover:rotate-0 disabled:active:translate-0 disabled:hover:[&_svg]:scale-100 disabled:hover:[&_svg]:rotate-0'
