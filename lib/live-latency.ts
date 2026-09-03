/**
 * Where the playhead is held behind the newest picture on a live wire, and
 * what is done when it is somewhere else.
 *
 * The wire pushes fMP4 as it is encoded, so the newest picture held is the
 * live edge and the distance from the playhead to it is the delay the viewer
 * is watching at. Nothing about a live picture keeps that distance: the edge
 * advances at the rate the clock does and so does the playhead, so whatever
 * distance the first frame happened to cost is the distance the picture is
 * watched at for as long as it is watched. Holding it near a chosen figure is
 * something the screen has to do, by playing a little fast until it is there.
 *
 * It is put here, apart from the element, because it is arithmetic over four
 * numbers and because every one of those numbers is a decision that has to be
 * defensible and checkable on its own.
 */

/**
 * How long one of the wire's pictures is.
 *
 * Measured on the running wire, not assumed: 199 appends over 40 seconds, each
 * carrying 0.200 s of picture, arriving 200 ms apart at the median and 340 ms
 * apart at the worst. It is the floor under everything below — a playhead held
 * closer to the edge than the wire's own granularity is a playhead held where
 * the next picture has not been sent yet.
 */
export const PART_SECONDS = 0.2

/**
 * How far behind the newest picture the playhead is held.
 *
 * Five of the wire's parts. HLS puts the same floor under a live playhead from
 * the other side — `PART-HOLD-BACK` must be at least twice the part and should
 * be at least three times it, "doing so can trigger playback stalls" — and
 * five is above that with room for a part that arrives late.
 */
export const TARGET_SECONDS = 1.0

/**
 * How far either side of the target the playhead is left where it is.
 *
 * A live playhead is never at a figure, it is near one, and a controller that
 * acts on every deviation from a single number acts constantly. So the target
 * is a band and not a point: outside it the picture is brought back, inside it
 * nothing is done. This is the shape shaka-player ships (`liveSync`:
 * `targetLatency` 0.5 with `targetLatencyTolerance` 0.5, giving a band of
 * 0–1.0 s) and the shape DVB-DASH asks for, which specifies the target as
 * ±500 ms rather than as a figure (ETSI TS 103 285 §10.20.6).
 *
 * Four tenths puts the near edge at 0.6 s, which is three of the wire's parts
 * — the floor HLS says a live playhead should not go under.
 */
export const TOLERANCE_SECONDS = 0.4

/**
 * How fast the picture is played while it is being brought back.
 *
 * Five per cent, which is where the just noticeable difference for tempo in
 * speech sits (Quené 2007). It is the rate every player that ships this
 * arrives at from the same direction: shaka's `maxPlaybackRate` default is
 * 1.1, hls.js quantises its rate to steps of 0.05 and the first step above
 * unity is 1.05, and the dash.js proposal that put catch-up in that player
 * asked for 5 per cent by name.
 *
 * The pitch does not move with it. A pitch-preserving algorithm is on by
 * default on a media element and the page never turns it off, so what a viewer
 * hears at this rate is the same voices a little quicker, not a lower one
 * (HTML `preservesPitch`).
 */
export const CATCH_UP_RATE = 1.05

/**
 * How far behind the playhead is moved to the edge instead of played back to
 * it.
 *
 * Eight seconds of ground takes over two and a half minutes to make up at five
 * per cent, and the picture is a quicker tempo for the whole of it. Past this
 * the cheaper answer is to stop showing the old picture and show the new one.
 */
export const SEEK_FROM_SECONDS = 8

/**
 * What one stall adds to the target, and how much the stalls of one session
 * can add in total.
 *
 * A target is a claim about what this wire, this machine and this connection
 * can hold, and a stall is that claim being wrong. Chasing a figure the
 * pipeline cannot sustain buys nothing and costs a permanently quickened
 * picture, so each stall moves the figure out by one part-arrival's worth of
 * ground and the picture is chased to the figure that is actually held. hls.js
 * does the same by the same argument (`liveSyncOnStallIncrease`, one second
 * per stall capped at one target duration); the amounts here are this wire's.
 */
export const STALL_ALLOWANCE_SECONDS = 0.2

export const STALL_ALLOWANCE_CAP_SECONDS = 1.0

/** What the picture on a live wire has come to, as the hold below reads it. */
export interface LivePlayhead {
  /** Where the playhead is, in the element's own seconds. */
  at: number
  /** How far the newest picture held reaches. */
  edge: number
  /** Where the run of picture the playhead is inside ends. */
  reach: number
  /** Where the oldest picture held begins. */
  from: number
  /** The stalls this session has had. */
  stalls: number
}

/** What is done to the playhead, having read where it is. */
export interface LiveHold {
  /** The rate the picture is played at from here. */
  rate: number
  /** Where the playhead is put instead, when playing cannot get it there. */
  seekTo?: number
}

/**
 * The figure the playhead is held at on this session, which is the target plus
 * whatever its stalls have shown the target to be wrong by.
 */
export function targetOf(stalls: number): number {
  return (
    TARGET_SECONDS +
    Math.min(stalls * STALL_ALLOWANCE_SECONDS, STALL_ALLOWANCE_CAP_SECONDS)
  )
}

/** The band the playhead is left alone in, as the two figures that bound it. */
export function bandOf(stalls: number): { near: number; far: number } {
  const target = targetOf(stalls)

  return {
    near: target - TOLERANCE_SECONDS,
    far: target + TOLERANCE_SECONDS,
  }
}

/**
 * What to do with the playhead, given where it is.
 *
 * The answer is one branch of one chain over one reading, and the chain ends
 * in an unconditional rate of one. That shape is the whole of the point: the
 * screen used to ask two questions instead — start catching up past 2.5 s,
 * stop under 1.25 s — and a playhead between those two figures answered
 * neither, so whatever rate it happened to be carrying it kept. Coming down
 * from a catch-up that meant five per cent for as long as the picture stayed
 * in the gap, and a picture that started 2.4 s behind — which is what a first
 * frame costs over a slow path — sat in the gap from the first second to the
 * last, at a delay nothing in the screen would ever act on.
 *
 * A playhead that is not inside the run of picture it is playing cannot reach
 * the edge by being played faster, however long it is played: the hole in
 * front of it stays a hole. Nor can one that is further behind than it is
 * worth chasing. Both are answered by moving the playhead, not by the rate.
 */
export function holdOf(playhead: LivePlayhead): LiveHold {
  const { at, edge, reach, from, stalls } = playhead
  const behind = Math.max(0, edge - at)
  const band = bandOf(stalls)
  const toTheEdge = {
    rate: 1,
    seekTo: Math.max(from, edge - targetOf(stalls)),
  }

  if (behind >= SEEK_FROM_SECONDS) {
    return toTheEdge
  }

  // The playhead is inside a run that stops short of the newest picture: what
  // is in front of it never arrived, and no rate crosses a hole.
  if (reach < edge) {
    return toTheEdge
  }

  if (behind > band.far) {
    return { rate: CATCH_UP_RATE }
  }

  return { rate: 1 }
}

/** A run of picture the element holds, as the element spells one. */
export interface LiveRun {
  from: number
  to: number
}

/**
 * Where the run holding this instant ends, and the instant itself where no run
 * holds it — a playhead in a hole has nothing in front of it, and saying so as
 * a reach of its own is what makes the hold above move it rather than chase.
 */
export function reachOf(runs: readonly LiveRun[], at: number): number {
  const holding = runs.find((run) => run.from <= at && at <= run.to)

  return holding ? holding.to : at
}
