import { redirect } from 'next/navigation'

import { HOME_PATH } from '@/lib/path'

export default function Page() {
  redirect(HOME_PATH)
}
