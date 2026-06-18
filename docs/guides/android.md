---
hide:
  - toc

title: Android Testing
---

Appium Geckodriver supports automating Gecko-related software on Android, such as the Firefox
browser and other Gecko-based webviews. This functionality requires the `geckodriver` binary version
0.26.0 or later.

Before connecting to an Android device, make sure you have set up the Android-specific prerequisites
described in [the System Requirements](../getting-started/index.md#system-requirements).

Once the prerequisites have been set up, you can connect to an Android device by specifying one or
more [Android-related options under the `moz:firefoxOptions` capability](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions#android).

For example, to launch the Firefox browser on the first running Android emulator, you could use
the following capability set:

```json
{
  "platformName": "mac",
  "browserName": "firefox",
  "appium:automationName": "Gecko",
  "moz:firefoxOptions": {
    "androidPackage": "org.mozilla.firefox",
    "androidDeviceSerial": "emulator-5554"
  }
}
```
