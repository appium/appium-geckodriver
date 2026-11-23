---
title: Android Devices
---

Appium Geckodriver supports automating Gecko-related software on Android, such as the Firefox
browser and other Gecko-based webviews. This functionality requires the `geckodriver` binary version
0.26.0 or later.

In addition to [the standard driver configuration](../getting-started/index.md#system-requirements),
Android tests have further requirements:

* Android SDK and `adb` must be installed on the host machine
* Real Android devices must have [USB debugging enabled](https://developer.android.com/studio/debug/dev-options)

Once the prerequisites have been set up, you can start a session on an Android device by specifying
one or more [Android-related options under the `moz:firefoxOptions` capability](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions#android).

## Examples

The following capability set can be used to launch the Firefox browser on the first running Android
emulator:

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

## Troubleshooting

### Permission Denial for File Creation

When starting an Android session, `geckodriver` pushes a temporary Firefox profile to the device.
On Android 11+ emulators or non-rooted real devices with scoped storage restrictions, `geckodriver`
may fail to create or change permissions for profile directories under `/sdcard/Android/data/<package>/files/test_root`.
This can manifest with errors such as `adb error: couldn't create file: Permission denied` or
`fchown() failed: Operation not permitted`.

To work around this:

* Try setting the [`appium:androidStorage`](../reference/capabilities.md#androidstorage) capability
  to `internal` (for example `/data/local/tmp/test_root`) or `app` instead of `sdcard`
* If `/sdcard/Android/data/<package>/files/test_root` does not exist yet on an emulator, pre-create
  it with `adb shell mkdir -p /sdcard/Android/data/<package>/files/test_root` or use a standard
  `userdebug` (non-Google Play) Android emulator image
* Set [`appium:verbosity`](../reference/capabilities.md#verbosity) to `trace` to inspect the exact
  `adb` host commands executed by `mozdevice`

### Connecting to an Existing Android App

Setting [`appium:noReset`](../reference/capabilities.md#noreset) to `true` passes the `--connect-existing`
flag to `geckodriver`. The `geckodriver` binary does not support this flag in combination with
`moz:firefoxOptions.androidPackage`, and will reject session creation with the error
`SessionNotCreatedError: Cannot connect to an existing Android App yet`.

To work around this:

* Launch or restart the Android browser normally by omitting `appium:noReset` (or setting it to `false`)
* Explicitly forward the Marionette port (configurable via [`appium:marionettePort`](../reference/capabilities.md#marionetteport))
  to the host first (`adb forward tcp:2828 tcp:2828`), then omit `androidPackage` from
  `moz:firefoxOptions` 
