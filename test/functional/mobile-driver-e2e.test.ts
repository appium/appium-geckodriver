import {describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {remote} from 'webdriverio';
import {HOST, PORT, TEST_TIMEOUT, getPlatformName} from '../utils.js';
import {waitForCondition} from 'asyncbox';
import type {Browser} from 'webdriverio';

const DEVICE_NAME = process.env.DEVICE_NAME || 'emulator-5554';
// The Firefox binary could be retrieved from https://www.mozilla.org/en-GB/firefox/all/#product-android-release
const CAPS = {
  platformName: getPlatformName(),
  'appium:automationName': 'Gecko',
  'appium:verbosity': 'trace',
  'moz:firefoxOptions': {
    androidDeviceSerial: DEVICE_NAME,
    androidPackage: 'org.mozilla.firefox',
  },
  'appium:androidStorage': 'internal',
} as any;

const describeMobile = process.env.CI ? describe.skip : describe;

describeMobile('Mobile GeckoDriver', {timeout: TEST_TIMEOUT}, () => {
  let driver: Browser | null = null;

  beforeEach(async () => {
    driver = await remote({
      hostname: HOST,
      port: PORT,
      capabilities: CAPS,
    });
  });
  afterEach(async () => {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
  });

  it('should start and stop a session', async () => {
    await driver!.url('https://appium.io/');
    try {
      await waitForCondition(
        async () => {
          try {
            const button = await driver!.$('#downloadLink');
            return (await button.getText()) === 'Download Appium';
          } catch {
            return false;
          }
        },
        {
          waitMs: 10000,
          intervalMs: 500,
        },
      );
    } catch {
      assert.fail('Timeout waiting for download button to load');
    }
  });
});
