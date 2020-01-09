import { system, fs } from 'appium-support';

const getGeckodriverForOs = async function () {
  const binaryName = `geckodriver${system.isWindows() ? '.exe' : ''}`;
  try {
    return await fs.which(binaryName);
  } catch (err) {
    throw new Error('Geckodriver must be installed on the system and available on the path');
  }
};

export {
  getGeckodriverForOs
};