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
 *
 * All three spellings of switched off are here. A control that says it with
 * `aria-disabled` — because it wants to keep its own colours, or to stay in the
 * tab order and explain itself — is as unpressable to a reader as one that says
 * it with the attribute, and a reader learns that from the pointer.
 */
export const pressable =
  'cursor-pointer disabled:cursor-not-allowed aria-disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed'

/**
 * Holds a switched-off control where it stands, now that the pointer reaches
 * it: the lift, the sink and the icon's tilt all stay put under it. Colours are
 * not here — they differ per control, and each one freezes its own.
 *
 * Without this a control that is off answers every `hover:` rule it has, which
 * is what a reader reads as "press me". The story run measures it: it puts the
 * pointer on every switched-off control and fails the story if the control is
 * drawn differently with it there.
 */
export const still = [
  'disabled:hover:translate-0 disabled:hover:rotate-0 disabled:active:translate-0 disabled:hover:[&_svg]:scale-100 disabled:hover:[&_svg]:rotate-0',
  'aria-disabled:hover:translate-0 aria-disabled:hover:rotate-0 aria-disabled:active:translate-0 aria-disabled:hover:[&_svg]:scale-100 aria-disabled:hover:[&_svg]:rotate-0',
].join(' ')
