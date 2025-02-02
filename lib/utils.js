import _ from 'lodash';
import { fs, net, zip, tempDir } from 'appium/support';
import tar from 'tar-stream';
import zlib from 'node:zlib';
import B from 'bluebird';
import path from 'node:path';

const GECKO_CAP_PREFIXES = ['moz:'];
// https://www.w3.org/TR/webdriver/#capabilities
const STANDARD_CAPS = [
  'browserVersion',
  'platformName',
  'acceptInsecureCerts',
  'pageLoadStrategy',
  'proxy',
  'setWindowRect',
  'timeouts',
  'unhandledPromptBehavior',
  'webSocketUrl',
];

/**
 *
 * @param {import('@appium/types').StringRecord} caps
 * @returns {import('@appium/types').StringRecord}
 */
export function formatCapsForServer (caps) {
  const result = {};
  if (caps.browserName) {
    result.browserName = 'firefox';
  }
  for (const [name, value] of _.toPairs(caps)) {
    if (GECKO_CAP_PREFIXES.some((prefix) => name.startsWith(prefix)) || STANDARD_CAPS.includes(name)) {
      result[name] = value;
    }
  }
  if (result.platformName) {
    // Geckodriver only supports lowercase platform names
    result.platformName = _.toLower(result.platformName);
  }
  return result;
}

/**
 *
 * @param {string} srcUrl
 * @param {string} dstPath
 * @returns {Promise<void>}
 */
export async function downloadToFile(srcUrl, dstPath) {
  await net.downloadFile(srcUrl, dstPath);
}

/**
 *
 * @param {string} p
 * @returns {Promise<void>}
 */
export async function mkdirp(p) {
  await fs.mkdirp(p);
}

/**
 *
 * @param {string} srcAcrhive
 * @param {string} fileToExtract
 * @param {string} dstPath
 * @returns {Promise<void>}
 */
export async function extractFileFromTarGz(srcAcrhive, fileToExtract, dstPath) {
  const chunks = [];
  const extract = tar.extract();
  const extractPromise = new B((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      if (header.name === fileToExtract) {
        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });
      }
      stream.on('end', function() {
        next();
      });
      stream.resume();
    });
    extract.once('error', reject);
    extract.once('finish', async () => {
      if (chunks.length) {
        try {
          await fs.writeFile(dstPath, Buffer.concat(chunks));
        } catch (e) {
          return reject(e);
        }
      } else {
        return reject(
          new Error(`The file '${fileToExtract}' could not be found in the '${srcAcrhive}' archive`)
        );
      }
      resolve();
    });
  });

  fs.createReadStream(srcAcrhive)
    .pipe(zlib.createGunzip())
    .pipe(extract);

  await extractPromise;
}

/**
 *
 * @param {string} srcAcrhive
 * @param {string} fileToExtract
 * @param {string} dstPath
 * @returns {Promise<void>}
 */
export async function extractFileFromZip(srcAcrhive, fileToExtract, dstPath) {
  let didFindEntry = false;
  await zip.readEntries(srcAcrhive, async ({entry, extractEntryTo}) => {
    if (didFindEntry || entry.fileName !== fileToExtract) {
      return;
    }
    didFindEntry = true;

    const tmpRoot = await tempDir.openDir();
    try {
      await extractEntryTo(tmpRoot);
      await fs.mv(path.resolve(tmpRoot, entry.fileName), dstPath);
    } finally {
      await fs.rimraf(tmpRoot);
    }
  });
  if (!didFindEntry) {
    throw new Error(`The file '${fileToExtract}' could not be found in the '${srcAcrhive}' archive`);
  }
}
