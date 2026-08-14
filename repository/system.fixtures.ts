import type { SystemStatus } from '@/repository/system'

export const SYSTEM_STATUS: SystemStatus = {
  api: { state: 'ok', status: 'ok' },
  driver: {
    state: 'ok',
    status: {
      connection: 'connected',
      hello: {
        protocolVersion: '1',
        instanceId: '4f1c8a92-6d0b-4e77-9a35-1cb2e0f74d58',
        capabilities: ['recording', 'live', 'diagnostics'],
        draining: false,
      },
      appProtocolVersion: '1',
      missingCapabilities: [],
      driverUpdateRequired: false,
      observedAt: '2026-08-14T00:31:12.4821930+09:00',
    },
  },
}
