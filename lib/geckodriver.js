// transpile:main
import events from 'events';
import _ from 'lodash';
import { logger, util } from 'appium-support';
import { JWProxy } from 'appium-base-driver';
import { SubProcess } from 'teen_process';
import { quote } from 'shell-quote';
import { getGeckodriverForOs } from './utils';

const log = logger.getLogger('Geckodriver');

const LOG_DEBUG = 'debug';
const DEFAULT_LOG_LEVEL = LOG_DEBUG;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 29146;

const MIN_SUPPORTED_VERSION = '0.26.0';
const MIN_FIREFOX_SUPPORTED_VERSION = '68.5.0';

const FIREFOX_DEFAULT_PACKAGE = 'org.mozilla.firefox';
const FIREFOX_DEFAULT_MAIN_ACTIVITY = 'org.mozilla.gecko.BrowserApp';

class Geckodriver extends events.EventEmitter {
  constructor (args = {}) {
    super();

    const {
      host = DEFAULT_HOST,
      port = DEFAULT_PORT,
      geckodriverExecutable = null,
      noReset = false,
      debugLevel = DEFAULT_LOG_LEVEL
    } = args;

    this.proxyHost = host;
    this.proxyPort = port;
    this.jwproxy = new JWProxy({server: this.proxyHost, port: this.proxyPort, base: '', keepAlive: true});
    this.state = Geckodriver.STATE_STOPPED;
    this.logLevel = debugLevel;
    this.verbose = this.logLevel === LOG_DEBUG;
    this.geckodriverExecutable = geckodriverExecutable;
    this.noReset = noReset;
    this.capabilities = {};
  }

  parseVersion (stdout) {
    return stdout
      .match(/geckodriver\s+\d+\.\d+\.\d+/)[0]
      .replace(/^geckodriver\s*/, '');
  }

  getVersion = _.memoize(async (geckodriverExecutable) => {
    const proc = new SubProcess(geckodriverExecutable, ['--version']);
    let version;
    await proc.start((stdout) => {
      log.debug('Checking geckodriver version from stdout:', stdout);
      version = this.parseVersion(stdout);
      return true;
    });
    return version;
  });

  async startGeckodriverSubprocess (executable, args) {
    const startDetector = (stdout) => {
      return stdout.includes('Listening');
    };

    try {
      this.proc = new SubProcess(executable, args);
      this.proc.on('output', (stdout, stderr) => {
        if (this.verbose) {
          for (let line of (stdout || '').trim().split('\n')) {
            if (!line.trim().length) continue; // eslint-disable-line curly
            log.debug(`[STDOUT] ${line}`);
          }
          for (const line of (stderr || '').trim().split('\n')) {
            if (!line.trim().length) continue; // eslint-disable-line curly
            log.error(`[STDERR] ${line}`);
          }
        }
      });

      this.proc.on('exit', (code, signal) => {
        log.info(code, signal);
        if (![Geckodriver.STATE_STOPPED, Geckodriver.STATE_STOPPING, Geckodriver.STATE_RESTARTING].includes(this.state)) {
          let msg = `Geckodriver exited unexpectedly with code ${code}, ` +
                  `signal ${signal}`;
          log.error(msg);
          this.changeState(Geckodriver.STATE_STOPPED);
        }
      });

      log.info(`Spawning geckodriver with: ${quote([executable, ...args])}`);
      await this.proc.start(startDetector);
    } catch (e) {
      this.emit(Geckodriver.EVENT_ERROR, e);
      if (this.proc.isRunning) {
        await this.stop();
      }
    }
  }

  async start (caps, emitStartingState = true) {
    this.capabilities = _.cloneDeep(caps.desiredCapabilities || caps.capabilities || caps);
    this.geckodriverExecutable = this.geckodriverExecutable || this.capabilities.geckodriverExecutable || await getGeckodriverForOs();

    let version = await this.getVersion(this.geckodriverExecutable);
    log.debug(`Geckodriver version ${version}`);
    if (util.compareVersions(version, '<', MIN_SUPPORTED_VERSION)) {
      log.errorAndThrow(`Only geckodriver ${MIN_SUPPORTED_VERSION} supports Android testing. Current version: ${version}`);
    }

    if (emitStartingState) {
      this.changeState(Geckodriver.STATE_STARTING);
    }
    const args = [`--host=${this.proxyHost}`, `--port=${this.proxyPort}`, '-vv'];
    await this.startGeckodriverSubprocess(this.geckodriverExecutable, args);
    this.changeState(Geckodriver.STATE_ONLINE);
    await this.startSession();
  }

  sessionId () {
    if (this.state !== Geckodriver.STATE_ONLINE) {
      return null;
    }
    return this.jwproxy.sessionId;
  }

  async stop () {
    try {
      await this.proc.stop();
      this.changeState(Geckodriver.STATE_STOPPED);
    } catch (e) {
      this.emit(Geckodriver.EVENT_ERROR, e);
    }
  }

  async deleteSession () {
    await this.jwproxy.command('', 'DELETE', {});
    await this.stop();
    this.jwproxy.sessionId = null;
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

  prepareMozCapabilities () {
    let mozFirefoxOptions = {
      log: {
        level: this.logLevel
      },
      androidPackage: this.capabilities.androidPackage || FIREFOX_DEFAULT_PACKAGE,
      androidActivity: this.capabilities.androidActivity || FIREFOX_DEFAULT_MAIN_ACTIVITY
    };
    if (!_.has(this.capabilities.alwaysMatch, 'moz:firefoxOptions') === true) {
      this.capabilities.alwaysMatch['moz:firefoxOptions'] = {};
    }
    _.extend(this.capabilities.alwaysMatch['moz:firefoxOptions'], mozFirefoxOptions);
  }

  async startSession () {
    log.warn(`Geckodriver min Firefox version supported: ${MIN_FIREFOX_SUPPORTED_VERSION}`);
    this.prepareMozCapabilities(this.capabilities);
    log.info(`Starting W3C Geckodriver session with capabilities: ` +
      JSON.stringify({capabilities: this.capabilities}, null, 2));
    await this.jwproxy.command('/session', 'POST', {capabilities: this.capabilities});
  }

  changeState (state) {
    this.state = state;
    log.debug(`Changed state to '${state}'`);
    this.emit(Geckodriver.EVENT_STATE_CHANGED, {state});
  }
}

Geckodriver.EVENT_ERROR = 'geckodriver_error';
Geckodriver.EVENT_STATE_CHANGED = 'stateChanged';
Geckodriver.STATE_STOPPED = 'stopped';
Geckodriver.STATE_STARTING = 'starting';
Geckodriver.STATE_ONLINE = 'online';
Geckodriver.STATE_STOPPING = 'stopping';
Geckodriver.STATE_RESTARTING = 'restarting';

export default Geckodriver;