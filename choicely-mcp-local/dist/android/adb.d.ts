/**
 * Locate the Android ADB executable.
 */
export declare function resolveAdbBinary(): string;
export interface AdbDevice {
    id: string;
    status: string;
}
/**
 * Get list of all ADB devices.
 */
export declare function adbDevices(): Promise<AdbDevice[]>;
export declare function getConnectedDeviceIds(): Promise<string[]>;
/**
 * Select a device ID (provided or first available).
 */
export declare function selectDevice(deviceId?: string | null): Promise<string>;
/**
 * Run an ADB command on a specific device.
 */
export declare function runAdbCommand(deviceId: string, command: string[], timeout?: number, shell?: boolean): Promise<import("execa").Result<{
    env: NodeJS.ProcessEnv;
    timeout: number;
    shell: boolean;
    reject: false;
}>>;
export declare function queryEmulatorAvdName(deviceId: string): Promise<string | null>;
export declare function findRunningEmulatorByAvd(avdName: string): Promise<string | null>;
export declare function isEmulatorBootCompleted(deviceId: string): Promise<boolean>;
//# sourceMappingURL=adb.d.ts.map