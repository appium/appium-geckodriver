import _ from 'lodash';
import os from 'os';
import path from 'path';
import { JWProxy, errors } from 'appium/driver';
import { fs, util, system } from 'appium/support';
import { SubProcess } from 'teen_process';
import { waitForCondition } from 'asyncbox';
import { findAPortNotInUse } from 'portscanner';
import { execSync } from 'child_process';
import type { AppiumLogger, StringRecord, HTTPMethod, HTTPBody } from '@appium/types';
import { VERBOSITY } from './constants';

const GD_BINARY = `geckodriver${system.isWindows() ? '.exe' : ''}`;
const STARTUP_TIMEOUT_MS = 10000; // 10 seconds
const GECKO_PORT_RANGE: [number, number] = [5200, 5300];
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
} as const);
export const GECKO_SERVER_HOST = '127.0.0.1';

export interface SessionOptions {
  reqBasePath?: string;
}

export class GeckoProxy extends JWProxy {
  didProcessExit?: boolean;

  override async proxyCommand (url: string, method: HTTPMethod, body: HTTPBody = null) {
    if (this.didProcessExit) {
      throw new errors.InvalidContextError(
        `'${method} ${url}' cannot be proxied to Gecko Driver server because ` +
        'its process is not running (probably crashed). Check the Appium log for more details');
    }
    return await super.proxyCommand(url, method, body);
  }
}

class GeckoDriverProcess {
  private readonly noReset?: boolean;
  private readonly verbosity?: string;
  private readonly androidStorage?: string;
  private readonly marionettePort?: number;
  private _port?: number;
  private readonly log: AppiumLogger;
  private _proc: SubProcess | null = null;

  constructor (log: AppiumLogger, opts: StringRecord = {}) {
    for (const [optName, propName] of _.toPairs(PROCESS_SPECIFIC_OPTION_NAMES_MAP)) {
      (this as any)[propName] = opts[optName];
    }
    this.log = log;
    this._proc = null;
  }

  get isRunning (): boolean {
    return !!(this._proc?.isRunning);
  }

  get port (): number | undefined {
    return this._port;
  }

  get proc (): SubProcess | null {
    return this._proc;
  }

  async init (): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (!this._port) {
      await GECKO_SERVER_GUARD(async () => {
        const [startPort, endPort] = GECKO_PORT_RANGE;
        try {
          this._port = await findAPortNotInUse(startPort, endPort);
        } catch {
          throw new Error(
            `Cannot find any free port in range ${startPort}..${endPort}. ` +
            `Double check the processes that are locking ports within this range and terminate ` +
            `these which are not needed anymore or set any free port number to the 'systemPort' capability`);
        }
      });
    }

    let driverBin: string;
    try {
      driverBin = await fs.which(GD_BINARY);
    } catch {
      throw new Error(`${GD_BINARY} binary cannot be found in PATH. ` +
        `Please make sure it is present on your system`);
    }
    const args: string[] = [];
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

    args.push('-p', `${this._port}`);
    if (this.androidStorage) {
      args.push('--android-storage', this.androidStorage);
    }
    this._proc = new SubProcess(driverBin, args);
    this._proc.on('output', (stdout, stderr) => {
      const line = _.trim(stdout || stderr);
      if (line) {
        this.log.debug(`[${GD_BINARY}] ${line}`);
      }
    });
    this._proc.on('exit', (code, signal) => {
      this.log.info(`${GD_BINARY} has exited with code ${code}, signal ${signal}`);
    });
    this.log.info(`Starting '${driverBin}' with args ${JSON.stringify(args)}`);
    await this._proc.start(0);
  }

  async stop (): Promise<void> {
    if (this.isRunning) {
      await this._proc?.stop('SIGTERM');
    }
  }

  async kill (): Promise<void> {
    if (this.isRunning) {
      try {
        await this._proc?.stop('SIGKILL');
      } catch {}
    }
  }
}

const RUNNING_PROCESS_IDS: (number | undefined)[] = [];
process.once('exit', () => {
  if (_.isEmpty(RUNNING_PROCESS_IDS)) {
    return;
  }

  const command = system.isWindows()
    ? ('taskkill.exe ' + RUNNING_PROCESS_IDS.filter((pid): pid is number => pid !== undefined).map((pid) => `/PID ${pid}`).join(' '))
    : `kill ${RUNNING_PROCESS_IDS.filter((pid): pid is number => pid !== undefined).join(' ')}`;
  try {
    execSync(command);
  } catch {}
});

export class GeckoDriverServer {
  private _proxy: GeckoProxy | null = null;
  private readonly _process: GeckoDriverProcess;
  private readonly log: AppiumLogger;

  constructor (log: AppiumLogger, caps: StringRecord) {
    this._process = new GeckoDriverProcess(log, caps);
    this.log = log;
    this._proxy = null;
  }

  get proxy (): GeckoProxy {
    if (!this._proxy) {
      throw new Error('Gecko proxy is not initialized');
    }
    return this._proxy;
  }

  get isRunning (): boolean {
    return !!(this._process?.isRunning);
  }

  async start (geckoCaps: StringRecord, opts: SessionOptions = {}): Promise<StringRecord> {
    await this._process.init();

    const proxyOpts: any = {
      server: GECKO_SERVER_HOST,
      port: this._process.port,
      log: this.log,
      base: '',
      keepAlive: true,
    };
    if (opts.reqBasePath) {
      proxyOpts.reqBasePath = opts.reqBasePath;
    }
    this._proxy = new GeckoProxy(proxyOpts);
    this._proxy.didProcessExit = false;
    this._process?.proc?.on('exit', () => {
      if (this._proxy) {
        this._proxy.didProcessExit = true;
      }
    });

    try {
      await waitForCondition(async () => {
        try {
          await this._proxy?.command('/status', 'GET');
          return true;
        } catch (err: any) {
          if (this._proxy?.didProcessExit) {
            throw new Error(err.message);
          }
          return false;
        }
      }, {
        waitMs: STARTUP_TIMEOUT_MS,
        intervalMs: 1000,
      });
    } catch (e: any) {
      if (this._process.isRunning) {
        // avoid "frozen" processes,
        await this._process.kill();
      }
      if (/Condition unmet/.test(e.message)) {
        throw new Error(`Gecko Driver server is not listening within ${STARTUP_TIMEOUT_MS}ms timeout. ` +
          `Make sure it could be started manually from a terminal`);
      }
      throw e;
    }
    const pid = this._process.proc?.pid;
    if (pid !== undefined) {
      RUNNING_PROCESS_IDS.push(pid);
      this._process.proc?.on('exit', () => void _.pull(RUNNING_PROCESS_IDS, pid));
    }

    return await this._proxy.command('/session', 'POST', {
      capabilities: {
        firstMatch: [{}],
        alwaysMatch: geckoCaps,
      }
    }) as StringRecord;
  }

  async stop (): Promise<void> {
    if (!this.isRunning) {
      this.log.info(`Gecko Driver session cannot be stopped, because the server is not running`);
      return;
    }

    if (this._proxy?.sessionId) {
      try {
        await this._proxy.command(`/session/${this._proxy.sessionId}`, 'DELETE');
      } catch (e: any) {
        this.log.info(`Gecko Driver session cannot be deleted. Original error: ${e.message}`);
      }
    }

    try {
      await this._process.stop();
    } catch (e: any) {
      this.log.warn(`Gecko Driver process cannot be stopped (${e.message}). Killing it forcefully`);
      await this._process.kill();
    }
  }
}

export default GeckoDriverServer;

