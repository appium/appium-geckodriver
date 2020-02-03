// transpile:main
import { logger, util } from 'appium-support';
import { SubProcess } from 'teen_process';
import { quote } from 'shell-quote';
import { getGeckodriverForOs } from './utils';

const MIN_GECKO_SUPPORTED_VERSION = '0.26.0';

const log = logger.getLogger('GeckoDriverProc');

class GeckodriverProc {
  constructor (host, port, verbose = true, geckodriverExecutable = undefined) {
    this.host = host;
    this.port = port;
    this.geckodriverExecutable = geckodriverExecutable;
    this.verbose = verbose;
    this.proc = null;
  }

  async getVersion (geckodriverExecutable) {
    const proc = new SubProcess(geckodriverExecutable, ['--version']);
    let version;
    await proc.start((stdout) => {
      log.debug('Checking geckodriver version from stdout:', stdout);
      version = this.parseVersion(stdout);
      return true;
    });
    return version;
  }

  async validateMinVersion (geckodriverExecutable) {
    let version = await this.getVersion(geckodriverExecutable);
    log.debug(`Geckodriver version ${version}`);
    if (util.compareVersions(version, '<', MIN_GECKO_SUPPORTED_VERSION)) {
      log.errorAndThrow(`Only geckodriver ${MIN_GECKO_SUPPORTED_VERSION} supports Android testing. Current version: ${version}`);
    }
  }

  async stop () {
    try {
      await this.proc.stop();
    } catch (e) {
      log.errorAndThrow('Failed to stop geckodriver process', e);
    }
  }

  async start () {
    const geckodriverExecutable = this.geckodriverExecutable || await getGeckodriverForOs();
    await this.validateMinVersion(geckodriverExecutable);

    const startDetector = (stdout) => {
      return stdout.includes('Listening');
    };

    try {
      const args = [`--host=${this.host}`, `--port=${this.port}`];
      if (this.verbose === true) {
        args.push('-vvv');
      }

      this.proc = new SubProcess(geckodriverExecutable, args);

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
      });

      log.info(`Spawning geckodriver with: ${quote([geckodriverExecutable, ...args])}`);
      await this.proc.start(startDetector);

    } catch (e) {
      if (this.proc.isRunning) {
        await this.stop();
      }
    }
  }

  parseVersion (stdout) {
    return stdout
      .match(/geckodriver\s+\d+\.\d+\.\d+/)[0]
      .replace(/^geckodriver\s*/, '');
  }
}

export default GeckodriverProc;