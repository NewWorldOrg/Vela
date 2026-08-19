import { AppTopBar } from './_shell/top-bar'

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="dot-grid flex h-dvh flex-col overflow-hidden bg-bg">
      <AppTopBar />
      {children}
    </div>
  )
}
