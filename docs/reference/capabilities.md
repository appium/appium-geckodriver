---
title: Capabilities
---

This page lists various capabilities used and implemented by Appium Geckodriver. To learn more
about capabilities, refer to the [Appium documentation](https://appium.io/docs/en/latest/guides/caps/).

For other capabilities recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/session/caps/).

## Standard

Refer to [the W3C WebDriver documentation](https://w3c.github.io/webdriver/#capabilities)
for more information about these capabilities.

### platformName

| Name | Type | Default |
| -- | -- | -- |
| `platformName` | `string` | Not specified |

This capability must be set to `mac`, `linux` or `windows` (case-insensitive).

Note that this specifies the _host device_, not the _device under test_. In order to run tests on
Android, the [`moz:firefoxOptions` capability](#firefoxoptions) must also be configured accordingly.

### browserName

| Name | Type | Default |
| -- | -- | -- |
| `browserName` | `string` | Not specified |

Any value passed to this capability will be changed to `firefox`.

### browserVersion

| Name | Type | Default |
| -- | -- | -- |
| `browserVersion` | `string` | Not specified |

### acceptInsecureCerts

| Name | Type | Default |
| -- | -- | -- |
| `acceptInsecureCerts` | `boolean` | `false` |

### pageLoadStrategy

| Name | Type | Default |
| -- | -- | -- |
| `pageLoadStrategy` | `string` | `normal` |

### proxy

| Name | Type | Default |
| -- | -- | -- |
| `proxy` | `object` | `{}` |

### setWindowRect

| Name | Type | Default |
| -- | -- | -- |
| `setWindowRect` | `boolean` | Not specified |

### timeouts

| Name | Type | Default |
| -- | -- | -- |
| `timeouts` | `object` | [Default WebDriver timeouts configuration](https://w3c.github.io/webdriver/#dfn-timeouts-configuration) |

### unhandledPromptBehavior

| Name | Type | Default |
| -- | -- | -- |
| `unhandledPromptBehavior` | `string` | `dismiss and notify` |

## General

### automationName

| Name | Type | Default |
| -- | -- | -- |
| `appium:automationName` | `string` | Not specified |

Specifies the Appium driver to use. Must be set to `Gecko` (case-insensitive)

## Mozilla

### firefoxOptions

| Name | Type | Default |
| -- | -- | -- |
| `moz:firefoxOptions` | `Record<string, any>` | Not specified |

Firefox-specific capabilities. [Refer to the MDN documentation](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions)
for more details.

## Geckodriver

Most of these capabilities map to [flags supported by the `geckodriver` binary](https://firefox-source-docs.mozilla.org/testing/geckodriver/Flags.html).

### geckodriverExecutable

| Name | Type | Default |
| -- | -- | -- |
| `appium:geckodriverExecutable` | `string` | Not specified |

Custom path to the `geckodriver` binary. The use of this capability is considered an insecure
feature and requires the Appium server to be started with the
[`custom_geckodriver_executable` insecure feature flag](../reference/insecure-features.md).

Available since driver version 2.2.0.

### noReset

| Name | Type | Default |
| -- | -- | -- |
| `appium:noReset` | `boolean` | `false` |

Whether to allow connecting to an existing browser instance instead of starting a new browser
instance on session startup. Maps to the `--connect-existing` flag of the `geckodriver` binary.

### systemPort

| Name | Type | Default |
| -- | -- | -- |
| `appium:systemPort` | `number` | `5200` |

The port for `geckodriver`'s WebDriver server to listen on. Maps to the `--port` flag of the
`geckodriver` binary.

The port must be unique for each session. If not provided, Appium will try the first available
port in the range `5200..5300`.

### marionettePort

| Name | Type | Default |
| -- | -- | -- |
| `appium:marionettePort` | `number` | `2828` (if [`appium:noReset`](#noreset) is specified) |

The port for `geckodriver`'s connection to the Marionette remote protocol. Maps to the
`--marionette-port` flag of the `geckodriver` binary.

The existing Firefox instance must have Marionette enabled, which can be done by launching the
browser with the `-marionette` flag.

Note that the default value for this capability can also be overridden by setting the
`marionette.port` browser preference.

### verbosity

| Name | Type | Default |
| -- | -- | -- |
| `appium:verbosity` | `string` | Not specified |

The verbosity level of `geckodriver` logging. Maps to the `-v[v]` flag of the `geckodriver` binary.

By default, minimum verbosity is applied. Possible values are `debug` or `trace`.

### androidStorage

| Name | Type | Default |
| -- | -- | -- |
| `appium:androidStorage` | `string` | Not specified |

The location of the test data on the Android device. Only relevant if running tests on Android.
Maps to the `--android-storage` flag of the `geckodriver` binary.

Supported values are `auto`, `app`, `internal`, and `sdcard`. Note that this argument is deprecated
from the `geckodriver` side.
