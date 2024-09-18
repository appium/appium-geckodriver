import axios from 'axios';
import semver from 'semver';
import _ from 'lodash';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { log } from '../build/lib/logger.js';
import {
  downloadToFile,
  mkdirp,
  extractFileFromTarGz,
  extractFileFromZip,
} from '../build/lib/utils.js';
import fs from 'node:fs/promises';
import { exec } from 'teen_process';

const OWNER = 'mozilla';
const REPO = 'geckodriver';
const API_ROOT = `https://api.github.com/repos/${OWNER}/${REPO}`;
const API_VERSION_HEADER = {'X-GitHub-Api-Version': '2022-11-28'};
const API_TIMEOUT_MS = 45 * 1000;
const STABLE_VERSION = 'stable';
const EXT_TAR_GZ = '.tar.gz';
const EXT_ZIP = '.zip';
const EXT_REGEXP = new RegExp(`(${_.escapeRegExp(EXT_TAR_GZ)}|${_.escapeRegExp(EXT_ZIP)})$`);
const ARCHIVE_NAME_PREFIX = 'geckodriver-v';
const ARCH_MAPPING = Object.freeze({
  ia32: '32',
  x64: '64',
  arm64: 'aarch64',
});
const PLATFORM_MAPPING = Object.freeze({
  win32: 'win',
  darwin: 'macos',
  linux: 'linux',
});

/**
 *
 * @param {string} dstPath
 * @returns {Promise<void>}
 */
async function clearNotarization(dstPath) {
  if (process.platform === 'darwin') {
    await exec('xattr', ['-cr', dstPath]);
  }
}

/**
 *
 * @param {import('axios').AxiosResponseHeaders} headers
 * @returns {string|null}
 */
function parseNextPageUrl(headers) {
  if (!headers.link) {
    return null;
  }

  for (const part of headers.link.split(';')) {
    const [rel, pageUrl] = part.split(',').map(_.trim);
    if (rel === 'rel="next"' && pageUrl) {
      return pageUrl.replace(/^<|>$/g, '');
    }
  }
  return null;
}

/**
 * @returns {Promise<[string, boolean]>}
 */
async function prepareDestinationFolder() {
  let dstRoot;
  switch (process.platform) {
    case 'win32':
      dstRoot = path.join(process.env.LOCALAPPDATA, 'Mozilla');
      break;
    case 'linux':
    case 'darwin':
      dstRoot = path.join('/usr', 'local', 'bin');
      break;
    default:
      throw new Error(
        `GeckoDriver does not support the ${process.platform} platform. ` +
        `Only Linux, Windows and macOS are supported.`
      );
    }
    await mkdirp(dstRoot);
    const pathParts = process.env.PATH ? process.env.PATH.split(path.delimiter) : [];
    const isInPath = pathParts
      .map((pp) => path.normalize(pp))
      .some((pp) => pp === path.normalize(dstRoot));
    return [dstRoot, isInPath];
}

/**
 * https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
 *
 * @returns {Promise<ReleaseInfo[]}
 */
async function listReleases() {
  /** @type {Record<string, any>[]} */
  const allReleases = [];
  let currentUrl = `${API_ROOT}/releases`;
  do {
    const {data, headers} = await axios.get(currentUrl, {
      timeout: API_TIMEOUT_MS,
      headers: { ...API_VERSION_HEADER }
    });
    allReleases.push(...data);
    currentUrl = parseNextPageUrl(headers);
  } while (currentUrl);
  /** @type {ReleaseInfo[]} */
  const result = [];
  for (const releaseInfo of allReleases) {
    const isDraft = !!releaseInfo.draft;
    const isPrerelease = !!releaseInfo.prerelease;
    const version = semver.coerce(releaseInfo.tag_name?.replace(/^v/, ''));
    if (!version) {
      continue;
    }
    /** @type {ReleaseAsset[]} */
    const releaseAssets = [];
    for (const asset of (releaseInfo.assets ?? [])) {
      const assetName = asset?.name;
      const downloadUrl = asset?.browser_download_url;
      if (
        !_.startsWith(assetName, ARCHIVE_NAME_PREFIX)
        || !(_.endsWith(assetName, EXT_TAR_GZ) || _.endsWith(assetName, EXT_ZIP))
        || !downloadUrl
      ) {
        continue;
      }
      releaseAssets.push({
        name: assetName,
        url: downloadUrl,
      });
    }
    result.push({
      version,
      isDraft,
      isPrerelease,
      assets: releaseAssets,
    });
  }
  return result;
}

/**
 * @param {ReleaseInfo[]} releases
 * @param {string} version
 * @returns {ReleaseInfo}
 */
