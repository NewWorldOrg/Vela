/** A phone held upright: a window under 600px wide that is not a phone held on its side. The same query as the `upright` variant in `app/globals.css`. */
export const PHONE_UPRIGHT =
  '(width < 600px) and (pointer: fine), (width < 600px) and (pointer: none), (width < 600px) and (orientation: portrait), (width < 600px) and (height >= 600px)'

/** A phone held on its side: a finger's screen whose window is short and wide. The same query as the `sideways` variant in `app/globals.css`. */
export const PHONE_ON_ITS_SIDE =
  '(pointer: coarse) and (orientation: landscape) and (height < 600px)'
