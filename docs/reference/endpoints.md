---
title: Endpoints
---

Appium Geckodriver comes with a set of many available endpoints, which are primarily inherited from
the Appium base driver, and can be found in [their Appium docs reference pages](https://appium.io/docs/en/latest/reference/api/).
Refer to the documentation of your Appium client for how to call specific endpoints.

The driver also defines several additional endpoints, which are included in Mozilla's extension of the W3C WebDriver protocol. All of these endpoints are supported since driver version 2.3.0.

!!! warning

    Endpoints specified by this protocol are not officially documented, but they can be found [in the Firefox source code](https://github.com/mozilla-firefox/firefox/blob/main/testing/geckodriver/src/command.rs).

### getContext

```
GET /session/:sessionId/moz/context
```

Retrieves the currently active browsing context.

#### Response

`string` - the name of the active context (either `content` or `chrome`)

### setContext

```
POST /session/:sessionId/moz/context
```

Sets the currently active browsing context.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`context`|The name of the context to set as active. Supported values are `content` or `chrome`.|string|

#### Response

`null`

### installAddon

```
POST /session/:sessionId/moz/addon/install
```

Installs and activates an addon.

#### Parameters

|<div style="width:12em">Name</div>|Description|Type|
|--|--|--|
|`addon?`|The addon file as a Base64 string. Required if `path` is not provided.|string|
|`path?`|Path to an `.xpi` addon file.  Required if `addon` is not provided.|string|
|`temporary?`|Whether the addon should be removed upon restart|boolean|
|`allowPrivateBrowsing?`|Whether the addon should be activated in Private Browsing|boolean|

#### Response

`string` - the identifier of the installed addon

### `uninstallAddon`

```
POST /session/:sessionId/moz/addon/uninstall
```

Uninstalls a previously installed addon.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`id`|The identifier of the addon to uninstall|string|

#### Returned Result

`null`

### `takeFullScreenshot`

```
GET /session/:sessionId/moz/screenshot/full
```

Takes a screenshot of the full page.

#### Response

`string` - a Base64-encoded screenshot of the page
