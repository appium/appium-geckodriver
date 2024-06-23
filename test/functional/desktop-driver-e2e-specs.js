import { remote } from 'webdriverio';
import { HOST, PORT, MOCHA_TIMEOUT } from '../utils';

const CAPS = {
  browserName: 'MozillaFirefox',
  platformName: 'linux',
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
    const input = await driver.$('input[data-md-component="search-query"]');
    (await input.isExisting()).should.be.true;
  });
});


