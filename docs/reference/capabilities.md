---
title: Capabilities
---

This page lists various capabilities used and implemented by Appium Geckodriver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

| <div style="width:13em">Capability</div> | Description |
| --- | --- |
| `platformName` | Must be set to `mac`, `linux` or `windows` (case-insensitive). This capability specifies the host device, not the device under test - in order to run tests on Android, the [`moz:firefoxOptions` capability](#mozilla-specific) must also be configured accordingly. |
| `browserName` | Any value passed to this capability will be changed to `firefox`. |
| `browserVersion`| [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `acceptInsecureCerts` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `pageLoadStrategy` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `proxy` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `setWindowRect` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `timeouts` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |
| `unhandledPromptBehavior` | [Refer to the W3C Webdriver documentation](https://www.w3.org/TR/webdriver/#capabilities) |

## Appium-Specific

| <div style="width:15em">Capability</div> | Description |
| --- | --- |
| `appium:automationName` | Must be set to `Gecko`. |
| `appium:noReset` | Being set to `true` adds the `--connect-existing argument` to the `geckodriver` binary, that allows to connect to an existing browser instance instead of starting a new browser instance on session startup. |
| `appium:marionettePort` | Selects the port for Geckodriver’s connection to the Marionette remote protocol. The existing Firefox instance must have Marionette enabled. To enable the remote protocol in Firefox, you can pass the `-marionette` flag. Unless the `marionette.port` preference has been user-set, Marionette will listen on port 2828, which is the default value for this capability. |
| `appium:systemPort` | The number of the port for the driver to listen on. Must be unique for each session. If not provided then Appium will try to detect it automatically. |
| `appium:verbosity` | The verbosity level of driver logging. By default, minimum verbosity is applied. Possible values are `debug` or `trace`. |
| `appium:androidStorage` | Sets the value of the `--android-storage` `geckodriver` argument ([see documentation](https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html#android-storage-android-storage)). Supported values are `auto`, `app`, `internal`, and `sdcard`. Note that this argument is deprecated. |
| `appium:geckodriverExecutable` | Custom path to the `geckodriver` binary. The use of this capability is considered an insecure feature and requires the Appium server to be started with the [`custom_geckodriver_executable` insecure feature](../reference/insecure-features.md). If the capability is provided but the insecure feature is not enabled, session creation will fail with a capability validation error. Available since driver version 2.2.0. |

## Mozilla-Specific

| <div style="width:10em">Capability</div> | Description |
| --- | --- |
| `moz:firefoxOptions` | Firefox-specific capabilities. [Refer to the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions) for more details. |
