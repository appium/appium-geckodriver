---
hide:
  - navigation
  - toc

title: Overview
---

Appium Geckodriver is an Appium driver intended for black-box automated testing of Gecko-based
browsers and webviews.

## Target Platforms

The driver supports the following platforms as automation targets:

|Platform|Simulators|Real devices|
|--|--|--|
|Firefox (desktop)|N/A|:white_check_mark:|
|Firefox (Android)|:white_check_mark:|:white_check_mark:|
|Firefox (iOS)|:x: [^firefox-ios]|:x: [^firefox-ios]|
|Android (Gecko-based webviews)|:white_check_mark:|:white_check_mark:|

The driver also permits automating other Gecko-based desktop browsers (Zen, LibreWolf, Floorp, etc.).
Refer to the [Non-Firefox Browsers guide](./guides/other-browsers.md) for more details.

## Technologies Used

Appium Geckodriver uses the [W3C WebDriver protocol](https://www.w3.org/TR/webdriver/) for session
management. Under the hood, the driver is a wrapper/proxy over Mozilla's `geckodriver` binary.
Learn more about its features here:

* [`geckodriver` documentation](https://firefox-source-docs.mozilla.org/testing/geckodriver/index.html)
* [`geckodriver` release notes](https://github.com/mozilla/geckodriver/releases)

Communication with Android devices is provided by the [`appium-adb`](https://github.com/appium/appium-adb) library.

[^firefox-ios]: The iOS version of Firefox is based on WebKit, not Gecko