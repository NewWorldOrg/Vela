/**
 * A frame, drawn rather than recorded.
 *
 * The catalogue has no API behind it, so nothing it shows can be a picture out
 * of a recording — and nothing in it may be one either: a fixture carries
 * synthesised values and no broadcast of its own. This is the same hillside
 * the design canon draws in the scrub bubble, which is what a thumbnail and a
 * scrubbed frame stand in as here.
 */
const DRAWN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 70">
<rect width="124" height="70" fill="#171A1E"/>
<path d="M0 46 26 28l18 12 20-18 24 16 36-12v46H0Z" fill="#2A3730"/>
<g fill="none" stroke="#9E9BA6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M0 46 26 28l18 12 20-18 24 16 36-12"/>
<circle cx="96" cy="17" r="7"/>
<path d="M6 60h34M50 60h16"/>
</g></svg>`

export const DRAWN_FRAME = `data:image/svg+xml,${encodeURIComponent(DRAWN)}`

/** What the scrub asks for, answered by the one drawing there is. */
export function drawnFrame() {
  return DRAWN_FRAME
}

/** A recording the API keeps no frames for: every second answers 404. */
export function noFrame() {
  return 'data:,'
}

/**
 * The same hillside with a line of subtitles burnt into the bottom of it, as a
 * Japanese broadcast carries them. Nothing the player draws over that band can
 * be read, which is why the reading of what the player is doing is drawn on a
 * plate over the middle instead.
 */
const SUBTITLED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 280">
<rect width="496" height="280" fill="#171A1E"/>
<path d="M0 184 104 112l72 48 80-72 96 64 144-48v184H0Z" fill="#2A3730"/>
<g fill="none" stroke="#9E9BA6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M0 184 104 112l72 48 80-72 96 64 144-48"/>
<circle cx="384" cy="68" r="28"/>
</g>
<g fill="#F2F2F2" opacity=".92">
<rect x="96" y="222" width="304" height="20" rx="3"/>
<rect x="132" y="250" width="232" height="20" rx="3"/>
</g>
</svg>`

export const SUBTITLED_FRAME = `data:image/svg+xml,${encodeURIComponent(SUBTITLED)}`
