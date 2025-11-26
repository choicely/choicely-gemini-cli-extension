/**
 * iOS Simulator management using simctl.
 *
 * This mirrors the Android emulator utilities to provide parity operations on iOS:
 * list/boot/install/launch/terminate/uninstall/openurl/screenshot/logs.
 */
interface SimctlDevice {
    udid: string;
    name: string;
    state: string;
    isAvailable?: boolean;
    deviceTypeIdentifier?: string;
    lastBootedAt?: string;
    runtime?: string;
}
interface SimulatorListResult {
    devices: SimctlDevice[];
    count: number;
}
interface SimulatorActionResult {
    status: 'success' | 'already_done' | 'failed';
    message: string;
    suggested_actions: string[];
    device_id: string;
    package_name?: string;
    pid?: string | null;
}
interface ScreenshotResult {
    device_id: string;
    screenshot_path: string;
}
interface LogsResult {
    device_id: string;
    logs: string;
    line_count: number;
}
/**
 * List available simulators via simctl, sorted by relevance.
 */
export declare function listSimulators(): Promise<SimulatorListResult>;
/**
 * Boot a simulator by UDID and optionally wait until fully booted.
 */
export declare function bootSimulator(udid: string, wait?: boolean): Promise<{
    device_id: string;
    status: string;
}>;
/**
 * Install a simulator-built .app to a booted simulator.
 */
export declare function installApp(udid: string, appPath: string): Promise<SimulatorActionResult>;
/**
 * Launch an installed app by bundle id on a simulator.
 */
export declare function launchApp(udid: string, bundleId: string, args?: string[]): Promise<SimulatorActionResult>;
/**
 * Terminate an app on the simulator.
 */
export declare function terminateApp(udid: string, bundleId: string): Promise<SimulatorActionResult>;
/**
 * Uninstall an app from the simulator.
 */
export declare function uninstallApp(udid: string, bundleId: string): Promise<SimulatorActionResult>;
/**
 * Open a deep link/URL on the simulator.
 */
export declare function openUrl(udid: string, url: string): Promise<{
    device_id: string;
    url: string;
}>;
/**
 * Capture a simulator screenshot.
 */
export declare function takeScreenshot(udid: string, outputPath: string): Promise<ScreenshotResult>;
/**
 * Fetch recent logs for a process by bundle id from the simulator.
 */
export declare function getLogs(udid: string, bundleId: string, last?: string, maxLines?: number): Promise<LogsResult>;
/**
 * Shutdown the simulator device.
 */
export declare function shutdownSimulator(udid: string): Promise<{
    device_id: string;
    status: string;
}>;
/**
 * Return basic information about a simulator by UDID.
 */
export declare function getDeviceInfo(udid: string): Promise<SimctlDevice>;
export {};
//# sourceMappingURL=simulator.d.ts.map