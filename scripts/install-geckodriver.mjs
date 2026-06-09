#!/usr/bin/env node
import axios from 'axios';
import * as semver from 'semver';
import path from 'node:path';
import {homedir, tmpdir} from 'node:os';
import {constants as fsConstants} from 'node:fs';
import fs from 'node:fs/promises';
import {exec} from 'teen_process';
import {Command} from 'commander';
import {log} from '../build/lib/logger.js';
import {
  downloadToFile,
  mkdirp,
  extractFileFromTarGz,
  extractFileFromZip,
} from '../build/lib/utils.js';

const STABLE_VERSION = 'stable';
const EXT_TAR_GZ = '.tar.gz';
const EXT_ZIP = '.zip';
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EXT_REGEXP = new RegExp(`(${escapeRegExp(EXT_TAR_GZ)}|${escapeRegExp(EXT_ZIP)})$`);

/**
 * Fetches and selects Geckodriver releases from GitHub.
 */
class GeckodriverReleaseCatalog {
  static OWNER = 'mozilla';
  static REPO = 'geckodriver';
  static API_ROOT = `https://api.github.com/repos/${GeckodriverReleaseCatalog.OWNER}/${GeckodriverReleaseCatalog.REPO}`;
  static API_VERSION_HEADER = {'X-GitHub-Api-Version': '2022-11-28'};
  static API_TIMEOUT_MS = 45 * 1000;
  static ARCHIVE_NAME_PREFIX = 'geckodriver-v';
  static ARCH_MAPPING = Object.freeze({
    ia32: '32',
    x64: '64',
    arm64: 'aarch64',
  });
  static PLATFORM_MAPPING = Object.freeze({
    win32: 'win',
    darwin: 'macos',
    linux: 'linux',
  });

