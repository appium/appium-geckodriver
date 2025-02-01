import { VERBOSITY } from './constants';

export const desiredCapConstraints = {
  browserName: {
    isString: true
  },
  browserVersion: {
    isString: true
  },
  acceptInsecureCerts: {
    isBoolean: true
  },
  pageLoadStrategy: {
    isString: true
  },
  proxy: {
    isObject: true
  },
  setWindowRect: {
    isBoolean: true
  },
  timeouts: {
    isObject: true
  },
  unhandledPromptBehavior: {
    isString: true
  },
  systemPort: {
    isNumber: true
  },
  marionettePort: {
    isNumber: true
  },
  verbosity: {
    isString: true,
    inclusionCaseInsensitive: Object.values(VERBOSITY)
  },
  androidStorage: {
    isString: true,
    inclusionCaseInsensitive: ['auto', 'app', 'internal', 'sdcard']
  },
  'moz:firefoxOptions': {
    isObject: true
  }
};
