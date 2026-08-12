import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: '録画詳細' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="tape">
      録画詳細・再生の画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
