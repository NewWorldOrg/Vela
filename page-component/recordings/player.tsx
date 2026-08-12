'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { RecordingDetail } from '@/repository/recordings'
import { PlayIcon } from '@/components/vela/icons'

const PTOG =
  'cursor-pointer rounded-full border border-white/25 bg-white/5 px-[13px] py-[5px] text-[11.5px] font-bold whitespace-nowrap text-[#B3ABBF] transition-[translate,background-color,color] duration-150 ease-toy hover:bg-white/15 hover:text-[#EFEAF2] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px'
const PTOG_ON =
  'bg-[rgba(150,187,180,.22)] border-[rgba(150,187,180,.55)] text-[#C0D8D3]'
const CBTN =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-white/5 text-[#B3ABBF] transition-[translate,background-color] duration-150 ease-toy hover:bg-white/15 hover:text-[#EFEAF2] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px [&_svg]:size-4'

function PSeg({
  options,
  value,
  onChange,
  numeric,
}: {
  options: string[]
  value: string
  onChange: (next: string) => void
  numeric?: boolean
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-full border border-white/20 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'cursor-pointer rounded-full border-none bg-transparent px-[11px] py-[3px] text-[11.5px] font-medium whitespace-nowrap text-[#B3ABBF] transition-[background-color,color] duration-150 hover:text-[#EFEAF2]',
            numeric && 'font-code',
            o === value &&
              'bg-[rgba(150,187,180,.24)] font-bold text-[#C0D8D3]',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

export function Player({ detail: d }: { detail: RecordingDetail }) {
  const encoded = d.encode.status === 'done'
  const [subtitles, setSubtitles] = useState(true)
  const [audio, setAudio] = useState('主音声')
  const [speed, setSpeed] = useState('1.0')
  const [source, setSource] = useState(encoded ? 'encoded' : 'ts')
  const [otfQuality, setOtfQuality] = useState('720p 3.0 Mbps')
  const seek = d.seek

  return (
    <section className="mx-[30px] overflow-hidden rounded-xl border border-line-strong bg-[#151418] shadow-pop-xl max-[1060px]:mx-5 max-[700px]:mx-3.5">
      <div className="relative mx-auto flex aspect-video w-[757.33px] max-w-full items-center justify-center bg-[#0F0E12]">
        <button
          type="button"
          aria-label="再生"
          className="flex size-[72px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-white/60 bg-transparent transition-[translate,border-color] duration-150 ease-toy hover:border-white/90 hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px"
        >
          <PlayIcon className="ml-[3px] size-[27px] text-white/90" />
        </button>
      </div>
      <div className="px-6 pt-2 pb-4 max-[700px]:px-4">
        {seek && (
          <div className="relative mt-2 h-[18px]">
            <div className="absolute top-[7px] right-0 left-0 h-[5px] rounded-full bg-white/15" />
            <div
              className="absolute top-[7px] left-0 h-[5px] rounded-full bg-[#96BBB4]"
              style={{ width: `${seek.playedPct}%` }}
            />
            {seek.cmSpans?.map((c) => (
              <span
                key={c.leftPct}
                className="absolute top-[7px] h-[5px] rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]"
                style={{ left: `${c.leftPct}%`, width: `${c.widthPct}%` }}
              />
            ))}
            {seek.chapterPcts?.map((p) => (
              <span
                key={p}
                className="absolute top-px -ml-px h-[17px] w-0.5 rounded-[1px] bg-[#D7AC5E] opacity-85"
                style={{ left: `${p}%` }}
              />
            ))}
            {seek.dropPcts?.map((p) => (
              <span
                key={p}
                className="absolute top-[5px] -ml-1 size-2 rounded-full bg-[#E08A85]"
                style={{ left: `${p}%` }}
              />
            ))}
            <span
              className="absolute top-[2.5px] -ml-[7px] size-3.5 rounded-full border-2 border-[#96BBB4] bg-white"
              style={{ left: `${seek.playedPct}%` }}
            />
          </div>
        )}
        <div className="mt-[9px] flex flex-wrap items-center gap-2.5">
          <button type="button" aria-label="再生" className={CBTN}>
            <PlayIcon />
          </button>
          {seek && (
            <span className="font-code text-sub whitespace-nowrap text-[#B3ABBF]">
              {seek.time}
            </span>
          )}
          <button
            type="button"
            onClick={() => setSubtitles(!subtitles)}
            aria-pressed={subtitles}
            className={cn(PTOG, subtitles && PTOG_ON)}
          >
            字幕
          </button>
          {seek?.chapterPcts && (
            <button type="button" className={PTOG}>
              次のチャプターへ
              <span className="ml-1.5 inline-block rounded border border-white/20 px-1 font-code text-[11px] leading-normal text-[#837C90]">
                →
              </span>
            </button>
          )}
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[11px] whitespace-nowrap text-[#837C90]">
              音声
            </span>
            <PSeg
              options={['主音声', '副音声']}
              value={audio}
              onChange={setAudio}
            />
          </div>
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="text-[11px] whitespace-nowrap text-[#837C90]">
              速度
            </span>
            <PSeg
              options={['0.5', '1.0', '1.25', '1.5', '2.0']}
              value={speed}
              onChange={setSpeed}
              numeric
            />
          </div>
          {(seek?.cmSpans || seek?.dropPcts) && (
            <div className="ml-auto flex flex-wrap items-center gap-4 max-[700px]:ml-0">
              {seek.cmSpans && (
                <span className="inline-flex items-center gap-[7px] text-[11px] text-[#837C90]">
                  <i className="inline-block h-[5px] w-4 rounded-full [background:repeating-linear-gradient(115deg,rgba(215,172,94,.62)_0_4px,rgba(215,172,94,.26)_4px_8px)]" />
                  CM と判定された区間 — 飛ばすかは自分で決めます
                </span>
              )}
              {seek.dropPcts && (
                <span className="inline-flex items-center gap-[7px] text-[11px] text-[#837C90]">
                  <i className="inline-block size-2 rounded-full bg-[#E08A85]" />
                  ドロップ発生位置
                </span>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3.5 border-t border-dashed border-white/15 pt-3">
          <div className="flex flex-wrap items-center gap-[9px]">
            <span className="text-[11px] text-[#837C90]">再生ソース</span>
            {encoded ? (
              <PSeg
                options={[
                  `H.264 ${d.encodePanel?.outSize ?? ''}`.trim(),
                  `元 TS ${formattedSource(d)}`.trim(),
                ]}
                value={
                  source === 'encoded'
                    ? `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()
                    : `元 TS ${formattedSource(d)}`.trim()
                }
                onChange={(next) =>
                  setSource(next.startsWith('H.264') ? 'encoded' : 'ts')
                }
                numeric
              />
            ) : (
              <PSeg
                options={['1080p 6.0 Mbps', '720p 3.0 Mbps', '480p 1.5 Mbps']}
                value={otfQuality}
                onChange={setOtfQuality}
                numeric
              />
            )}
          </div>
          <p className="min-w-[220px] flex-1 text-[11.5px] leading-relaxed text-[#837C90]">
            {encoded && source === 'encoded' ? (
              <>
                <b className="font-bold text-[#B3ABBF]">
                  エンコード済みを再生しています。
                </b>
                Range 直配信のため、シークはバイト範囲の要求だけで済みます。元
                TS
                を選ぶとオンザフライになり、シークのたびにトランスコーダを立て直します。
              </>
            ) : (
              <>
                <b className="font-bold text-[#B3ABBF]">
                  オンザフライで再生しています。
                </b>
                シークのたびにトランスコーダを立て直すため、シーク後に絵が出るまで数秒かかります。エンコードすると、この待ち時間はなくなります。
              </>
            )}
          </p>
          <div className="ml-auto flex flex-wrap gap-2 max-[700px]:ml-0">
            <button type="button" className={PTOG}>
              外部プレイヤーで開く
            </button>
            <button type="button" className={PTOG}>
              AirPlay
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function formattedSource(d: RecordingDetail) {
  return d.encodePanel?.sourceSize ?? ''
}
