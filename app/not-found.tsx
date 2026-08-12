import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ScreenPlaceholder } from '@/app/_components/screen-placeholder'

export default function NotFound() {
  return (
    <div className="dot-grid flex min-h-dvh flex-col bg-bg">
      <ScreenPlaceholder spot="star">
        <b className="mb-1 block text-ui text-ink">ページが見つかりません</b>
        URL が間違っているか、すでに存在しないページです。
        <span className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/library">ライブラリへ</Link>
          </Button>
        </span>
      </ScreenPlaceholder>
    </div>
  )
}
