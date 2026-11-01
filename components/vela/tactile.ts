/** A press: the ground steps up under the pointer and the control gives a little as it is pressed. */
export const tactile =
  'transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-[140ms] ease-toy active:scale-[0.98]'

export const tactileQuiet =
  'transition-[background-color,border-color,color,box-shadow] duration-[140ms] ease-toy'

export const pressable =
  'cursor-pointer disabled:cursor-not-allowed aria-disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed'

export const still = [
  'disabled:hover:translate-0 disabled:hover:rotate-0 disabled:active:translate-0 disabled:active:scale-100',
  'aria-disabled:hover:translate-0 aria-disabled:hover:rotate-0 aria-disabled:active:translate-0 aria-disabled:active:scale-100',
].join(' ')
