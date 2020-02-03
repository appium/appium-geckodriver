// transpile:mocha

import Geckodriver from '../../lib/driver';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';

let should = chai.should();
chai.use(chaiAsPromised);


// const FIREFOX_BETA_PACKAGE = 'org.mozilla.firefox_beta';
// const FENIX_NIGHTLY_PACKAGE = 'org.mozilla.fenix.nightly';
// const FENIX_NIGHTLY_MAIN_ACTIVITY = 'org.mozilla.fenix.nightly.App';

const baseCaps = {
  platformName: 'android',
  deviceName: 'Android',
  browserName: 'firefox',
  'moz:firefoxOptions': {
    prefs: {
      'browser.startup.page': 0,
      'startup.homepage_welcome_url': 'about:blank',
      'startup.homepage_welcome_url.additional': '',
      'browser.startup.homepage_override.mstone': 'ignore',
      'browser.firstrun-content.dismissed': true,
    },
  }
};

function buildReqRes (url, method, body) {
  let req = {originalUrl: url, method, body};
  let res = {};
  res.headers = {};
  res.set = (k, v) => { res[k] = v; };
  res.status = (code) => {
    res.sentCode = code;
    return {
      send: (body) => {
        try {
          body = JSON.parse(body);
        } catch (e) {}
        res.sentBody = body;
      }
    };
  };
  return [req, res];
}

// eslint-disable-next-line mocha/no-exclusive-tests
describe.only('Geckodriver simple test on Firefox production release', function () {
  this.timeout(20000);
  let driver;
  before(function () {
    driver = new Geckodriver();
  });

  // eslint-disable-next-line mocha/no-exclusive-tests
  it('should start a session', async function () {
    await driver.createSession(baseCaps);
    should.exist(driver.jwproxy.sessionId);
  });

  it('should open an url', async function () {
    await driver.sendCommand('/url', 'POST', {url: 'https://saucelabs.github.io/training-test-page/'});
    let url = await driver.sendCommand('/url', 'GET', {});
    url.should.equal('https://saucelabs.github.io/training-test-page/');
  });

  it('should proxy a request', async function () {
    let [req, res] = buildReqRes('/url', 'GET');
    await driver.proxyReq(req, res);
    res.headers['content-type'].should.contain('application/json');
    res.sentCode.should.equal(200);
    res.sentBody.value.should.equal('https://saucelabs.github.io/training-test-page/');
  });

  it('should be able to locate an element', async function () {
    let el = await driver.sendCommand('/element', 'POST', {'using': 'css selector', 'value': '#i_am_an_id'});
    el.should.not.equal(null);
  });

  it('should delete the current session', async function () {
    await driver.deleteSession();
    chai.expect(driver.gecko).to.equal(null);
    chai.expect(driver.jwproxy).to.equal(null);
    chai.expect(driver.isProxyActive).to.equal(false);
  });

});

const FENIX_PACKAGE = 'org.mozilla.fenix';
const FENIX_MAIN_ACTIVITY = 'org.mozilla.fenix.IntentReceiverActivity';

describe('Geckodriver simple test on Firefox beta release(Fenix)', function () {
  this.timeout(20000);
  let driver;
  before(function () {
    driver = new Geckodriver();
  });

  it('should start a session', async function () {
    const caps = _.extend(baseCaps, {
      capabilities: {
        alwaysMatch: {
          'moz:firefoxOptions': {
            androidPackage: FENIX_PACKAGE,
            androidActivity: FENIX_MAIN_ACTIVITY,
            androidIntentArguments: [
              '-d', 'http://saucelabs.github.io/training-test-page/'
            ],
          }
        }
      }
    });
    await driver.start(caps);
    should.exist(driver.jwproxy.sessionId);
  });

  it('should open an url', async function () {
    await driver.sendCommand('/url', 'POST', {url: 'https://saucelabs.github.io/training-test-page/'});
    let url = await driver.sendCommand('/url', 'GET', {});
    url.should.equal('https://saucelabs.github.io/training-test-page/');
  });

  it('should proxy a request', async function () {
    let [req, res] = buildReqRes('/url', 'GET');
    await driver.proxyReq(req, res);
    res.headers['content-type'].should.contain('application/json');
    res.sentCode.should.equal(200);
    res.sentBody.value.should.equal('https://saucelabs.github.io/training-test-page/');
  });

  it('should be able to locate an element', async function () {
    let el = await driver.sendCommand('/element', 'POST', {'using': 'css selector', 'value': '#i_am_an_id'});
    el.should.not.equal(null);
  });

  it('should delete the current session', async function () {
    await driver.deleteSession();
    chai.expect(driver.sessionId()).to.equal(null);
  });

  it('should stop geckodriver', async function () {
    await driver.stop();
  });
});