  /**
   * https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#list-releases
   *
   * @returns {Promise<ReleaseInfo[]>}
   */
  async listReleases() {
    /** @type {Record<string, any>[]} */
    const allReleases = [];
    let currentUrl = `${GeckodriverReleaseCatalog.API_ROOT}/releases`;
    do {
      const {data, headers} = await axios.get(currentUrl, {
        timeout: GeckodriverReleaseCatalog.API_TIMEOUT_MS,
        headers: {...GeckodriverReleaseCatalog.API_VERSION_HEADER},
      });
      allReleases.push(...data);
      currentUrl = this.#parseNextPageUrl(headers);
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
      for (const asset of releaseInfo.assets ?? []) {
        const assetName = asset?.name;
        const downloadUrl = asset?.browser_download_url;
        if (
          !assetName?.startsWith(GeckodriverReleaseCatalog.ARCHIVE_NAME_PREFIX)
          || !(assetName?.endsWith(EXT_TAR_GZ) || assetName?.endsWith(EXT_ZIP))
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
  selectRelease(releases, version) {
    if (version === STABLE_VERSION) {
      const stableReleasesAsc = releases
        .filter(({isDraft, isPrerelease}) => !isDraft && !isPrerelease)
        .toSorted((a, b) => a.version.compare(b.version));
      const dstRelease = stableReleasesAsc.at(-1);
      if (!dstRelease) {
        throw new Error(`Cannot find any stable GeckoDriver release: ${JSON.stringify(releases)}`);
      }
      return dstRelease;
    }
    const coercedVersion = semver.coerce(version);
    if (!coercedVersion) {
      throw new Error(
        `The provided version string '${version}' cannot be coerced to a valid SemVer representation`
      );
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
   * @param {ReleaseInfo} release
   * @returns {ReleaseAsset}
   */
  selectAsset(release) {
    if (release.assets.length === 0) {
      throw new Error(`GeckoDriver v${release.version} does not contain any matching releases`);
    }
    const dstPlatform = GeckodriverReleaseCatalog.PLATFORM_MAPPING[process.platform];
    const dstArch = GeckodriverReleaseCatalog.ARCH_MAPPING[process.arch];
    log.info(`Operating system: ${process.platform}@${process.arch}`);

    /** @type {(filterFunc: (string) => boolean) => null|ReleaseAsset} */
    const findAssetMatch = (filterFunc) => {
      for (const asset of release.assets) {
        if (!dstPlatform || !asset.name.includes(`-${dstPlatform}`)) {
          continue;
        }
        const nameWoExt = asset.name.replace(EXT_REGEXP, '');
        if (filterFunc(nameWoExt)) {
          return asset;
        }
      }
      return null;
    };

    const exactMatch = findAssetMatch(
      (nameWoExt) =>
        (dstArch === 'aarch64' && nameWoExt.endsWith(`-${dstArch}`))
        || (['64', '32'].includes(dstArch) && nameWoExt.endsWith(`-${dstPlatform}${dstArch}`))
    );
    if (exactMatch) {
      return exactMatch;
    }
    const looseMatch = findAssetMatch(
      (nameWoExt) =>
        nameWoExt.endsWith(`-${dstPlatform}`)
        || (dstArch === '64' && nameWoExt.endsWith(`-${dstPlatform}32`))
    );
    if (looseMatch) {
      return looseMatch;
    }
    throw new Error(
      `GeckoDriver v${release.version} does not contain any release matching the ` +
      `current OS architecture ${process.arch}. Available packages: ${release.assets.map(({name}) => name)}`
    );
  }

  /**
   * @param {import('axios').AxiosResponseHeaders} headers
   * @returns {string|null}
   */
  #parseNextPageUrl(headers) {
    if (!headers.link) {
      return null;
    }

    for (const part of headers.link.split(';')) {
      const [rel, pageUrl] = part.split(',').map((item) => item.trim());
      if (rel === 'rel="next"' && pageUrl) {
        return pageUrl.replace(/^<|>$/g, '');
      }
    }
    return null;
  }
}

/**
 * Resolves and validates Geckodriver installation paths.
 */
class GeckodriverInstallPath {
  /**
   * @returns {string}
   */
  static #getExecutableName() {
    return process.platform === 'win32' ? 'geckodriver.exe' : 'geckodriver';
  }

  /**
   * @param {string} [explicitDestDir]
   * @returns {Promise<{path: string, onPath: boolean}>}
   */
  async resolve(explicitDestDir) {
    const dstRoot = explicitDestDir
      ? path.resolve(explicitDestDir)
      : await this.#resolveDefault();
    if (!(await this.#isInstallable(dstRoot))) {
      throw new Error(
        `The destination directory '${dstRoot}' is not writable or already contains ` +
        `a non-overwritable geckodriver binary`
      );
    }
    return {
      path: dstRoot,
      onPath: this.#isOnPath(dstRoot),
    };
  }

  /**
   * @param {string} dstRoot
   * @returns {boolean}
   */
  #isOnPath(dstRoot) {
    const pathParts = process.env.PATH ? process.env.PATH.split(path.delimiter) : [];
    return pathParts
      .map((pp) => path.normalize(pp))
      .some((pp) => pp === path.normalize(dstRoot));
  }

  /**
   * @param {string} dstRoot
   * @returns {Promise<boolean>}
   */
  async #isInstallable(dstRoot) {
    const executablePath = path.join(dstRoot, GeckodriverInstallPath.#getExecutableName());
    try {
      await mkdirp(dstRoot);
      await fs.access(dstRoot, fsConstants.W_OK);
      try {
        const stats = await fs.lstat(executablePath);
        if (!stats.isFile()) {
          return false;
        }
        await fs.access(executablePath, fsConstants.W_OK);
      } catch (err) {
        if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
          return false;
        }
        const probePath = path.join(dstRoot, `.geckodriver-install-probe-${process.pid}`);
        await fs.writeFile(probePath, '');
        await fs.unlink(probePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @param {string[]} candidates
   * @returns {Promise<string>}
   */
  async #selectFromCandidates(candidates) {
    for (const candidate of candidates) {
      if (await this.#isInstallable(candidate)) {
        return candidate;
      }
    }
    throw new Error(
      `Could not find a writable installation directory. Tried: ${candidates.join(', ')}`
    );
  }

  /**
   * @returns {Promise<string>}
   */
  async #resolveDefault() {
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.LOCALAPPDATA, 'Mozilla');
      case 'linux':
        return this.#selectFromCandidates([
          path.join('/usr', 'local', 'bin'),
          path.join(homedir(), '.local', 'bin'),
        ]);
      case 'darwin':
        return this.#selectFromCandidates([
          path.join('/opt', 'homebrew', 'bin'),
          path.join('/usr', 'local', 'bin'),
          path.join(homedir(), '.local', 'bin'),
        ]);
      default:
        throw new Error(
          `GeckoDriver does not support the ${process.platform} platform. ` +
          `Only Linux, Windows and macOS are supported.`
        );
    }
  }
}

