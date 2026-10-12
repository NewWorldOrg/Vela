import {
  AUTO_OPEN_SPELLING,
  DATA_BROADCAST_AUTO_OPEN,
  DATA_BROADCAST_LINE,
  DATA_BROADCAST_RECEIVER_ID,
  LINE_SPELLING,
  RECEIVER_ID_SPELLING,
  flagOf,
} from '@/lib/stored-flag'

export const AUTO_OPEN_LABEL = 'データ放送を自動で開く'

export const AUTO_OPEN_HINT =
  '入にすると、放送が求めている番組では視聴を始めると同時にデータ放送を開きます。'

export const LINE_LABEL = 'データ放送の通信を許可する'

export const LINE_HINT =
  '入にすると、ライブ視聴中のデータ放送が放送局のサーバと通信します。'

export const RECEIVER_ID_LABEL = '受信機の識別子を放送局に渡す'

export const RECEIVER_ID_HINT =
  '入にすると、データ放送が求めたときに B-CAS カードの ID を渡します。'

/** The three viewing settings as the switches start out, read the same way on the server from the request's cookies and in the browser from its own. */
export interface ViewingSettings {
  autoOpensDataBroadcast: boolean
  allowsTheLine: boolean
  handsTheReceiverId: boolean
}

/** The viewing settings from what `said` finds for each cookie. */
export function viewingSettingsOf(
  said: (key: string) => string | undefined,
): ViewingSettings {
  return {
    autoOpensDataBroadcast: flagOf(
      said(DATA_BROADCAST_AUTO_OPEN),
      AUTO_OPEN_SPELLING,
    ),
    allowsTheLine: flagOf(said(DATA_BROADCAST_LINE), LINE_SPELLING),
    handsTheReceiverId: flagOf(
      said(DATA_BROADCAST_RECEIVER_ID),
      RECEIVER_ID_SPELLING,
    ),
  }
}
