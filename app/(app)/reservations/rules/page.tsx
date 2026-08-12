import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: 'ルール' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="star">
      ルール一覧・編集の画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
