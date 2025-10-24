import { remote } from 'webdriverio';
import { HOST, PORT, MOCHA_TIMEOUT, getPlatformName } from '../utils';
import { waitForCondition } from 'asyncbox';

const CAPS = {
  browserName: 'MozillaFirefox',
  platformName: getPlatformName(),
  'appium:automationName': 'Gecko',
};

describe('Desktop Gecko Driver', function () {
  this.timeout(MOCHA_TIMEOUT);

  /** @type {import('webdriverio').Browser} */
  let driver;
  let chai;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    chai.should();
    chai.use(chaiAsPromised.default);
  });

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
    await driver.url('https://appium.io/');
    try {
      await waitForCondition(async () => {
        try {
          const element = await driver.$('img[alt="logo"]');
          return (await element.isExisting());
        } catch {
          return false;
        }
      }, {
        waitMs: 10000,
        intervalMs: 500,
      });
    } catch {
      this.fail('Timeout waiting for logo to load');
    }
  });
});


