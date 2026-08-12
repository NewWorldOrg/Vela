import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: 'ライブラリ' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="tape">
      録画ライブラリの画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
