export const tactile =
  'transition-[translate,transform,box-shadow,background-color,border-color,color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px'

export const tactileQuiet =
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-out'

export const pressable =
  'cursor-pointer disabled:cursor-not-allowed aria-disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed'

export const still = [
  'disabled:hover:translate-0 disabled:hover:rotate-0 disabled:active:translate-0 disabled:hover:[&_svg]:scale-100 disabled:hover:[&_svg]:rotate-0',
  'aria-disabled:hover:translate-0 aria-disabled:hover:rotate-0 aria-disabled:active:translate-0 aria-disabled:hover:[&_svg]:scale-100 aria-disabled:hover:[&_svg]:rotate-0',
].join(' ')
