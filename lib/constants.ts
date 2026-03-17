export const VERBOSITY = {
  DEBUG: 'debug',
  TRACE: 'trace',
} as const;

/**
 * Insecure feature flag name which must be enabled on the Appium server
 * in order to use the `geckodriverExecutable` capability.
 *
 * Note: when starting the Appium server, this feature must be referenced
 * with the automation name prefix (for example
 * `--allow-insecure gecko:custom_geckodriver_executable`).
 */
export const INSECURE_FEAT_CUSTOM_GECKODRIVER_EXECUTABLE = 'custom_geckodriver_executable' as const;
