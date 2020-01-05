// transpile:main
import events from 'events';
import _ from 'lodash';
import { logger } from 'appium-support';
import { JWProxy } from 'appium-base-driver';
import { SubProcess } from 'teen_process';
import compareVersions from 'compare-versions';

const log = logger.getLogger('Geckodriver');

const LOG_DEBUG = 'debug';
const DEFAULT_LOG_LEVEL = LOG_DEBUG;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 29146;
const SYSTEM_GECKODRIVER = '/usr/local/bin/geckodriver';

const MIN_SUPPORTED_VERSION = '0.26.0';
const FIREFOX_PACKAGE = 'org.mozilla.firefox';
const FIREFOX_MAIN_ACTIVITY = 'org.mozilla.gecko.BrowserApp';

class Geckodriver extends events.EventEmitter {
  constructor (args = {}) {
    super();

    const {
      host = DEFAULT_HOST,
      port = DEFAULT_PORT,
      debug_level = DEFAULT_LOG_LEVEL
    } = args;

    this.proxyHost = host;
    this.proxyPort = port;
    this.jwproxy = new JWProxy({server: this.proxyHost, port: this.proxyPort, base: ''});
    this.state = Geckodriver.STATE_STOPPED;
    this.logLevel = debug_level;
    this.verbose = this.logLevel === LOG_DEBUG;
    this.capabilities = {};
  }

  parseVersion (stdout) {
    return stdout
      .match(/geckodriver\s+\d+\.\d+\.\d+/)[0]
      .replace(/^geckodriver\s*/, '');
  }

  getVersion = _.memoize(async () => {
    const proc = new SubProcess(this.geckodriver, ['--version']);
    let version;
    await proc.start((stdout) => {
      log.debug('Checking geckodriver version from stdout:', stdout);
      version = this.parseVersion(stdout);
      return true;
    });
    return version;
  });

  async start (caps, emitStartingState = true) {
    this.capabilities = _.cloneDeep(caps.desiredCapabilities || caps.capabilities);

    const args = [`--host=${this.proxyHost}`, `--port=${this.proxyPort}`, '-vv'];

    const startDetector = (stdout) => {
      return stdout.indexOf('Listening') !== -1;
    };

    if (emitStartingState) {
      this.changeState(Geckodriver.STATE_STARTING);
    }

    this.geckodriver = SYSTEM_GECKODRIVER;
    let version = await this.getVersion();
    log.debug(`Geckodriver version ${version}`);
    if (compareVersions(version, MIN_SUPPORTED_VERSION, '<')) {
      log.errorAndThrow(`Only geckodriver ${MIN_SUPPORTED_VERSION} supports Android testing. Current version: ${version}`);
    }

    let processIsAlive = false;
    try {
      this.proc = new SubProcess(this.geckodriver, args);
      processIsAlive = true;

      this.proc.on('output', (stdout, stderr) => {
        if (this.verbose) {
          for (let line of (stdout || '').trim().split('\n')) {
            if (!line.trim().length) continue; // eslint-disable-line curly
            log.debug(`[STDOUT] ${line}`);
          }
          for (let line of (stderr || '').trim().split('\n')) {
            if (!line.trim().length) continue; // eslint-disable-line curly
            log.error(`[STDERR] ${line}`);
          }
        }
      });

      this.proc.on('exit', (code, signal) => {
        log.info(code, signal);
        processIsAlive = false;

        if (this.state !== Geckodriver.STATE_STOPPED &&
          this.state !== Geckodriver.STATE_STOPPING &&
          this.state !== Geckodriver.STATE_RESTARTING) {
          let msg = `Geckodriver exited unexpectedly with code ${code}, ` +
                  `signal ${signal}`;
          log.error(msg);
          this.changeState(Geckodriver.STATE_STOPPED);
        }
      });

      log.info(`Spawning geckodriver with: ${this.geckodriver} ` +
              `${args.join(' ')}`);
      // start subproc and wait for startDetector
      await this.proc.start(startDetector);
      this.changeState(Geckodriver.STATE_ONLINE);
      await this.startSession();
    } catch (e) {
      this.emit(Geckodriver.EVENT_ERROR, e);
      if (processIsAlive) {
        await this.stop();
      }
    }
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

  async getStatus () {
    return await this.jwproxy.command('/status', 'GET');
  }

  prepareMozCapabilities () {
    let mozFirefoxOptions = {
      log: {
        level: this.logLevel
      },
      androidPackage: FIREFOX_PACKAGE,
      androidActivity: FIREFOX_MAIN_ACTIVITY
    };
    if (!_.has(this.capabilities, 'alwaysMatch["moz:firefoxOptions"]') === true) {
      this.capabilities.alwaysMatch['moz:firefoxOptions'] = {};
    }
    _.extend(this.capabilities.alwaysMatch['moz:firefoxOptions'], mozFirefoxOptions);
  }

  async startSession () {
    this.prepareMozCapabilities(this.capabilities);
    log.info(`Starting W3C Geckodriver session with capabilities: ` +
      JSON.stringify({capabilities: this.capabilities}, null, 2));
    await this.jwproxy.command('/session', 'POST', {capabilities: this.capabilities});
  }

  changeState (state) {
    this.state = state;
    log.debug(`Changed state to '${state}'`);
    this.emit(Geckodriver.EVENT_CHANGED, {state});
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