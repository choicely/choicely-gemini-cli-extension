// Configuration constants for mobile tooling
// ============================================================================
// Timeout Configurations (seconds)
// ============================================================================
export const BUILD_TIMEOUT_SEC = 900;
/** Maximum time to wait for Gradle build to complete. */
export const ADB_TIMEOUT_SEC = 60;
/** Default timeout for ADB commands. */
export const INSTALL_TIMEOUT_SEC = 300;
/** Maximum time to wait for APK installation. */
export const JAVA_HOME_TIMEOUT_SEC = 10;
/** Timeout for detecting JAVA_HOME on macOS. */
export const EMULATOR_LAUNCH_TIMEOUT_SEC = 120;
/** Maximum time to wait for emulator process to start. */
export const EMULATOR_BOOT_TIMEOUT_SEC = 300;
/** Maximum time to wait for emulator to finish booting. */
export const EMULATOR_POLL_INTERVAL_SEC = 5;
/** Interval between boot completion checks. */
export const IOS_BUILD_TIMEOUT_SEC = 900;
/** Maximum time to wait for xcodebuild to finish. */
export const SIMCTL_TIMEOUT_SEC = 60;
/** Default timeout for `xcrun simctl` commands. */
export const SIMULATOR_BOOT_TIMEOUT_SEC = 180;
/** Maximum time to wait for a simulator to report boot completion. */
export const IOS_LOG_TIMEOUT_SEC = 30;
/** Timeout when fetching simulator logs. */
// ============================================================================
// Application Configuration
// ============================================================================
export const CHOICELY_PACKAGE = "com.choicely.sdk.demo";
/** Android package name for the Choicely SDK demo app. */
export const CHOICELY_IOS_BUNDLE_ID = "com.choicely.sdk-ios-demo";
/** Bundle identifier for the Choicely iOS demo app. */
export const CHOICELY_IOS_SCHEME = "sdk-ios-demo";
/** Default Xcode scheme for building the Choicely iOS demo app. */
// ============================================================================
// Logging Configuration
// ============================================================================
export const DEFAULT_LOG_LEVEL = "WARNING";
/** Default logging level for the tools. */
//# sourceMappingURL=constants.js.map