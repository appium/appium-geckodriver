import {resolveExecutablePath} from './utils';
import {system, doctor} from '@appium/support';

const GD_DOWNLOAD_LINK = 'https://github.com/mozilla/geckodriver/releases';
const GD_BINARY = `geckodriver${system.isWindows() ? '.exe' : ''}`;

/** @satisfies {import('@appium/types').IDoctorCheck} */
export class GeckodriverCheck {
  async diagnose() {
    const gdPath = await resolveExecutablePath(GD_BINARY);
    return gdPath
      ? doctor.ok(`${GD_BINARY} is installed at: ${gdPath}`)
      : doctor.nok(`${GD_BINARY} cannot be found`);
  }

  async fix() {
    return (
      `${GD_BINARY} is required to pass W3C commands to the remote browser. ` +
      `Please download the binary from ${GD_DOWNLOAD_LINK} and store it ` +
      `to any folder listed in the PATH environment variable. Folders that ` +
      `are currently present in PATH: ${process.env.PATH}`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return false;
  }
}
export const geckodriverCheck = new GeckodriverCheck();
