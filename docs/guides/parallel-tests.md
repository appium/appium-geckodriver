---
hide:
  - toc

title: Testing in Parallel
---

Appium Geckodriver supports running multiple sessions in parallel. This can be implemented in two
ways:

* Multiple Appium server processes with a single session each
* Single Appium server process with multiple sessions (uses less resources and ensures better
  control over running sessions)

!!! tip

    If testing in parallel is _not_ required, consider enabling the [`--session-override`](https://appium.io/docs/en/latest/reference/cli/server/)
    Appium server flag, which ensures deletion of all existing sessions when a new one is started.

## Important Capabilities

The driver does not explicitly require any additional capabilities in parallel sessions, though the
following capabilities, if specified, must have a unique value among all parallel sessions: 

* [`appium:systemPort`](../reference/capabilities.md#systemport)
