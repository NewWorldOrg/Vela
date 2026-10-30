import { AppFrame } from '@/components/vela/app-shell'
import { Curtain } from '@/components/vela/curtain'

import { AppTabBar } from './_shell/tab-bar'
import { AppTopBar } from './_shell/top-bar'

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppFrame>
      <Curtain />
      <AppTopBar />
      {children}
      <AppTabBar />
    </AppFrame>
  )
}
