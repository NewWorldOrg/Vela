import type { Metadata } from 'next'

import { getEncode } from '@/repository/encode'
import { EncodeView } from '@/components/encode/encode-page'

export const metadata: Metadata = { title: 'エンコード' }

export default async function Page() {
  const result = await getEncode()

  return <EncodeView result={result} />
}