/**
 * Downloads and installs Geckodriver binaries.
 */
class GeckodriverInstaller {
  /**
   * @param {GeckodriverReleaseCatalog} [catalog]
   * @param {GeckodriverInstallPath} [installPath]
   */
  constructor(
    catalog = new GeckodriverReleaseCatalog(),
    installPath = new GeckodriverInstallPath(),
  ) {
    this.catalog = catalog;
    this.installPath = installPath;
  }

  /**
   * @param {string} version
   * @param {{destDir?: string}} [options]
   * @returns {Promise<void>}
   */
  async install(version, options = {}) {
    log.debug(`Retrieving releases from ${GeckodriverReleaseCatalog.API_ROOT}`);
    const releases = await this.catalog.listReleases();
    if (!releases.length) {
      throw new Error(`Cannot retrieve any valid GeckoDriver releases from GitHub`);
    }
    log.debug(`Retrieved ${releases.length} GitHub releases`);

    const release = this.catalog.selectRelease(releases, version);
    const asset = this.catalog.selectAsset(release);
    const {path: dstFolder, onPath} = await this.installPath.resolve(options.destDir);

    if (!onPath) {
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
      const executablePath = await this.#deployBinary(archivePath, dstFolder);
      await this.#clearNotarization(executablePath);
      log.info(`The driver is now available at '${executablePath}'`);
    } finally {
      try {
        await fs.unlink(archivePath);
      } catch {}
    }
  }

  /**
   * @param {string} archivePath
   * @param {string} dstFolder
   * @returns {Promise<string>}
   */
  async #deployBinary(archivePath, dstFolder) {
    if (archivePath.endsWith(EXT_TAR_GZ)) {
      const executablePath = path.join(dstFolder, 'geckodriver');
      await extractFileFromTarGz(archivePath, path.basename(executablePath), executablePath);
      return executablePath;
    }
    const executablePath = path.join(dstFolder, 'geckodriver.exe');
    await extractFileFromZip(archivePath, path.basename(executablePath), executablePath);
    return executablePath;
  }

  /**
   * @param {string} dstPath
   * @returns {Promise<void>}
   */
  async #clearNotarization(dstPath) {
    if (process.platform === 'darwin') {
      await exec('xattr', ['-cr', dstPath]);
    }
  }
}

/**
 * CLI with Commander.js
 */
async function main() {
  const installer = new GeckodriverInstaller();
  const program = new Command();

  program
    .name('appium driver run gecko install-geckodriver')
    .description('Download and install Geckodriver from GitHub releases')
    .argument('[version]', 'Geckodriver version to install (default: latest stable)', STABLE_VERSION)
    .option('-d, --dest <path>', 'Destination directory for the geckodriver binary')
    .addHelpText(
      'after',
      `
EXAMPLES:
  # Install the latest stable Geckodriver to the default location
  appium driver run gecko install-geckodriver

  # Install a specific version
  appium driver run gecko install-geckodriver 0.36.0

  # Install to a custom directory
  appium driver run gecko install-geckodriver --dest ~/.local/bin

NOTE:
  On macOS, the default location is the first writable directory among:
  /opt/homebrew/bin, /usr/local/bin, and ~/.local/bin.
  On Linux, the default location is /usr/local/bin or ~/.local/bin.
  On Windows, the default location is %LOCALAPPDATA%\\Mozilla.`
    )
    .action(async (version, options) => {
      await installer.install(version, {destDir: options.dest});
    });

  await program.parseAsync(process.argv);
}

(async () => await main())();

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
