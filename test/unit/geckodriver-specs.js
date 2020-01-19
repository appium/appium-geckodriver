// transpile:mocha
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Geckodriver from '../../lib/geckodriver';
import { withMocks } from 'appium-test-support';

let should = chai.should();
chai.use(chaiAsPromised);

const geckodriverExecutable = '/path/to/geckodriver';
const driver = new Geckodriver({
  geckodriverExecutable,
});

describe('geckodriver', function () {
  describe('unit tests', withMocks({driver}, function (mocks) {
    it('should exists and set properties', function () {
      should.exist(driver);
      driver.geckodriverExecutable.should.equal('/path/to/geckodriver');
      driver.noReset.should.equal(false);
    });
    it('should start a session', async function () {
      let caps = {
        alwaysMatch: {
          mozFirefoxOptions: {
            androidPackage: 'com.android.firefox.some.package'
          }
        }
      };
      mocks.driver
        .expects('getVersion')
        .once()
        .withExactArgs(geckodriverExecutable)
        .returns('0.26.0');

      mocks.driver
      .expects('startGeckodriverSubprocess')
      .once()
      .withExactArgs('/path/to/geckodriver', ['--host=127.0.0.1', '--port=29146', '-vv'])
      .returns();

      mocks.driver
        .expects('startSession')
        .once()
        .withExactArgs();

      await driver.start(caps);
      driver.state.should.equal(Geckodriver.STATE_ONLINE);
      mocks.driver.verify();
    });
  }));
});