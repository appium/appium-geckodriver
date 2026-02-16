import {fs} from '@appium/support';

/**
 * Return an executable path of cmd. Returns `null` if the cmd is not found.
 */
export async function resolveExecutablePath(cmd: string): Promise<string | null> {
  try {
    const executablePath = await fs.which(cmd);
    if (executablePath && (await fs.exists(executablePath))) {
      return executablePath;
    }
  } catch {}
  return null;
}
