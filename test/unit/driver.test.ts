import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {GeckoDriver} from '../../lib/driver.js';

describe('GeckoDriver', () => {
  it('should exist', () => {
    assert.ok(GeckoDriver);
  });
});
