import {system, fs, doctor} from '@appium/support';
import {getAndroidBinaryPath, getSdkRootFromEnv} from 'appium-adb';

const ENVIRONMENT_VARS_TUTORIAL_URL =
  'https://github.com/appium/java-client/blob/master/docs/environment.md';
const ANDROID_SDK_LINK1 = 'https://developer.android.com/studio#cmdline-tools';
const ANDROID_SDK_LINK2 = 'https://developer.android.com/studio/intro/update#sdk-manager';

/**
 * @typedef EnvVarCheckOptions
 * @property {boolean} [expectDir] If set to true then
 * the path is expected to be a valid folder
 * @property {boolean} [expectFile] If set to true then
 * the path is expected to be a valid file
 */

/** @satisfies {import('@appium/types').IDoctorCheck} */
class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   * @param {EnvVarCheckOptions} [opts={}]
   */
  constructor(varName, opts = {}) {
    this.varName = varName;
    this.opts = opts;
  }

  async diagnose() {
    const varValue = process.env[this.varName];
    if (!varValue) {
      return doctor.nokOptional(`${this.varName} environment variable is NOT set!`);
    }

    if (!(await fs.exists(varValue))) {
      let errMsg = `${this.varName} is set to '${varValue}' but this path does not exist!`;
      if (system.isWindows() && varValue.includes('%')) {
        errMsg += ` Consider replacing all references to other environment variables with absolute paths.`;
      }
      return doctor.nokOptional(errMsg);
    }

    const stat = await fs.stat(varValue);
    if (this.opts.expectDir && !stat.isDirectory()) {
      return doctor.nokOptional(
        `${this.varName} is expected to be a valid folder, got a file path instead`,
      );
    }
    if (this.opts.expectFile && stat.isDirectory()) {
      return doctor.nokOptional(
        `${this.varName} is expected to be a valid file, got a folder path instead`,
      );
    }

    return doctor.okOptional(`${this.varName} is set to: ${varValue}`);
  }

  async fix() {
    return (
      `Make sure the environment variable ${this.varName} is properly configured for the Appium process. ` +
      `Android SDK is required if you want to run your tests on an Android device. ` +
      `Refer ${ENVIRONMENT_VARS_TUTORIAL_URL} for more details.`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return true;
  }
}
export const androidHomeCheck = new EnvVarAndPathCheck('ANDROID_HOME', {expectDir: true});

/** @satisfies {import('@appium/types').IDoctorCheck} */
export class AndroidSdkCheck {
  /** @type {import('@appium/types').AppiumLogger} */
  log;

  TOOL_NAMES = ['adb', 'emulator'];

  async diagnose() {
    const listOfTools = this.TOOL_NAMES.join(', ');
    const sdkRoot = getSdkRootFromEnv();
    if (!sdkRoot) {
      return doctor.nokOptional(`${listOfTools} could not be found because ANDROID_HOME is NOT set!`);
    }

    this.log.info(`   Checking ${listOfTools}`);
    const missingBinaries = [];
    for (const binary of this.TOOL_NAMES) {
      try {
        this.log.info(`     '${binary}' exists in ${await getAndroidBinaryPath(binary)}`);
      } catch {
        missingBinaries.push(binary);
      }
    }

    if (missingBinaries.length > 0) {
      return doctor.nokOptional(`${missingBinaries.join(', ')} could NOT be found in '${sdkRoot}'!`);
    }

    return doctor.okOptional(`${listOfTools} exist in '${sdkRoot}'`);
  }

  async fix() {
    return (
      `Manually install Android SDK and set ANDROID_HOME enviornment variable. ` +
      `Android SDK is required if you want to run your tests on an Android device. ` +
      `Read ${[ANDROID_SDK_LINK1, ANDROID_SDK_LINK2].join(' and ')}.`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return true;
  }
}
export const androidSdkCheck = new AndroidSdkCheck();
