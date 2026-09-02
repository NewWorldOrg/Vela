import { AppFrame } from '@/components/vela/app-shell'

import { AppTopBar } from './_shell/top-bar'

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppFrame>
      <AppTopBar />
      {children}
    </AppFrame>
  )
}
