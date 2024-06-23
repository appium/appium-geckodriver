import { formatCapsForServer } from '../../lib/utils';


describe('formatCapsForServer', function () {
  let chai;

  before(async function () {
    chai = await import('chai');
    chai.should();
  });

  it('should format empty caps', function () {
    const result = formatCapsForServer({});
    result.should.eql({});
  });

  it('should assign default caps', function () {
    const result = formatCapsForServer({
      browserName: 'yolo',
      browserVersion: '52',
      platformName: 'Mac',
    });
    result.should.eql({
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
    result.should.eql({
      browserVersion: '52',
      'moz:foo': '1234',
    });
  });
});
