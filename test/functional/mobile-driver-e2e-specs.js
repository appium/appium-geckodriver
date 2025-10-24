import { remote } from 'webdriverio';
import { HOST, PORT, MOCHA_TIMEOUT, getPlatformName } from '../utils';
import { waitForCondition } from 'asyncbox';

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
};

describe('Mobile GeckoDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let driver;
  let chai;

  before(async function () {
    chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');

    chai.should();
    chai.use(chaiAsPromised.default);

    if (process.env.CI) {
      // Figure out a way to run this on Azure
      return this.skip();
    }
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
          const button = await driver.$('#downloadLink');
          return (await button.getText()) === 'Download Appium';
        } catch {
          return false;
        }
      }, {
        waitMs: 10000,
        intervalMs: 500,
      });
    } catch {
      this.fail('Timeout waiting for download button to load');
    }
  });
});


