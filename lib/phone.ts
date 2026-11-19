export const PHONE_UPRIGHT =
  '(width < 600px) and (pointer: fine), (width < 600px) and (pointer: none), (width < 600px) and (orientation: portrait), (width < 600px) and (height >= 600px)'

export const PHONE_ON_ITS_SIDE =
  '(pointer: coarse) and (orientation: landscape) and (height < 600px)'

export const PHONE_EITHER_WAY = `${PHONE_UPRIGHT}, ${PHONE_ON_ITS_SIDE}`
