import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlModule } from '@/lib/bml/resources'
import { modulePayload } from '@/lib/bml/resources'
import type { DataBroadcastTimeline } from '@/lib/recording-data-broadcast'
import type { ReadDataBroadcastModule } from '@/components/recordings/read-data-broadcast'

/** The catalog of a recording that carried a self-made broadcast throughout: every module in effect from the first second to the last. */
export function throughout(catalog: BmlCatalog): DataBroadcastTimeline {
  return {
    entryTag: catalog.entryTag,
    autoStart: catalog.autoStart,
    startup: catalog.startup,
    incomplete: false,
    carousels: catalog.carousels.map((carousel) => ({
      tag: carousel.tag,
      downloadId: carousel.downloadId,
      versions: carousel.modules.map((module) => ({
        id: module.id,
        version: module.version,
        fromSec: 0,
        toSec: 600,
        size: 0,
      })),
    })),
    events: [],
  }
}

/** Reads the recording's modules out of `modules`, by the version the timeline placed. */
export function readingModulesOf(
  modules: () => BmlModule[],
): ReadDataBroadcastModule {
  return async (id, placed) => {
    const found = modules().find(
      (one) =>
        one.tag === placed.tag &&
        one.id === placed.id &&
        one.version === placed.version,
    )

    return found ? modulePayload(found) : null
  }
}
