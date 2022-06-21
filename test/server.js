import _ from 'lodash';
import { SubProcess } from 'teen_process';

async function startServer (port, address, relaxedSecurityEnabled = false) {
  // https://github.com/appium/appium/blob/2.0/packages/schema/lib/appium-config.schema.json
  const args = ['server'];
  if (port) {
    args.push('--port', port);
  }
  if (address) {
    args.push('--address', address);
  }
  if (relaxedSecurityEnabled) {
    args.push('--relaxed-security');
  }
  const process = new SubProcess('appium', args);
  await process.start((stdout) => _.includes(stdout, 'listener started'));
  return {
    close: async () => { await process.stop(); }
  };
}

export { startServer };
