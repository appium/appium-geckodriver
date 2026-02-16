import {remote} from 'webdriverio';
import {HOST, PORT, MOCHA_TIMEOUT, getPlatformName} from '../utils';
import {waitForCondition} from 'asyncbox';
import type {Browser} from 'webdriverio';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised.default);

const CAPS = {
  browserName: 'MozillaFirefox',
  platformName: getPlatformName(),
  'appium:automationName': 'Gecko',
};

describe('Desktop Gecko Driver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let driver: Browser | null = null;

  beforeEach(async function () {
    driver = await remote({
      hostname: HOST,
      port: PORT,
      capabilities: CAPS,
    });
  });
  afterEach(async function () {
    if (driver) {
      await driver.deleteSession();
      driver = null;
    }
  });

  it('should start and stop a session', async function () {
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
      this.fail('Timeout waiting for logo to load');
    }
  });
});
