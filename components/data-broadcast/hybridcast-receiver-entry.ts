import { startHybridcastReceiver } from '@/components/data-broadcast/hybridcast-receiver'

startHybridcastReceiver(
  window,
  document.currentScript instanceof HTMLScriptElement
    ? document.currentScript
    : null,
)
