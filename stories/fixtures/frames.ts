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

/**
 * The same hillside again, as a picture a `<video>` can actually play.
 *
 * A story cannot reach the state where the frame on screen is kept while the
 * next one is being made unless something has been rendered to keep: the copy
 * is a `drawImage` off the element, and that draws nothing below
 * `HAVE_CURRENT_DATA`. A `MediaSource` nothing is appended to never gets
 * there, and neither does a picture nothing answers, so the two the other
 * stories use will not do.
 *
 * Drawn and not recorded, like the rest of this file: the SVG above, rendered
 * and encoded as a second of VP9 at 640x360 — the codec every browser the
 * catalogue is run in decodes, and small enough at 3.4 KB to sit in a fixture
 * rather than in a file beside one.
 */
export const DRAWN_PICTURE =
  'data:video/webm;base64,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'
