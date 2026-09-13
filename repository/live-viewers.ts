import type { components } from '@/repository/client/schema'
import { liveChannelsHref } from '@/repository/live-paths'

type LiveChannelResponder = components['schemas']['LiveChannelResponder']
type LiveChannelsAnswer =
  components['schemas']['BaseResponderOfLiveChannelListResponder']

export type LiveViewerCounts = Record<string, number>

function count(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAnswer(body: unknown): body is LiveChannelsAnswer {
  return (
    isRecord(body) &&
    (body.data === null || body.data === undefined || isRecord(body.data))
  )
}

function isChannel(item: unknown): item is LiveChannelResponder {
  return (
    isRecord(item) &&
    item.networkId !== undefined &&
    item.serviceId !== undefined &&
    item.viewers !== undefined
  )
}

export function readLiveViewers(body: unknown): LiveViewerCounts | null {
  if (!isAnswer(body)) {
    return null
  }

  const items: unknown = body.data?.items

  if (items === undefined || items === null) {
    return {}
  }

  if (!Array.isArray(items) || !items.every(isChannel)) {
    return null
  }

  return Object.fromEntries(
    items.map((one) => [
      `${count(one.networkId)}-${count(one.serviceId)}`,
      count(one.viewers),
    ]),
  )
}

export async function askLiveViewers(): Promise<LiveViewerCounts | undefined> {
  try {
    const answer = await fetch(liveChannelsHref(), { cache: 'no-store' })

    if (!answer.ok) {
      void answer.body?.cancel()

      return undefined
    }

    return readLiveViewers(await answer.json()) ?? undefined
  } catch {
    return undefined
  }
}