function selectRelease(releases, version) {
  if (version === STABLE_VERSION) {
    const stableReleasesAsc = releases
      .filter(({isDraft, isPrerelease}) => !isDraft && !isPrerelease)
      .toSorted((a, b) => a.version.compare(b.version));
    const dstRelease = _.last(stableReleasesAsc);
    if (!dstRelease) {
      throw new Error(`Cannot find any stable GeckoDriver release: ${JSON.stringify(releases)}`);
    }
    return dstRelease;
  }
  const coercedVersion = semver.coerce(version);
  if (!coercedVersion) {
    throw new Error(`The provided version string '${version}' cannot be coerced to a valid SemVer representation`);
  }
  const dstRelease = releases.find((r) => r.version.compare(coercedVersion) === 0);
  if (!dstRelease) {
    throw new Error(
      `The provided version string '${version}' cannot be matched to any available GeckoDriver releases: ` +
      JSON.stringify(releases)
    );
  }
  return dstRelease;
}

/**
 *
 * @param {ReleaseInfo} release
 * @returns {ReleaseAsset}
 */
function selectAsset(release) {
  if (_.isEmpty(release.assets)) {
    throw new Error(`GeckoDriver v${release.version} does not contain any matching releases`);
  }
  /** @type {ReleaseAsset[]} */
  const candidates = [];
  const dstPlatform = PLATFORM_MAPPING[process.platform];
  const dstArch = ARCH_MAPPING[process.arch];
  log.info(`Operating system: ${process.platform}@${process.arch}`);
  // Try to find an exact match
  for (const asset of release.assets) {
    if (!dstPlatform || !_.includes(asset.name, `-${dstPlatform}`)) {
      continue;
    }
    const nameWoExt = asset.name.replace(EXT_REGEXP, '');
    if (
      (dstArch === 'aarch64' && _.endsWith(nameWoExt, `-${dstArch}`))
      || ('64' === dstArch && _.endsWith(nameWoExt, dstArch))
      || ('32' === dstArch && _.endsWith(nameWoExt, dstArch))
    ) {
      candidates.push(asset);
    }
  }
  // If no exact match has been been found then try a loose one
  if (_.isEmpty(candidates)) {
    for (const asset of release.assets) {
      const nameWoExt = asset.name.replace(EXT_REGEXP, '');
      if (dstPlatform && _.endsWith(nameWoExt, `-${dstPlatform}`)) {
        candidates.push(asset);
      }
      if (dstArch === '64' && _.endsWith(nameWoExt, `-${dstPlatform}32`)) {
        candidates.push(asset);
      }
    }
  }
  if (!_.isEmpty(candidates)) {
    return candidates[0];
  }
  throw new Error(
    `GeckoDriver v${release.version} does not contain any release matching the ` +
    `current OS architecture ${process.arch}. Available packages: ${release.assets.map(({name}) => name)}`
  );
}

/**
 *
 * @param {string} version
 * @returns {Promise<void>}
 */
async function installGeckodriver(version) {
  log.debug(`Retrieving releases from ${API_ROOT}`);
  const releases = await listReleases();
  if (!releases.length) {
    throw new Error(`Cannot retrieve any valid GeckoDriver releases from GitHub`);
  }
  log.debug(`Retrieved ${releases.length} GitHub releases`);
  const release = selectRelease(releases, version);
  const asset = selectAsset(release);

  const [dstFolder, isInPath] = await prepareDestinationFolder();
  if (!isInPath) {
    log.warning(
      `The folder '${dstFolder}' is not present in the PATH environment variable. ` +
      `Please add it there manually before starting a session.`
    );
  }

  const archiveName = asset.name.replace(EXT_REGEXP, '');
  const archivePath = path.join(
    tmpdir(),
    `${archiveName}_${(Math.random() + 1).toString(36).substring(7)}${asset.name.replace(archiveName, '')}`
  );
  log.info(`Will download and install v${release.version} from ${asset.url}`);
  try {
    await downloadToFile(asset.url, archivePath);
    let executablePath;
    if (archivePath.endsWith(EXT_TAR_GZ)) {
      executablePath = path.join(dstFolder, 'geckodriver');
      await extractFileFromTarGz(archivePath, path.basename(executablePath), executablePath);
    } else {
      // .zip is only used for Windows
      executablePath = path.join(dstFolder, 'geckodriver.exe');
      await extractFileFromZip(archivePath, path.basename(executablePath), executablePath);
    }
    await clearNotarization(executablePath);
    log.info(`The driver is now available at '${executablePath}'`);
  } finally {
    try {
      await fs.unlink(archivePath);
    } catch (ign) {}
  }
}

(async () => await installGeckodriver(process.argv[2] ?? STABLE_VERSION))();

/**
 * @typedef {Object} ReleaseAsset
 * @property {string} name
 * @property {string} url
 */

/**
 * @typedef {Object} ReleaseInfo
 * @property {import('semver').SemVer} version
 * @property {boolean} isDraft
 * @property {boolean} isPrerelease
 * @property {ReleaseAsset[]} assets
 */
