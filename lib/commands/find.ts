import {util} from 'appium/support.js';
import type {GeckoDriver} from '../driver.js';

/**
 * Find element(s) by given strategy and selector. If context is provided, search will be performed within the context element.
 * This is needed to make lookup by image working.
 * @this GeckoDriver
 * @param strategy - The strategy to use for finding the element(s) (e.g., 'css selector', 'xpath', etc.)
 * @param selector - The selector to use for finding the element(s)
 * @param mult - Whether to find multiple elements (true) or a single element (false)
 * @param context - Optional context element ID to search within
 * @returns A promise that resolves to the found element(s)
 */
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
