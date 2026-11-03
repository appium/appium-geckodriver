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

Once the prerequisites have been set up, you can start a session on an Android device by specifying
one or more [Android-related options under the `moz:firefoxOptions` capability](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions#android).

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

## Troubleshooting

### Permission Denial for File Creation

When starting an Android session, `geckodriver` pushes a temporary Firefox profile to the device.
On Android 11+ emulators or non-rooted real devices with scoped storage restrictions, `geckodriver`
may fail to create or `chmod`/`chown` profile directories under `/sdcard/Android/data/<package>/files/test_root`
with errors such as `adb error: couldn't create file: Permission denied` or `fchown() failed: Operation not permitted`.

To work around this:

* Try setting the [`appium:androidStorage`](../reference/capabilities.md#androidstorage) capability
  to `internal` (for example `/data/local/tmp/test_root`) or `app` instead of `sdcard`.
* If `/sdcard/Android/data/<package>/files/test_root` does not exist yet on an emulator, pre-create
  it with `adb shell mkdir -p /sdcard/Android/data/<package>/files/test_root` or use a standard
  `userdebug` (non-Google Play) Android emulator image.
* Set [`appium:verbosity`](../reference/capabilities.md#verbosity) to `trace` to inspect the exact
  `adb` host commands executed by `mozdevice`.

### Connecting to an Existing Android App

Setting [`appium:noReset`](../reference/capabilities.md#noreset) to `true` passes `--connect-existing`
to `geckodriver`. Mozilla's `geckodriver` does not support `--connect-existing` when
`moz:firefoxOptions.androidPackage` is provided and will reject session creation with
`SessionNotCreatedError: Cannot connect to an existing Android App yet`.

* To launch or restart the Android browser normally via `moz:firefoxOptions.androidPackage`, omit
  `appium:noReset` (or set it to `false`).
* To attach to an already-running Gecko instance with Marionette enabled on port `2828`, forward the
  Marionette port to the host first (`adb forward tcp:2828 tcp:2828`) and omit `androidPackage` from
  `moz:firefoxOptions`.
