import type {Constraints} from '@appium/types';
import {VERBOSITY} from './constants';

const DESIRED_CAP_CONSTRAINTS = {
  browserName: {
    isString: true,
  },
  browserVersion: {
    isString: true,
  },
  acceptInsecureCerts: {
    isBoolean: true,
  },
  pageLoadStrategy: {
    isString: true,
  },
  proxy: {
    isObject: true,
  },
  setWindowRect: {
    isBoolean: true,
  },
  timeouts: {
    isObject: true,
  },
  unhandledPromptBehavior: {
    isString: true,
  },
  systemPort: {
    isNumber: true,
  },
  marionettePort: {
    isNumber: true,
  },
  verbosity: {
    isString: true,
    inclusionCaseInsensitive: Object.values(VERBOSITY) as [string, ...string[]],
  },
  androidStorage: {
    isString: true,
    inclusionCaseInsensitive: ['auto', 'app', 'internal', 'sdcard'],
  },
  'moz:firefoxOptions': {
    isObject: true,
  },
} as const satisfies Constraints;

export const desiredCapConstraints = DESIRED_CAP_CONSTRAINTS;
