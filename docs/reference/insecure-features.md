---
hide:
  - toc

title: Insecure Features
---

Some [insecure driver features](https://appium.io/docs/en/latest/guides/security/) are disabled by
default. They can be enabled upon launching Appium as follows:
```
appium --allow-insecure gecko:<feature-name>
```
or
```
appium --relaxed-security
```

For other insecure feature names recognized by the Appium server, see
[their Appium docs reference page](https://appium.io/docs/en/latest/reference/cli/insecure-features/).

|<div style="width:16em">Feature Name</div>|Description|
|------------|-----------|
|`custom_geckodriver_executable`|Allow specifying a custom `geckodriver` installation directory using the [`appium:geckodriverExecutable` capability](./capabilities.md#appium-specific). Available since driver version 2.2.0.|
