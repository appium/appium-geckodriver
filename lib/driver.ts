import _ from 'lodash';
import type {
  RouteMatcher,
  DefaultCreateSessionResult,
  InitialOpts,
  StringRecord,
  ExternalDriver,
  W3CDriverCaps,
} from '@appium/types';
import {BaseDriver} from 'appium/driver';
import {GECKO_SERVER_HOST, GeckoDriverServer} from './gecko';
import {desiredCapConstraints} from './desired-caps';
import * as findCommands from './commands/find';
import {formatCapsForServer} from './utils';

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
  private isProxyActive: boolean = false;
  private _gecko: GeckoDriverServer | null = null;
  private _bidiProxyUrl: string | null = null;
  public proxyReqRes: (...args: any) => any;

  constructor(opts: InitialOpts = {} as InitialOpts) {
    super(opts);
    this.desiredCapConstraints = _.cloneDeep(desiredCapConstraints);
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

  get gecko(): GeckoDriverServer {
    if (!this._gecko) {
      throw new Error('Gecko driver is not initialized');
    }
    return this._gecko;
  }

  override async createSession(
    w3cCaps1: W3CDriverCaps<GeckoConstraints>,
    w3cCaps2?: W3CDriverCaps<GeckoConstraints>,
    ...args: any[]
  ): Promise<DefaultCreateSessionResult<GeckoConstraints>> {
    const [sessionId, processedCaps] = await super.createSession(w3cCaps1, w3cCaps2, ...args);
    this._gecko = new GeckoDriverServer(this.log, processedCaps);
    let response: StringRecord | null = null;
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

  override get bidiProxyUrl(): string | null {
    return this._bidiProxyUrl;
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
    if (_.isEmpty(webSocketUrl) || !_.isString(webSocketUrl)) {
      return null;
    }
    try {
      const asUrl = new URL(webSocketUrl);
      return asUrl.hostname !== GECKO_SERVER_HOST
        ? webSocketUrl.replace(asUrl.host, GECKO_SERVER_HOST)
        : webSocketUrl;
    } catch (e) {
      this.log.warn(`Failed to parse WebSocket URL from '${webSocketUrl}': ${e.message}`);
      return null;
    }
  }

  findElOrEls = findCommands.findElOrEls;
}

export default GeckoDriver;
