Appium Geckodriver
====

[![NPM version](http://img.shields.io/npm/v/appium-geckodriver.svg)](https://npmjs.org/package/appium-geckodriver)
[![Downloads](http://img.shields.io/npm/dm/appium-geckodriver.svg)](https://npmjs.org/package/appium-geckodriver)

[![Release](https://github.com/appium/appium-geckodriver/actions/workflows/publish.js.yml/badge.svg)](https://github.com/appium/appium-geckodriver/actions/workflows/publish.js.yml)

This is Appium driver for automating Firefox on different platforms, including Android.
The driver only supports Firefox and Gecko-based web views (Android only) automation using [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/).
Under the hood this driver is a wrapper/proxy over `geckodriver` binary. Check the driver [release notes](https://github.com/mozilla/geckodriver/releases) and the [official documentation](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Capabilities) to get more details on the supported features and possible pitfalls.

> **Note**
>
> Since version 1.0.0 Gecko driver has dropped the support of Appium 1, and is only compatible to Appium 2. Use the `appium driver install gecko`
> command to add it to your Appium 2 dist.

## Requirements

It is mandatory to have both Firefox browser installed and the geckodriver binary downloaded on the platform where automated tests are going to be executed. Firefox could be downloaded from the [official download site](https://www.mozilla.org/en-GB/firefox/all/) and the driver binary could be retrieved from the GitHub [releases page](https://github.com/mozilla/geckodriver/releases). The binary must be put into one of the folders included to PATH environment variable. On macOS it also might be necessary to run `xattr -cr "<binary_path>"` to avoid [notarization](https://firefox-source-docs.mozilla.org/testing/geckodriver/Notarization.html) issues.

Since driver version 1.4.0 the geckodriver binary deployment could be automated via the
[install-geckodriver](#install-geckodriver) driver script.

Then you need to decide where the automated test is going to be executed. Gecko driver supports the following target platforms:
 - macOS
 - Windows
 - Linux
 - Android (note that `android` *cannot* be passed as a value to `platformName` capability; it should always equal to the *host* platform name)

In order to run your automated tests on an Android device it is necessary to have [Android SDK](https://developer.android.com/studio) installed, so the destination device is marked as `online` in the `adb devices -l` command output.

### Doctor

Since driver version 1.3.0 you can automate the validation for the most of the above
requirements as well as various optional ones needed by driver extensions by running the
`appium driver doctor gecko` server command.

## Capabilities

Gecko driver allows defining of multiple criterions for platform selection and also to fine-tune your automation session properties. This could be done via the following session capabilities:

Capability Name | Description
--- | ---
platformName | Gecko Driver supports the following platforms: `mac`, `linux`, `windows`. The fact your test must be executed on Android is detected based on `moz:firefoxOptions` entry values. Values of platformName are compared case-insensitively.
browserName | Any value passed to this capability will be changed to 'firefox'.
browserVersion | Provide the version number of the browser to automate if there are multiple versions installed on the same machine where the driver is running.
appium:automationName | Must always be set to `Gecko`.
appium:noReset | Being set to `true` adds the `--connect-existing` argument to the server, that allows to connect to an existing browser instance instead of starting a new browser instance on session startup.
appium:marionettePort | Selects the port for Geckodriver’s connection to the Marionette remote protocol. The existing Firefox instance must have Marionette enabled. To enable the remote protocol in Firefox, you can pass the `-marionette` flag. Unless the `marionette.port` preference has been user-set, Marionette will listen on port `2828`, which is the default value for this capability.
appium:systemPort | The number of the port for the driver to listen on. Must be unique for each session. If not provided then Appium will try to detect it automatically.
appium:verbosity | The verbosity level of driver logging. By default minimum verbosity is applied. Possible values are `debug` or `trace`.
appium:androidStorage | See https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#code-android-storage-var-android-storage-var-code
moz:firefoxOptions | See https://developer.mozilla.org/en-US/docs/Web/WebDriver/Capabilities/firefoxOptions
acceptInsecureCerts | See https://www.w3.org/TR/webdriver/#capabilities
pageLoadStrategy | See https://www.w3.org/TR/webdriver/#capabilities
proxy | See https://www.w3.org/TR/webdriver/#capabilities
setWindowRect | See https://www.w3.org/TR/webdriver/#capabilities
timeouts | See https://www.w3.org/TR/webdriver/#capabilities
unhandledPromptBehavior | See https://www.w3.org/TR/webdriver/#capabilities

## Scripts

### install-geckodriver

This script is used to install the given or latest stable version of Geckodriver server from
the [GitHub releases](https://github.com/mozilla/geckodriver/release) page.
Run `appium driver run gecko install-geckodriver <optional_version>`, where `optional_version`
must be either valid Geckodriver version number or should not be present (the latest stable version is used then).
By default, the script will download and unpack the binary into `/usr/local/bin/geckodriver`
on macOS and Linux or into `%LOCALAPPDATA%\Mozilla\geckodriver.exe` on Windows.
You must also make sure the `%LOCALAPPDATA%\Mozilla` (Windows) or `/usr/local/bin/` (Linux & macOS)
folder is present in the PATH environment variable before
starting an actual automation session. The deployment script should also show a warning message if
it is unable to find the parent folder in the PATH folders list.

## Example

```python
# Python3 + PyTest
import pytest
import time

from appium import webdriver
# Options are available in Python client since v2.6.0
from appium.options.gecko import GeckoOptions
from selenium.webdriver.common.by import By


def generate_options():
    common_caps = {
        # It does not really matter what to put there, although setting 'Firefox' might cause a failure
        # depending on the particular client library
        'browserName': 'MozillaFirefox',
        # Should have the name of the host platform, where the geckodriver binary is deployed
        'platformName': 'mac',
    }
    android_options = GeckoOptions().load_capabilities(common_caps)
    android_options.firefox_options = {
        'androidDeviceSerial': '<device/emulator serial>',
        # These capabilities depend on what you are going to automate
        # Refer Mozilla documentation at https://developer.mozilla.org/en-US/docs/Web/WebDriver/Capabilities/firefoxOptions for more details
        'androidPackage': 'org.mozilla.firefox',
    }
    desktop_options = GeckoOptions().load_capabilities(common_caps)
    return [android_options, desktop_options]


@pytest.fixture(params=generate_options())
def driver(request):
    # The default URL is http://127.0.0.1:4723/wd/hub in Appium1
    drv = webdriver.Remote('http://127.0.0.1:4723', options=request.param)
    yield drv
    drv.quit()


class TimeoutError(Exception):
    pass


def wait_until_truthy(func, timeout_sec=5.0, interval_sec=0.5):
    started = time.time()
    original_error = None
    while time.time() - started < timeout_sec:
        original_error = None
        try:
            result = func()
            if result:
                return result
        except Exception as e:
            original_error = e
        time.sleep(interval_sec)
    if original_error is None:
        raise TimeoutError(f'Condition unmet after {timeout_sec}s timeout')
    raise original_error


def test_feature_status_page_search(driver):
    driver.get('https://webkit.org/status/')

    # Enter "CSS" into the search box.
    # Ensures that at least one result appears in search
    # !!! Remember there are no ID and NAME locators in W3C standard
    # These two have been superseded by CSS ones
    search_box = driver.find_element_by_css('#search')
    search_box.send_keys('CSS')
    value = search_box.get_attribute('value')
    assert len(value) > 0
    search_box.submit()
    # Count the visible results when filters are applied
    # so one result shows up in at most one filter
    assert wait_until_truthy(
        lambda: len(driver.execute_script("return document.querySelectorAll('li.feature:not(.is-hidden)')")) > 0)


def test_feature_status_page_filters(driver):
    driver.get('https://webkit.org/status/')

    assert wait_until_truthy(
        lambda: len(driver.execute_script("return document.querySelectorAll('.filter-toggle')")) == 7)

    # Make sure every filter is turned off.
    for checked_filter in filter(lambda f: f.is_selected(), filters):
        checked_filter.click()

    # Make sure you can select every filter.
    for filt in filters:
        filt.click()
        assert filt.is_selected()
        filt.click()
```

## Development

```bash
# clone repo, then in repo dir:
npm install
npm run lint
npm run test
```
