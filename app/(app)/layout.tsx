import { cookies } from 'next/headers'

import { CURTAIN_COOKIE, curtainAsked } from '@/lib/curtain'
import { AppFrame } from '@/components/vela/app-shell'
import { Curtain } from '@/components/vela/curtain'

import { AppTopBar } from './_shell/top-bar'

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const asked = curtainAsked((await cookies()).get(CURTAIN_COOKIE)?.value)

  return (
    <AppFrame>
      {asked && <Curtain />}
      <AppTopBar />
      {children}
    </AppFrame>
  )
}
