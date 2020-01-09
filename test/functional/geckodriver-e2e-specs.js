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
          'browser.startup.page': 0,
          'startup.homepage_welcome_url': 'about:blank',
          'startup.homepage_welcome_url.additional': '',
          'browser.startup.homepage_override.mstone': 'ignore',
          'browser.firstrun-content.dismissed': true,
        },
      }
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
    driver.state.should.equal(Geckodriver.STATE_ONLINE);
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
    driver.jwproxy.sessionId().should.equal(null);
  });

  it('should stop geckodriver', async function () {
    await driver.stop();
    driver.state.should.equal(Geckodriver.STATE_STOPPED);
  });
});
