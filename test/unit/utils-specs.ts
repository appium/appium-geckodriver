import { formatCapsForServer } from '../../lib/utils';
import { expect } from 'chai';

describe('formatCapsForServer', function () {
  it('should format empty caps', function () {
    const result = formatCapsForServer({});
    expect(result).to.eql({});
  });

  it('should assign default caps', function () {
    const result = formatCapsForServer({
      browserName: 'yolo',
      browserVersion: '52',
      platformName: 'Mac',
    });
    expect(result).to.eql({
      browserName: 'firefox',
      browserVersion: '52',
      platformName: 'mac',
    });
  });

  it('should only pass caps with supported prefixes', function () {
    const result = formatCapsForServer({
      browserVersion: '52',
      bar: '67',
      'moz:foo': '1234',
      'webkit:yolo': '567',
      'appium:bar': '789',
    });
    expect(result).to.eql({
      browserVersion: '52',
      'moz:foo': '1234',
    });
  });
});

