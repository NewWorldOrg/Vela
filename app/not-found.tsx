import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export const metadata: Metadata = { title: 'ページが見つかりません' }

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <ScreenPlaceholder
        title="ページが見つかりません"
        action={
          <Button variant="tone" asChild>
            <Link href="/library">ライブラリへ</Link>
          </Button>
        }
      />
    </div>
  )
}
