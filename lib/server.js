import log from './logger';
import { server as baseServer, routeConfiguringFunction as makeRouter } from 'appium-base-driver';
import GeckoDriver from './driver';

async function startServer (port, address) {
  let d = new GeckoDriver({port, address});
  let routeConfiguringFunction = makeRouter(d);
  let server = await baseServer({routeConfiguringFunction, port, hostname: address});
  log.info(`Gecko Driver server listening on http://${address}:${port}`);
  return server;
}

export { startServer };
