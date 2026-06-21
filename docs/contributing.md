---
hide:
  - navigation
  - toc

title: Contributing
---

Contributions to this project are welcome! To start off, clone it from GitHub and run:

```bash
npm install
```

To run unit/functional tests:

```bash
npm run test # unit 
npm run e2e-test # functional
```

To develop documentation:

```bash
npm run install-docs-deps # install the dependencies (Python packages)
npm run dev:docs # serve the docs locally and watch for changes
```

There are also a number of environment variables that can be used when running
the tests locally. These include:

* `APPIUM_TEST_SERVER_HOST` - set the host URL (default `127.0.0.1`)
* `APPIUM_TEST_SERVER_PORT` - set the host port (default `4567`)
* `DEVICE_NAME` - change the name of the device under test (default `emulator-5554`)
