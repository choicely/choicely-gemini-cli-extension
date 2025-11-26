import { DeviceListResult, InstallResult, LaunchResult, DeviceInfoResult, AppActionResult, AppLogsResult, ScreenshotResult } from '../schemas.js';
export declare function listConnectedDevices(): Promise<DeviceListResult>;
export declare function installApp(repoPath: string, deviceId?: string | null): Promise<InstallResult>;
export declare function launchApp(deviceId?: string | null): Promise<LaunchResult>;
export declare function getDeviceInfo(deviceId?: string | null): Promise<DeviceInfoResult>;
export declare function forceStopApp(deviceId?: string | null): Promise<AppActionResult>;
export declare function uninstallApp(deviceId?: string | null): Promise<AppActionResult>;
export declare function getAppLogs(deviceId?: string | null, lines?: number): Promise<AppLogsResult>;
export declare function takeScreenshot(deviceId?: string | null, outputPath?: string): Promise<ScreenshotResult>;
//# sourceMappingURL=device.d.ts.map