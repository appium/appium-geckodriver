---
hide:
  - toc

title: Non-Firefox Browsers
---

Appium Geckodriver theoretically supports automating any Gecko-based browser, not just Firefox.
This can be achieved by customizing the path to the browser binary.

!!! warning

    Other browsers may not be fully compatible with Appium Geckodriver and may require workarounds.
    Only Firefox has been tested and confirmed to work.

For example, in order to launch the Zen browser on macOS, you could use the following capabilities:

```json
{
  "platformName": "mac",
  "browserName": "firefox",
  "appium:automationName": "Gecko",
  "moz:firefoxOptions": {
    "binary": "/Applications/Zen.app/Contents/MacOS/zen"
  }
}
```

For more details, [refer to the MDN documentation for `moz:firefoxOptions`](https://developer.mozilla.org/en-US/docs/Web/WebDriver/Reference/Capabilities/firefoxOptions#binary_string).
