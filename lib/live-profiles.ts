import type { LiveProfile } from '@/repository/live'

/**
 * The profile a live picture is opened in: the one the API marks as what it
 * encodes in when the wire asks for none.
 *
 * Which one that is, is not Vela's to decide and not Vela's to remember. The
 * API picks it from the machine it is running on — where there is a GPU to
 * hand the encoding to, it names a bigger picture than where there is not —
 * so the same build opens at 1080p60 on one machine and 720p30 on another, and
 * a name written down here would be wrong on whichever of the two it was not
 * copied from.
 *
 * Where the list marks none, the first it lists is taken. That is still the
 * API's answer rather than a guess: it chose the order, and the reader who
 * opened a screen to watch something is better served by the head of the list
 * than by a blank face.
 *
 * An empty list is the one case with no answer at all. There is no name the
 * API would accept, so none is returned and the caller opens nothing — asking
 * for a name that is not on the list only turns "nothing is offered" into a
 * refusal that reads as though the tuner were at fault.
 */
export function unaskedIn(profiles: LiveProfile[]): string | undefined {
  return (profiles.find((one) => one.unasked) ?? profiles[0])?.name
}
