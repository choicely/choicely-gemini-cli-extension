/**
 * iOS device management (physical devices) using xcrun devicectl.
 *
 * Basic wrappers for listing devices and performing install/launch/terminate.
 * Note: Physical device installs require proper signing and Developer Mode.
 */
interface DeviceActionResult {
    status: 'success' | 'already_done' | 'failed';
    message: string;
    suggested_actions: string[];
    device_id: string;
    package_name?: string;
    pid?: string | null;
}
interface DeviceListResult {
    devices: Array<{
        id: string;
        status: string;
    }>;
    count: number;
}
interface LogsResult {
    device_id: string;
    logs: string;
    line_count: number;
}
interface ScreenshotResult {
    device_id: string;
    screenshot_path: string;
}
/**
 * List connected iOS devices using devicectl (Xcode 15+).
 */
export declare function listConnectedDevices(): Promise<DeviceListResult>;
/**
 * Install a signed .app to a physical device.
 */
export declare function installApp(deviceUdid: string, appPath: string): Promise<DeviceActionResult>;
/**
 * Launch an app on a physical device via devicectl.
 */
export declare function launchApp(deviceUdid: string, bundleId: string, args?: string[]): Promise<DeviceActionResult>;
/**
 * Terminate an app on a physical device.
 */
export declare function terminateApp(deviceUdid: string, bundleId: string): Promise<DeviceActionResult>;
/**
 * Uninstall an app from a physical device by bundle id.
 */
export declare function uninstallApp(deviceUdid: string, bundleId: string): Promise<DeviceActionResult>;
/**
 * Fetch recent logs from a physical device via devicectl.
 */
export declare function getDeviceLogs(deviceUdid: string, last?: string, predicate?: string, maxLines?: number): Promise<LogsResult>;
/**
 * Capture a screenshot from a physical device via devicectl.
 */
export declare function takeScreenshot(deviceUdid: string, outputPath: string): Promise<ScreenshotResult>;
export {};
//# sourceMappingURL=device.d.ts.map