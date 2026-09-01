'use client'

import type { RefObject } from 'react'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan, TicketWrite } from '@/repository/videos'
import {
  PLAYER_PALETTE,
  PLAYER_PICTURE_PANE,
} from '@/components/recordings/player-palette'
import { PlaybackStandingChip } from '@/components/recordings/playback-standing'
import { ExternalPlayer } from '@/components/recordings/external-player'

/**
 * What is being played, what moving around in it costs, and what the marks on
 * the bar mean — under the picture, in one place.
 *
 * These sentences were laid across the player's chrome in three separate
 * strips: one under the bar, one beside the source, one under the quality
 * switch. Every one of them was a thing to read rather than a thing to press,
 * and each one pushed the picture further up the screen. A player is a picture
 * and the controls over it; the reading belongs to the page it is on.
 *
 * `再生ソース` is a reading and not a switch. The route is the API's to pick
 * and it takes no argument for it, so a control here would be a control that
 * moves and changes nothing.
 */
export function PlayerReading({
  detail: d,
  plan,
  onTakeTicket,
  video,
  className,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
  onTakeTicket: (id: string) => Promise<TicketWrite>
  video?: RefObject<HTMLVideoElement | null>
  className?: string
}) {
  const encoded = d.encode?.status === 'done'
  const onTheFly = plan.transcodes
  const tsLabel =
    d.sizeBytes == null ? '元 TS' : `元 TS ${formatBytes(d.sizeBytes)}`
  const encodedLabel = `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()
  const marks = d.seek?.cmSpans
  const drops = d.qualitySpots && d.qualitySpots.length > 0

  return (
    <section
      className={cn(
        PLAYER_PICTURE_PANE,
        'mt-3 rounded-xl bg-surface px-[22px] py-4',
        className,
      )}
    >
      {/*
        Only where what can be watched is not what was asked for. The band at
        the top of the page already says 完全 for a recording that ran to the
        end, and saying it twice on one screen makes the two states that are
        not 完全 easier to miss, not harder.
      */}
      {plan.standing !== 'whole' && (
        <PlaybackStandingChip
          standing={plan.standing}
          tone="page"
          className="mb-3"
        />
      )}
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-3">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-[9px]">
            <span className="text-[11px] text-ink-3">再生ソース</span>
            {encoded ? (
              <span
                role="group"
                aria-label="再生ソース"
                className="inline-flex gap-1 rounded-full border border-line p-0.5"
              >
                {[encodedLabel, tsLabel].map((label, index) => {
                  const inUse = index === (onTheFly ? 1 : 0)

                  return (
                    <span
                      key={label}
                      aria-current={inUse ? 'true' : undefined}
                      className={cn(
                        'rounded-full px-[11px] py-[3px] font-code text-[11.5px] font-medium whitespace-nowrap text-ink-3',
                        inUse && 'bg-brand-soft font-bold text-brand',
                      )}
                    >
                      {label}
                    </span>
                  )
                })}
              </span>
            ) : (
              <span className="font-code text-[11.5px] text-ink-2">
                {tsLabel}(オンザフライ)
              </span>
            )}
          </div>
          <p className="mt-2 text-note leading-relaxed text-ink-2">
            {!onTheFly ? (
              <>
                <b className="font-bold text-ink">
                  エンコード済みを再生しています。
                </b>
                Range 直配信のため、シークはバイト範囲の要求だけで済みます。
              </>
            ) : encoded ? (
              <>
                <b className="font-bold text-ink">元 TS を再生しています。</b>
                シークのたびにトランスコーダを立て直します。
              </>
            ) : d.encode?.status === 'failed' ? (
              <>
                <b className="font-bold text-ink">
                  エンコードは失敗したため、元 TS をオンザフライで再生します。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。
              </>
            ) : (
              <>
                <b className="font-bold text-ink">
                  未エンコードの録画を再生しています。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。エンコード済みの成果物があれば
                Range 直配信になり、同じシークバーでも体感が桁違いになります。
              </>
            )}
          </p>
          {/*
            What a seek costs, where the line above has not already said it.
            The two on-the-fly readings that end in this sentence do not get it
            twice; the one that stops at 「立て直します」 does, because it is
            the wait itself — not the rebuild — that is felt.
          */}
          {onTheFly && encoded && (
            <p className="mt-1.5 text-note leading-relaxed text-ink-2">
              シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。
            </p>
          )}
          <p className="mt-1.5 text-note leading-relaxed text-ink-3">
            画面に見えている字幕は映像に焼き付いたものです。
          </p>
        </div>
        <ExternalPlayer
          id={d.id}
          onTakeTicket={onTakeTicket}
          video={video}
          tone="page"
          className="ml-auto max-[700px]:ml-0"
        />
      </div>
      {(marks || drops) && (
        // The marks are drawn in the player's own colours, so the legend takes
        // the same values rather than an app token that is nearly the same:
        // a key whose colour is not the colour it explains is worse than none.
        <div
          style={PLAYER_PALETTE}
          className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-dashed border-line pt-3"
        >
          {marks && (
            <span className="inline-flex items-center gap-[7px] text-[11px] text-ink-3">
              <i className="inline-block h-[5px] w-4 rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]" />
              CM と判定された区間 — 飛ばすかは自分で決めます
            </span>
          )}
          {drops && (
            <span className="inline-flex items-center gap-[7px] text-[11px] text-ink-3">
              <i className="inline-block size-2 rounded-full bg-(--pl-coral)" />
              ドロップ発生位置
            </span>
          )}
        </div>
      )}
    </section>
  )
}
