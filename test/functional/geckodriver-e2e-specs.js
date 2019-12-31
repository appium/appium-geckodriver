// transpile:mocha

import Geckodriver from '../../lib/geckodriver';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

let should = chai.should();
chai.use(chaiAsPromised);

const caps = {
  capabilities: {
    alwaysMatch: {
      browserName: 'firefox',
      'moz:firefoxOptions': {
        prefs: {
          'javascript.options.showInConsole': false
        },
      }
    },
    firefoxInitialUrl: 'http://google.com',
  }
};

describe('Geckodriver simple test', function () {
  this.timeout(20000);
  let driver;
  before(function () {
    driver = new Geckodriver();
  });

  it('should have STOPPED state on construction', function () {
    driver.state.should.equal(Geckodriver.STATE_STOPPED);
  });

  it('should start a session', async function () {
    await driver.start(caps);
    should.exist(driver.jwproxy.sessionId);
  });

  it('stop geckodriver', async function () {
    await driver.stop();
    driver.state.should.equal(Geckodriver.STATE_STOPPED);
  });
});
