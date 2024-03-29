import { remote } from 'webdriverio';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';

chai.should();
chai.use(chaiAsPromised);

const CAPS = {
  browserName: 'MozillaFirefox',
  platformName: 'linux',
  'appium:automationName': 'Gecko',
};

describe('Desktop Gecko Driver', function () {
  this.timeout(MOCHA_TIMEOUT);

  /** @type {import('webdriverio').Browser} */
  let driver;
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
    const input = await driver.$('input[data-md-component="search-query"]');
    (await input.isExisting()).should.be.true;
  });
});


