import _ from 'lodash';
import os from 'os';
import path from 'path';
import { JWProxy, errors } from 'appium/driver';
import { fs, util, system } from 'appium/support';
import { SubProcess } from 'teen_process';
import { waitForCondition } from 'asyncbox';
import { findAPortNotInUse } from 'portscanner';
import { execSync } from 'child_process';
import { VERBOSITY } from './constants';

const GD_BINARY = `geckodriver${system.isWindows() ? '.exe' : ''}`;
const STARTUP_TIMEOUT_MS = 10000; // 10 seconds
const GECKO_PORT_RANGE = [5200, 5300];
const GECKO_SERVER_GUARD = util.getLockFileGuard(
  path.resolve(os.tmpdir(), 'gecko_server_guard.lock'),
  {timeout: 5, tryRecovery: true}
);
const DEFAULT_MARIONETTE_PORT = 2828;
const PROCESS_SPECIFIC_OPTION_NAMES_MAP = Object.freeze({
  noReset: 'noReset',
  verbosity: 'verbosity',
  androidStorage: 'androidStorage',
  marionettePort: 'marionettePort',
  systemPort: 'port',
});
export const GECKO_SERVER_HOST = '127.0.0.1';


export class GeckoProxy extends JWProxy {
  /** @type {boolean|undefined} */
  didProcessExit;

  async proxyCommand (url, method, body = null) {
    if (this.didProcessExit) {
      throw new errors.InvalidContextError(
        `'${method} ${url}' cannot be proxied to Gecko Driver server because ` +
        'its process is not running (probably crashed). Check the Appium log for more details');
    }
    return await super.proxyCommand(url, method, body);
  }
}

class GeckoDriverProcess {
  /** @type {boolean|undefined} */
  noReset;

  /** @type {string|undefined} */
  verbosity;

  /** @type {string|undefined} */
  androidStorage;

  /** @type {number|undefined} */
  marionettePort;

  /** @type {number|undefined} */
  port;

  /**
   *
   * @param {import('@appium/types').AppiumLogger} log
   * @param {import('@appium/types').StringRecord} opts
   */
  constructor (log, opts = {}) {
    for (const [optName, propName] of _.toPairs(PROCESS_SPECIFIC_OPTION_NAMES_MAP)) {
      this[propName] = opts[optName];
    }
    this.log = log;
    this.proc = null;
  }

  get isRunning () {
    return !!(this.proc?.isRunning);
  }

  async init () {
    if (this.isRunning) {
      return;
    }

    if (!this.port) {
      await GECKO_SERVER_GUARD(async () => {
        const [startPort, endPort] = GECKO_PORT_RANGE;
        try {
          this.port = await findAPortNotInUse(startPort, endPort);
        } catch {
          throw new Error(
            `Cannot find any free port in range ${startPort}..${endPort}. ` +
            `Double check the processes that are locking ports within this range and terminate ` +
            `these which are not needed anymore or set any free port number to the 'systemPort' capability`);
        }
      });
    }

    let driverBin;
    try {
      driverBin = await fs.which(GD_BINARY);
    } catch {
      throw new Error(`${GD_BINARY} binary cannot be found in PATH. ` +
        `Please make sure it is present on your system`);
    }
    /** @type {string[]} */
    const args = [];
    /* #region Options */
    switch (_.toLower(this.verbosity)) {
      case VERBOSITY.DEBUG:
        args.push('-v');
        break;
      case VERBOSITY.TRACE:
        args.push('-vv');
        break;
    }
    if (this.noReset) {
      args.push('--connect-existing');
      // https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#code-connect-existing-code
      if (_.isNil(this.marionettePort)) {
        this.log.info(`'marionettePort' capability value is not provided while 'noReset' is enabled`);
        this.log.info(`Assigning 'marionettePort' to the default value (${DEFAULT_MARIONETTE_PORT})`);
      }
      args.push('--marionette-port', `${this.marionettePort ?? DEFAULT_MARIONETTE_PORT}`);
    } else if (!_.isNil(this.marionettePort)) {
      args.push('--marionette-port', `${this.marionettePort}`);
    }
    /* #endregion */

    args.push('-p', `${this.port}`);
    if (this.androidStorage) {
      args.push('--android-storage', this.androidStorage);
    }
    this.proc = new SubProcess(driverBin, args);
    this.proc.on('output', (stdout, stderr) => {
      const line = _.trim(stdout || stderr);
      if (line) {
        this.log.debug(`[${GD_BINARY}] ${line}`);
      }
    });
    this.proc.on('exit', (code, signal) => {
      this.log.info(`${GD_BINARY} has exited with code ${code}, signal ${signal}`);
    });
    this.log.info(`Starting '${driverBin}' with args ${JSON.stringify(args)}`);
    await this.proc.start(0);
  }

