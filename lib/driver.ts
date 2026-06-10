import type {
  RouteMatcher,
  DefaultCreateSessionResult,
  InitialOpts,
  StringRecord,
  ExternalDriver,
  W3CDriverCaps,
} from '@appium/types';
import {BaseDriver, errors} from 'appium/driver.js';
import {GECKO_SERVER_HOST, GeckoDriverServer} from './gecko.js';
import {desiredCapConstraints} from './desired-caps.js';
import {newMethodMap} from './method-map.js';
import {INSECURE_FEAT_CUSTOM_GECKODRIVER_EXECUTABLE} from './constants.js';
import * as findCommands from './commands/find.js';
import {formatCapsForServer} from './utils.js';

const NO_PROXY: RouteMatcher[] = [
  ['GET', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/appium')],
  ['POST', new RegExp('^/session/[^/]+/element/[^/]+/elements?$')],
  ['POST', new RegExp('^/session/[^/]+/elements?$')],
];

export type GeckoConstraints = typeof desiredCapConstraints;

export class GeckoDriver
  extends BaseDriver<GeckoConstraints, StringRecord>
  implements ExternalDriver<GeckoConstraints, string, StringRecord>
{
  static newMethodMap = newMethodMap;

  public proxyReqRes: (...args: any) => any = null as any;

  findElOrEls = findCommands.findElOrEls;

  private isProxyActive: boolean = false;
  private _gecko: GeckoDriverServer | null = null;
  private _bidiProxyUrl: string | null = null;

  constructor(opts: InitialOpts = {} as InitialOpts) {
    super(opts);
    this.desiredCapConstraints = structuredClone(desiredCapConstraints);
    this.locatorStrategies = [
      'xpath',
      'tag name',
      'link text',
      'partial link text',
      'css selector',
      // Let these two reach Gecko Driver and fail there with a proper error message
      'id',
      'name',
    ];
    this.resetState();
  }

  get gecko(): GeckoDriverServer {
    if (!this._gecko) {
      throw new Error('Gecko driver is not initialized');
    }
    return this._gecko;
  }

  override get bidiProxyUrl(): string | null {
    return this._bidiProxyUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override proxyActive(sessionId?: string): boolean {
    return this.isProxyActive;
  }

  override getProxyAvoidList(): RouteMatcher[] {
    return NO_PROXY;
  }

  override canProxy(): boolean {
    return true;
  }

  override validateDesiredCaps(caps: any): caps is any {
    const isValid = super.validateDesiredCaps(caps);
    if (!isValid) {
      return false;
    }

    if (
      caps.geckodriverExecutable &&
      !this.isFeatureEnabled(INSECURE_FEAT_CUSTOM_GECKODRIVER_EXECUTABLE)
    ) {
      throw new errors.SessionNotCreatedError(
        `The 'geckodriverExecutable' capability requires the ` +
          `'${INSECURE_FEAT_CUSTOM_GECKODRIVER_EXECUTABLE}' insecure feature to be enabled ` +
          `on the Appium server.`,
      );
    }
    return true;
  }

  override async createSession(
    w3cCaps1: W3CDriverCaps<GeckoConstraints>,
    w3cCaps2?: W3CDriverCaps<GeckoConstraints>,
    ...args: any[]
  ): Promise<DefaultCreateSessionResult<GeckoConstraints>> {
    const [sessionId, processedCaps] = await super.createSession(w3cCaps1, w3cCaps2, ...args);
    this._gecko = new GeckoDriverServer(this.log, processedCaps);
    let response: StringRecord;
    try {
      response = await this._gecko.start(formatCapsForServer(processedCaps), {
        reqBasePath: this.basePath,
      });
    } catch (e) {
      await this.deleteSession();
      throw e;
    }
    this.proxyReqRes = this._gecko.proxy.proxyReqRes.bind(this._gecko.proxy);
    this._bidiProxyUrl = this._extractWebSocketUrl(response);
    if (this._bidiProxyUrl) {
      this.log.info(`Set proxy BiDi URL to ${this._bidiProxyUrl}`);
    }
    this.isProxyActive = true;
    return [sessionId, processedCaps];
  }

  override async deleteSession(): Promise<void> {
    this.log.info('Ending Gecko Driver session');
    await this._gecko?.stop();
    this.resetState();

    await super.deleteSession();
  }

  private resetState(): void {
    this._gecko = null;
    this.proxyReqRes = null as any;
    this.isProxyActive = false;
    this._bidiProxyUrl = null;
  }

  private _extractWebSocketUrl(response: StringRecord): string | null {
    const webSocketUrl = (response?.capabilities as any)?.webSocketUrl;
    if (typeof webSocketUrl !== 'string' || webSocketUrl.length === 0) {
      return null;
    }
    try {
      const asUrl = new URL(webSocketUrl);
      return asUrl.hostname !== GECKO_SERVER_HOST
        ? webSocketUrl.replace(asUrl.host, GECKO_SERVER_HOST)
        : webSocketUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Failed to parse WebSocket URL from '${webSocketUrl}': ${msg}`);
      return null;
    }
  }
}

export default GeckoDriver;
