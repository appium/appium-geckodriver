import _ from 'lodash';
import {fs, net, zip, tempDir} from 'appium/support';
import tar from 'tar-stream';
import zlib from 'node:zlib';
import B from 'bluebird';
import path from 'node:path';
import type {StringRecord} from '@appium/types';
import {STANDARD_CAPS} from 'appium/driver';

const GECKO_CAP_PREFIXES = ['moz:'] as const;

/**
 * Format capabilities for Gecko server
 */
export function formatCapsForServer(caps: StringRecord): StringRecord {
  const result: StringRecord = {};
  for (const [name, value] of _.toPairs(caps)) {
    if (
      GECKO_CAP_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
      STANDARD_CAPS.has(name as any)
    ) {
      result[name] = value;
    }
  }
  if (caps.browserName) {
    result.browserName = 'firefox';
  }
  if (result.platformName) {
    // Geckodriver only supports lowercase platform names
    result.platformName = _.toLower(result.platformName);
  }
  return result;
}

/**
 * Download a file from URL to local path
 */
export async function downloadToFile(srcUrl: string, dstPath: string): Promise<void> {
  await net.downloadFile(srcUrl, dstPath);
}

/**
 * Create directory recursively
 */
export async function mkdirp(p: string): Promise<void> {
  await fs.mkdirp(p);
}

/**
 * Extract a specific file from a tar.gz archive
 */
export async function extractFileFromTarGz(
  srcAcrhive: string,
  fileToExtract: string,
  dstPath: string,
): Promise<void> {
  const chunks: Buffer[] = [];
  const extract = tar.extract();
  const extractPromise = new B<void>((resolve, reject) => {
    extract.on('entry', (header, stream, next) => {
      if (header.name === fileToExtract) {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
      }
      stream.on('end', function () {
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
          new Error(
            `The file '${fileToExtract}' could not be found in the '${srcAcrhive}' archive`,
          ),
        );
      }
      resolve();
    });
  });

  fs.createReadStream(srcAcrhive).pipe(zlib.createGunzip()).pipe(extract);

  await extractPromise;
}

/**
 * Extract a specific file from a zip archive
 */
export async function extractFileFromZip(
  srcAcrhive: string,
  fileToExtract: string,
  dstPath: string,
): Promise<void> {
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
    throw new Error(
      `The file '${fileToExtract}' could not be found in the '${srcAcrhive}' archive`,
    );
  }
}
