import type {MethodMap} from '@appium/types';
import type {GeckoDriver} from './driver';

export const newMethodMap = {
  /**
   * Firefox vendor-specific endpoints
   * https://github.com/mozilla-firefox/firefox/blob/main/testing/geckodriver/src/command.rs
   */
  '/session/:sessionId/moz/context': {
    GET: {
      command: 'getContext',
    },
    POST: {
      command: 'setContext',
      payloadParams: {required: ['context']},
    },
  },
  '/session/:sessionId/moz/addon/install': {
    POST: {
      command: 'installAddon',
      payloadParams: {required: ['addon'], optional: ['temporary', 'allowPrivateBrowsing']},
    },
  },
  '/session/:sessionId/moz/addon/uninstall': {
    POST: {
      command: 'uninstallAddon',
      payloadParams: {required: ['id']},
    },
  },
  '/session/:sessionId/moz/screenshot/full': {
    GET: {
      command: 'takeFullScreenshot',
    },
  },
} as const satisfies MethodMap<GeckoDriver>;
