// transpile:mocha
import chai from 'chai';
import Geckodriver from '../../lib/geckodriver';

let should = chai.should();

describe('Geckodriver simple test', function () {
  let driver;
  before(function () {
    driver = new Geckodriver();
  });

  it('should exists', function () {
    should.exist(driver);
  });
});