import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {GeckoDriver} from '../../lib/driver.js';

describe('GeckoDriver', () => {
  it('should exist', () => {
    assert.ok(GeckoDriver);
  });

  it('should preserve port when normalizing BiDi webSocketUrl hostname to 127.0.0.1', () => {
    const driver = new GeckoDriver();
    const extract = (driver as any)._extractWebSocketUrl.bind(driver);

    assert.equal(
      extract({capabilities: {webSocketUrl: 'ws://localhost:9222/session/abc'}}),
      'ws://127.0.0.1:9222/session/abc',
    );
    assert.equal(
      extract({capabilities: {webSocketUrl: 'ws://[::1]:9222/session/abc'}}),
      'ws://127.0.0.1:9222/session/abc',
    );
    assert.equal(
      extract({capabilities: {webSocketUrl: 'ws://127.0.0.1:9222/session/abc'}}),
      'ws://127.0.0.1:9222/session/abc',
    );
    assert.equal(extract({capabilities: {}}), null);
  });
});
