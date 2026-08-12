import type { Metadata } from 'next'

import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: '番組詳細' }

export default function Page() {
  return (
    <ScreenPlaceholder spot="antenna">
      番組詳細の画面はこれから実装されます。
    </ScreenPlaceholder>
  )
}
