import {describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {remote} from 'webdriverio';
import {HOST, PORT, TEST_TIMEOUT, getPlatformName} from '../utils.js';
import {waitForCondition} from 'asyncbox';
import type {Browser} from 'webdriverio';

const CAPS = {
  browserName: 'MozillaFirefox',
  platformName: getPlatformName(),
  'appium:automationName': 'Gecko',
};

describe('Desktop Gecko Driver', {timeout: TEST_TIMEOUT}, () => {
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
            const element = await driver!.$('img[alt="logo"]');
            return await element.isExisting();
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
      assert.fail('Timeout waiting for logo to load');
    }
  });
});
