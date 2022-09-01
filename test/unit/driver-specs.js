import GeckoDriver from '../../lib/driver';
import chai from 'chai';
const should = chai.should();

describe('GeckoDriver', function () {
  it('should exist', function () {
    should.exist(GeckoDriver);
  });
});
