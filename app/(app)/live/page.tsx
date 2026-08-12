import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: 'ライブ' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="star">
      ライブ視聴の画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
