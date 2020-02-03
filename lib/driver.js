// transpile:main
import _ from 'lodash';
import { logger } from 'appium-support';
import { JWProxy, BaseDriver } from 'appium-base-driver';
import { desiredConstraints } from './desired-caps';

import GeckodriverProc from './gecko';

const log = logger.getLogger('Geckodriver');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 29146;

const MIN_FIREFOX_SUPPORTED_VERSION = '68.5.0';

const FIREFOX_DEFAULT_PACKAGE = 'org.mozilla.firefox';
const FIREFOX_DEFAULT_MAIN_ACTIVITY = 'org.mozilla.gecko.BrowserApp';

class Geckodriver extends BaseDriver {
  constructor (opts = {}, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);
    this.desiredConstraints = desiredConstraints;
    this.initState();
  }

  initState () {
    this.gecko = null;
    this.jwproxy = null;
    this.isProxyActive = false;
  }

  async createSession (...args) {
    let [sessionId, caps] = await super.createSession(...args);
    try {
      let defaultOpts = {
        host: DEFAULT_HOST,
        port: DEFAULT_PORT
      };
      _.defaults(this.opts, defaultOpts);

      log.warn(`Geckodriver min Firefox version supported: ${MIN_FIREFOX_SUPPORTED_VERSION}`);
      this.gecko = new GeckodriverProc(this.opts.host, this.opts.port, this.opts.verbose, this.opts.geckodriverExecutable);
      await this.gecko.start();

      this.jwproxy = new JWProxy({
        server: this.opts.host,
        port: this.opts.port,
        base: '',
        keepAlive: true
      });

      const finalCaps = this.prepareMozCapabilities(caps);
      log.info(`Starting W3C Geckodriver session with capabilities: ` +
        JSON.stringify(finalCaps, null, 2));

      await this.jwproxy.command('/session', 'POST', finalCaps);
      this.isProxyActive = true;
      return [sessionId, caps];
    } catch (e) {
      await this.stop();
      log.errorAndThrow('Failed to createSession', e);
    }
  }

  sessionId () {
    return this.jwproxy ? this.jwproxy.sessionId : null;
  }

  async stop () {
    try {
      await this.gecko.stop();
    } catch (e) {
      log.error('Failed to stop geckodriver', e);
    } finally {
      this.initState();
    }
  }

  async deleteSession () {
    try {
      await this.jwproxy.command('', 'DELETE', {});
      await this.stop();
    } catch (e) {
      log.errorAndThrow('Failed to deleteSession', e);
    }
  }

  async getStatus () {
    return await this.jwproxy.command('/status', 'GET');
  }

  async sendCommand (url, method, body) {
    return await this.jwproxy.command(url, method, body);
  }

  async proxyReq (req, res) {
    return await this.jwproxy.proxyReqRes(req, res);
  }

  prepareMozCapabilities (caps) {
    if (caps.platformName === 'android') {
      // Clean capabilities for Firefox for Android, we only need `moz:firefoxOptions`
      let defaultsMozOptions = {
        androidPackage: FIREFOX_DEFAULT_PACKAGE,
        androidActivity: FIREFOX_DEFAULT_MAIN_ACTIVITY
      };
      let finalCaps = _.clone(caps);
      _.defaults(finalCaps['moz:firefoxOptions'], defaultsMozOptions);
      return {
        capabilities: {
          alwaysMatch: {
            'moz:firefoxOptions': finalCaps['moz:firefoxOptions']
          }
        }
      };
    }
    return caps;
  }

}

export default Geckodriver;