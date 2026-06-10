import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {GeckoDriver} from '../../lib/driver.js';

describe('GeckoDriver', () => {
  it('should exist', () => {
    assert.ok(GeckoDriver);
  });
});
