---
hide:
  - toc

title: Scripts
---

Appium drivers can include scripts for executing specific actions. The scripts included in the
Geckodriver can be run as follows:

```
appium driver run gecko <script-name>
```

For more information about the `appium driver run` command, refer to [the Appium docs](https://appium.io/docs/en/latest/reference/cli/extensions/#run).

!!! note

    Script arguments should be provided after an additional double dash (`--`), to ensure they are
    passed to the script itself, instead of the `appium driver run` command.

### `install-geckodriver`

Downloads and installs the `geckodriver` server binary.

#### Usage

```
appium driver run gecko install-geckodriver [version]
```

##### Optional Arguments

|<div style="width:7em">Argument</div>|<div style="width:22em">Description</div>|Type|Default|
|--|--|--|--|
|`version`|Specific version of `geckodriver` to download|string|`stable`|
|`--dest, --d`|Directory where the binary should be installed|string|macOS/Linux: `/usr/local/bin` (fallbacks to `~/.local/bin`), Windows: `%LOCALAPPDATA%\\Mozilla`|

#### Examples

- Install the latest stable version of `geckodriver`:

    ```
    appium driver run gecko install-geckodriver
    ```

- Install `geckodriver` version `0.35.0`:

    ```
    appium driver run gecko install-geckodriver -- 0.35.0
    ```

- Install the latest stable version of `geckodriver` in a custom directory:

    ```
    appium driver run gecko install-geckodriver -- --dest /my/custom/directory
    ```
