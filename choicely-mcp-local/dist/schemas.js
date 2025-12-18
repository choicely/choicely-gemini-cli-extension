import { z } from 'zod';
// ============================================================================
// Repository & Build Models
// ============================================================================
export const FetchRepoResultSchema = z.object({
    repo_path: z.string().describe("Absolute path to cloned repository root"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps to take after cloning"),
});
export const ConfigureAppKeyInputSchema = z.object({
    app_key: z.string().describe('Choicely app key to configure in demo apps'),
    repo_path: z.string().describe('Path to the choicely-sdk-demo repository'),
});
export const ConfigureAppKeyResultSchema = z.object({
    status: z.enum(['success', 'failed']),
    message: z.string(),
    android_configured: z.boolean(),
    ios_configured: z.boolean(),
    android_file_path: z.string().optional(),
    ios_file_path: z.string().optional(),
    suggested_actions: z.array(z.string()).optional(),
});
export const BuildResultSchema = z.object({
    status: z.enum(["success", "already_done", "failed"]).describe("Operation status"),
    message: z.string().describe("Human-readable explanation of the result"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps the agent can take"),
    repo_path: z.string().describe("Path to the repository root"),
    apk_path: z.string().optional().describe("Absolute path to the built APK (if successful)"),
});
// ============================================================================
// App Installation & Launch Models
// ============================================================================
export const InstallResultSchema = z.object({
    status: z.enum(["success", "already_done", "failed"]).describe("Operation status"),
    message: z.string().describe("Human-readable explanation of the result"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps the agent can take"),
    device_id: z.string().describe("ADB device ID used for installation"),
    package_name: z.string().describe("Package name"),
});
export const LaunchResultSchema = z.object({
    status: z.enum(["success", "already_done", "failed"]).describe("Operation status"),
    message: z.string().describe("Human-readable explanation of the result"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps the agent can take"),
    device_id: z.string().describe("ADB device ID the app was launched on"),
    pid: z.string().optional().describe("Process ID if app is running"),
});
// ============================================================================
// Device Management Models
// ============================================================================
export const DeviceListResultSchema = z.object({
    devices: z.array(z.object({
        id: z.string(),
        status: z.string()
    })).describe("List of connected Android devices with id/status"),
    count: z.number().describe("Total number of devices found"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps based on connected devices"),
});
export const DeviceInfoResultSchema = z.object({
    device_id: z.string().describe("Device ID"),
    model: z.string().optional().describe("Device model"),
    manufacturer: z.string().optional().describe("Manufacturer"),
    android_version: z.string().optional().describe("Android version"),
    sdk_version: z.string().optional().describe("SDK version"),
    device: z.string().optional().describe("Device codename"),
    brand: z.string().optional().describe("Brand"),
    screen_size: z.string().optional().describe("Screen size (e.g., '1080x1920')"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions"),
});
// ============================================================================
// Emulator Models
// ============================================================================
export const AVDListResultSchema = z.object({
    avds: z.array(z.string()).describe("Configured Android Virtual Devices"),
    count: z.number().describe("Number of available AVDs"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps (e.g., starting an emulator)"),
});
export const EmulatorLaunchResultSchema = z.object({
    avd_name: z.string().describe("Name of the Android Virtual Device"),
    device_id: z.string().optional().describe("ADB device serial if the emulator became visible"),
    pid: z.number().optional().describe("Emulator process ID when launched by this tool"),
    already_running: z.boolean().describe("True if the emulator was already running"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions"),
});
// ============================================================================
// iOS Simulator Models
// ============================================================================
export const SimulatorInfoSchema = z.object({
    device_id: z.string().describe("Simulator UDID"),
    name: z.string().optional().describe("Simulator display name"),
    state: z.string().optional().describe("Simulator state (e.g., Booted, Shutdown)"),
    isAvailable: z.boolean().optional().describe("True when runtime is installed and usable"),
    deviceTypeIdentifier: z.string().optional().describe("Internal device type identifier"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions for this simulator"),
});
export const SimulatorListResultSchema = z.object({
    simulators: z.array(SimulatorInfoSchema).describe("List of simulators (flattened across runtimes)"),
    count: z.number().describe("Total number of simulators discovered"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps after listing simulators"),
});
export const SimulatorStateResultSchema = z.object({
    device_id: z.string().describe("Simulator UDID"),
    status: z.string().describe("Simulator status string returned by simctl"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions"),
});
export const SimulatorOpenURLResultSchema = z.object({
    device_id: z.string().describe("Simulator UDID"),
    url: z.string().describe("URL that was requested to open"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions after opening the URL"),
});
// ============================================================================
// App Management Models
// ============================================================================
export const AppActionResultSchema = z.object({
    status: z.enum(["success", "already_done", "failed"]).describe("Operation status"),
    message: z.string().describe("Human-readable explanation of the result"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps the agent can take"),
    device_id: z.string().describe("Device ID where action was performed"),
    package_name: z.string().describe("Package name"),
});
export const AppLogsResultSchema = z.object({
    device_id: z.string().describe("Device ID"),
    logs: z.string().describe("Log content"),
    line_count: z.number().describe("Number of log lines retrieved"),
    suggested_actions: z.array(z.string()).default([]).describe("Next steps based on the collected logs"),
});
export const ScreenshotResultSchema = z.object({
    device_id: z.string().describe("Device ID"),
    screenshot_path: z.string().describe("Local path to saved screenshot"),
    suggested_actions: z.array(z.string()).default([]).describe("Recommended follow-up actions after capturing the screenshot"),
});
// ============================================================================
// Input Schemas
// ============================================================================
export const FetchRepoInputSchema = z.object({
    directory: z.string().optional().describe("Target directory to clone into; defaults to current working directory"),
    overwrite: z.boolean().default(false).describe("Set true to delete an existing clone before fetching"),
    template: z.enum(['native', 'react-native']).default('native').describe("Repository template to clone: 'native' (default) or 'react-native'"),
});
export const BuildAppInputSchema = z.object({
    repo_path: z.string().describe("Absolute path to the choicely-sdk-demo repository"),
});
export const InstallAppInputSchema = z.object({
    repo_path: z.string().describe("Absolute path to the choicely-sdk-demo repository"),
    device_id: z.string().optional().describe("Optional device ID to install to. If omitted, the first available device is used."),
});
export const LaunchAppInputSchema = z.object({
    device_id: z.string().optional().describe("Optional device ID to launch on. If omitted, the first available device is used."),
});
export const ListDevicesInputSchema = z.object({});
export const ListAVDsInputSchema = z.object({});
export const StartEmulatorInputSchema = z.object({
    avd_name: z.string().optional().describe("Optional AVD name. Defaults to the first available AVD."),
});
export const AndroidDeviceActionInputSchema = z.object({
    action: z.enum(["info", "logs", "screenshot", "force_stop", "uninstall"]).describe("Action to execute"),
    device_id: z.string().optional().describe("Optional device ID. Defaults to first available when omitted."),
    lines: z.number().min(1).max(1000).optional().describe("Number of log lines to return when action='logs'"),
    output_path: z.string().optional().describe("Optional screenshot path override when action='screenshot'"),
});
export const IOSDeviceActionInputSchema = z.object({
    action: z.enum(["logs", "terminate", "uninstall", "screenshot"]).describe("Action to execute"),
    device_id: z.string().optional().describe("Optional target UDID (simulator or device). Defaults to the first available."),
    bundle_id: z.string().optional().describe("Bundle identifier for terminate/uninstall. Defaults to the Choicely demo bundle id."),
    last: z.string().default("2m").describe("Time window for logs when action='logs' (e.g., '2m', '1h')"),
    max_lines: z.number().min(1).max(2000).default(500).describe("Maximum number of log lines to return when action='logs'"),
    output_path: z.string().optional().describe("Optional screenshot path override when action='screenshot'."),
});
export const IOSBuildInputSchema = z.object({
    repo_path: z.string().describe("Absolute path to the choicely-sdk-demo repository"),
    scheme: z.string().optional().describe("Optional Xcode scheme override for the build"),
    configuration: z.string().default("Debug").describe("Xcode build configuration to use (e.g., Debug, Release)"),
    destination_name: z.string().optional().describe("Optional simulator name for the build destination."),
});
export const IOSInstallInputSchema = z.object({
    app_path: z.string().describe("Path to the .app bundle (iphonesimulator or device-signed)"),
    device_udid: z.string().optional().describe("Optional target UDID. Defaults to first simulator, then first device."),
    bundle_id: z.string().optional().describe("Bundle identifier. Defaults to the Choicely demo bundle id."),
});
export const IOSLaunchInputSchema = z.object({
    bundle_id: z.string().optional().describe("Bundle identifier to launch. Defaults to the Choicely demo bundle id."),
    device_udid: z.string().optional().describe("Optional target UDID. Defaults to first simulator, then first device."),
    launch_args: z.array(z.string()).optional().describe("Optional process arguments"),
});
//# sourceMappingURL=schemas.js.map