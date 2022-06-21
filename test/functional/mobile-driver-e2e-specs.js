import { remote } from 'webdriverio';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';

chai.should();
chai.use(chaiAsPromised);

const DEVICE_NAME = process.env.DEVICE_NAME || 'emulator-5554';
// The Firefox binary could be retrieved from https://www.mozilla.org/en-GB/firefox/all/#product-android-release
const CAPS = {
  platformName: 'linux',
  'appium:automationName': 'Gecko',
  // platformName: 'mac',
  'appiuim:verbosity': 'trace',
  'moz:firefoxOptions': {
    androidDeviceSerial: DEVICE_NAME,
    androidPackage: 'org.mozilla.firefox',
  },
  'appium:androidStorage': 'internal',
};

describe('Mobile GeckoDriver', function () {
  this.timeout(MOCHA_TIMEOUT);

  let driver;
  before(function () {
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
    const button = await driver.$('#downloadLink');
    await button.getText().should.eventually.eql('Download Appium');
  });
});


