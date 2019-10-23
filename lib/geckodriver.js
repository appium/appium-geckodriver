// transpile:main
import events from 'events';
import _ from 'lodash';
import { logger } from 'appium-support';
import { JWProxy } from 'appium-base-driver';
import { SubProcess } from 'teen_process';
import { sleep } from 'asyncbox';

const log = logger.getLogger('Geckodriver');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 29146;

const FIREFOX_BUNDLE_ID = 'org.mozilla.firefox';

class Geckodriver extends events.EventEmitter {
  constructor (args = {}) {
    super();

    const {
      host = DEFAULT_HOST,
      port = DEFAULT_PORT
    } = args;

    this.proxyHost = host;
    this.proxyPort = port;
    this.jwproxy = new JWProxy({server: this.proxyHost, port: this.proxyPort, base: ''});
    this.state = Geckodriver.STATE_STOPPED;
    this.capabilities = {};
  }

  async start (caps, emitStartingState = true) {
    this.capabilities = _.cloneDeep(caps);

    const args = [`--host=${this.proxyHost}`, `--port=${this.proxyPort}`, '-vv'];

    const startDetector = (stdout) => {
      return stdout.indexOf('Listening') !== -1;
    };

    if (emitStartingState) {
      this.changeState(Geckodriver.STATE_STARTING);
    }

    let processIsAlive = false;
    try {
      this.geckodriver = '/usr/local/bin/geckodriver';
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
      await this.startSession();
    } catch (e) {
      this.emit(Geckodriver.EVENT_ERROR, e);
      if (processIsAlive) {
        await this.proc.stop();
      }
    }
  }

  sessionId () {
    if (this.state !== Geckodriver.STATE_ONLINE) {
      return null;
    }
    return this.jwproxy.sessionId;
  }

  async getStatus () {
    return await this.jwproxy.command('/status', 'GET');
  }

  async startSession () {
    const sessionCaps = this.capabilities;
    log.info(`Starting W3C Geckodriver session with capabilities: ` +
      JSON.stringify(sessionCaps, null, 2));
    await this.jwproxy.command('/session', 'POST', sessionCaps);
  }

  changeState (state) {
    this.state = state;
    log.debug(`Changed state to '${state}'`);
    this.emit(Geckodriver.EVENT_CHANGED, {state});
  }
}

Geckodriver.EVENT_ERROR = 'geckodriver_error';
Geckodriver.EVENT_CHANGED = 'stateChanged';
Geckodriver.STATE_STOPPED = 'stopped';
Geckodriver.STATE_STARTING = 'starting';
Geckodriver.STATE_ONLINE = 'online';
Geckodriver.STATE_STOPPING = 'stopping';
Geckodriver.STATE_RESTARTING = 'restarting';

export {
  FIREFOX_BUNDLE_ID
};
export default Geckodriver;