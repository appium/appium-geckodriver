import GeckoDriver from '../../lib/driver';

describe('GeckoDriver', function () {
  let chai;
  let should;

  before(async function () {
    chai = await import('chai');
    should = chai.should();
  });

  it('should exist', function () {
    should.exist(GeckoDriver);
  });
});
