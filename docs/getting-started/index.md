---
hide:
  - navigation

title: Getting Started
---

## System Requirements

There are four primary requirements to use Appium Geckodriver:

* macOS, Windows or Linux host machine
* Appium
* Gecko-based web browser (desktop or Android), or an Android hybrid application with a Gecko-based webview
* `geckodriver` binary accessible from the host machine PATH
    * Since driver version 1.4.0, you can use the [`install-geckodriver`](../reference/scripts.md) driver script to download and set up the binary
    * For older driver versions, the binary can be downloaded from its [GitHub releases page](https://github.com/mozilla/geckodriver/releases). macOS users may need to run `xattr -cr "<binary_path>"` to [avoid notarization issues](https://firefox-source-docs.mozilla.org/testing/geckodriver/Notarization.html).


If running tests on an Android device, additional requirements apply:

* Android SDK and `adb` installed on the host machine
* Real Android devices must have [USB debugging enabled](https://developer.android.com/studio/debug/dev-options)

!!! note

    If you already have the driver installed, since version 1.3.0 you can also verify its
    requirements with the built-in Appium Doctor support:

    ```
    appium driver doctor gecko
    ```

### Appium Server

Make sure to install a version of Appium that supports your target driver version. The requirements
and prerequisites of Appium itself can be found in [the Appium documentation](https://appium.io/docs/en/latest/quickstart/requirements/).

| Geckodriver version | Supported Appium server version |
| --- | --- |
| >= 2.0.0 | Appium 3 |
| 1.0.0 - 1.4.4 | Appium 2 |

## Installation

Provided you have set up the above prerequisites, you can install the driver using Appium's
[extension CLI](https://appium.io/docs/en/latest/cli/extensions/):

```bash
appium driver install gecko
```

You can also specify an exact driver version:

```bash
appium driver install gecko@2.3.0
```

Alternatively, if you are running a Node.js project, you can include `appium-geckodriver` as
one of your project dependencies. [Refer to the Appium documentation](https://appium.io/docs/en/latest/guides/managing-exts/#do-it-yourself-with-npm)
for more information about this approach.

### Verify the Installation

In order to check that the driver was installed correctly, simply launch the Appium server:

```bash
appium
```

The server log output should include a line like the following:

```
[Appium] GeckoDriver has been successfully loaded in 0.789s
```
