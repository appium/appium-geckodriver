export const HOST = process.env.APPIUM_TEST_SERVER_HOST || '127.0.0.1';
export const PORT = parseInt(process.env.APPIUM_TEST_SERVER_PORT || '4567', 10);
export const MOCHA_TIMEOUT = 240000;

/**
 * @returns {'mac' | 'linux' | 'windows'} The platform name for driver capabilities
 */
export function getPlatformName(): 'mac' | 'linux' | 'windows' {
  switch (process.platform) {
    case 'darwin':
      return 'mac';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

