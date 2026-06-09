import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {formatCapsForServer} from '../../lib/utils.js';

describe('formatCapsForServer', () => {
  it('should format empty caps', () => {
    const result = formatCapsForServer({});
    assert.deepEqual(result, {});
  });

  it('should assign default caps', () => {
    const result = formatCapsForServer({
      browserName: 'yolo',
      browserVersion: '52',
      platformName: 'Mac',
    });
    assert.deepEqual(result, {
      browserName: 'firefox',
      browserVersion: '52',
      platformName: 'mac',
    });
  });

  it('should only pass caps with supported prefixes', () => {
    const result = formatCapsForServer({
      browserVersion: '52',
      bar: '67',
      'moz:foo': '1234',
      'webkit:yolo': '567',
      'appium:bar': '789',
    });
    assert.deepEqual(result, {
      browserVersion: '52',
      'moz:foo': '1234',
    });
  });
});
