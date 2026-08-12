import type { Metadata } from 'next'

import { getEncode } from '@/repository/encode'
import { EncodeView } from '@/page-component/settings/encode-view'

export const metadata: Metadata = { title: 'エンコード' }

export default async function Page() {
  const result = await getEncode()

  return <EncodeView result={result} />
}
