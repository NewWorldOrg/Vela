import type { SystemStatus } from '@/repository/system'

/**
 * The capability set a current driver reports. It is here in full because the
 * length of it is the thing the screen has to hold: a short list would let a
 * layout pass that the real reading breaks.
 */
export const DRIVER_CAPABILITIES = [
  'recording',
  'live',
  'qualityMetering',
  'deviceDetection',
  'sessionStopReason',
  'tunerLedger',
  'liveTunerToggle',
  'typedTuning',
  'signalQuality',
  'gracefulRestart',
  'recordingExtension',
  'ccMeasurement',
  'scrambleMeasurement',
  'dropPositions',
  'storage',
  'recordingErasure',
  'signalQuality.cnr',
  'signalQuality.postViterbiBitError',
  'sessionPurpose.surveyNow',
  'descrambling',
]

export const SYSTEM_STATUS: SystemStatus = {
  api: { state: 'ok', status: 'ok' },
  driver: {
    state: 'ok',
    status: {
      connection: 'connected',
      hello: {
        protocolVersion: '1',
        instanceId: '4f1c8a926d0b4e779a351cb2e0f74d58',
        capabilities: DRIVER_CAPABILITIES,
        draining: false,
      },
      appProtocolVersion: '1',
      missingCapabilities: [],
      driverUpdateRequired: false,
      observedAt: '2026-08-14T00:31:12.4821930+09:00',
    },
  },
}
