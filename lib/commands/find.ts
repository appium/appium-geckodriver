import {util} from 'appium/support';
import type {GeckoDriver} from '../driver';

// This is needed to make lookup by image working
export async function findElOrEls(
  this: GeckoDriver,
  strategy: string,
  selector: string,
  mult: boolean,
  context?: string,
): Promise<any> {
  const endpoint = `/element${context ? `/${util.unwrapElement(context)}/element` : ''}${mult ? 's' : ''}`;
  return await this.gecko.proxy.command(endpoint, 'POST', {
    using: strategy,
    value: selector,
  });
}
