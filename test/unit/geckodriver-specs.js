// transpile:mocha
import chai from 'chai';
import Geckodriver from '../../lib/geckodriver';

let should = chai.should();

describe('Geckodriver simple test', function () {
  let driver;
  before(function () {
    driver = new Geckodriver({
      geckodriverExecutable: '/path/to/geckodriver',
    });
  });

  it('should exists and set properties', function () {
    should.exist(driver);
    driver.geckodriverExecutable.should.equal('/path/to/geckodriver');
    driver.noReset.should.equal(false);
  });

});