  async stop () {
    if (this.isRunning) {
      await this.proc?.stop('SIGTERM');
    }
  }

  async kill () {
    if (this.isRunning) {
      try {
        await this.proc?.stop('SIGKILL');
      } catch {}
    }
  }
}

const RUNNING_PROCESS_IDS = [];
process.once('exit', () => {
  if (_.isEmpty(RUNNING_PROCESS_IDS)) {
    return;
  }

  const command = system.isWindows()
    ? ('taskkill.exe ' + RUNNING_PROCESS_IDS.map((pid) => `/PID ${pid}`).join(' '))
    : `kill ${RUNNING_PROCESS_IDS.join(' ')}`;
  try {
    execSync(command);
  } catch {}
});

export class GeckoDriverServer {
  /** @type {GeckoProxy} */
  proxy;

  /**
   *
   * @param {import('@appium/types').AppiumLogger} log
   * @param {import('@appium/types').StringRecord} caps
   */
  constructor (log, caps) {
    this.process = new GeckoDriverProcess(log, caps);
    this.log = log;
    // @ts-ignore That's ok
    this.proxy = null;
  }

  get isRunning () {
    return !!(this.process?.isRunning);
  }

  /**
   *
   * @param {import('@appium/types').StringRecord} geckoCaps
   * @param {SessionOptions} [opts={}]
   * @returns {Promise<import('@appium/types').StringRecord>}
   */
  async start (geckoCaps, opts = {}) {
    await this.process.init();

    const proxyOpts = {
      server: GECKO_SERVER_HOST,
      port: this.process.port,
      log: this.log,
      base: '',
      keepAlive: true,
    };
    if (opts.reqBasePath) {
      proxyOpts.reqBasePath = opts.reqBasePath;
    }
    this.proxy = new GeckoProxy(proxyOpts);
    this.proxy.didProcessExit = false;
    this.process?.proc?.on('exit', () => {
      if (this.proxy) {
        this.proxy.didProcessExit = true;
      }
    });

    try {
      await waitForCondition(async () => {
        try {
          await this.proxy?.command('/status', 'GET');
          return true;
        } catch (err) {
          if (this.proxy?.didProcessExit) {
            throw new Error(err.message);
          }
          return false;
        }
      }, {
        waitMs: STARTUP_TIMEOUT_MS,
        intervalMs: 1000,
      });
    } catch (e) {
      if (this.process.isRunning) {
        // avoid "frozen" processes,
        await this.process.kill();
      }
      if (/Condition unmet/.test(e.message)) {
        throw new Error(`Gecko Driver server is not listening within ${STARTUP_TIMEOUT_MS}ms timeout. ` +
          `Make sure it could be started manually from a terminal`);
      }
      throw e;
    }
    const pid = this.process.proc?.pid;
    RUNNING_PROCESS_IDS.push(pid);
    this.process.proc?.on('exit', () => void _.pull(RUNNING_PROCESS_IDS, pid));

    return /** @type {import('@appium/types').StringRecord} */ (
      await this.proxy.command('/session', 'POST', {
        capabilities: {
          firstMatch: [{}],
          alwaysMatch: geckoCaps,
        }
      })
    );
  }

  async stop () {
    if (!this.isRunning) {
      this.log.info(`Gecko Driver session cannot be stopped, because the server is not running`);
      return;
    }

    if (this.proxy?.sessionId) {
      try {
        await this.proxy.command(`/session/${this.proxy.sessionId}`, 'DELETE');
      } catch (e) {
        this.log.info(`Gecko Driver session cannot be deleted. Original error: ${e.message}`);
      }
    }

    try {
      await this.process.stop();
    } catch (e) {
      this.log.warn(`Gecko Driver process cannot be stopped (${e.message}). Killing it forcefully`);
      await this.process.kill();
    }
  }
}

export default GeckoDriverServer;

/**
 * @typedef {Object} SessionOptions
 * @property {string} [reqBasePath]
 */
