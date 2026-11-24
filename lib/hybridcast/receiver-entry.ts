import { startHybridcastReceiver } from '@/lib/hybridcast/start-receiver'

startHybridcastReceiver(
  window,
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null,
)
