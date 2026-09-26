import type { Metadata } from 'next'
import { headers } from 'next/headers'

import { motionOf } from '@/lib/motion'
import { DisplayView } from '@/components/display/display-page'

export const metadata: Metadata = { title: '表示' }

export default async function Page() {
  const said = (await headers()).get('x-motion')

  return <DisplayView motion={motionOf(said ?? undefined)} />
}
