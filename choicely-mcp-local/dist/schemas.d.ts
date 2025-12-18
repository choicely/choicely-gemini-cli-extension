import { z } from 'zod';
export declare const FetchRepoResultSchema: z.ZodObject<{
    repo_path: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    repo_path: string;
    suggested_actions: string[];
}, {
    repo_path: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const ConfigureAppKeyInputSchema: z.ZodObject<{
    app_key: z.ZodString;
    repo_path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    repo_path: string;
    app_key: string;
}, {
    repo_path: string;
    app_key: string;
}>;
export declare const ConfigureAppKeyResultSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "failed"]>;
    message: z.ZodString;
    android_configured: z.ZodBoolean;
    ios_configured: z.ZodBoolean;
    android_file_path: z.ZodOptional<z.ZodString>;
    ios_file_path: z.ZodOptional<z.ZodString>;
    suggested_actions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "success" | "failed";
    android_configured: boolean;
    ios_configured: boolean;
    suggested_actions?: string[] | undefined;
    android_file_path?: string | undefined;
    ios_file_path?: string | undefined;
}, {
    message: string;
    status: "success" | "failed";
    android_configured: boolean;
    ios_configured: boolean;
    suggested_actions?: string[] | undefined;
    android_file_path?: string | undefined;
    ios_file_path?: string | undefined;
}>;
export type ConfigureAppKeyInput = z.infer<typeof ConfigureAppKeyInputSchema>;
export type ConfigureAppKeyResult = z.infer<typeof ConfigureAppKeyResultSchema>;
export declare const BuildResultSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "already_done", "failed"]>;
    message: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    repo_path: z.ZodString;
    apk_path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    repo_path: string;
    status: "success" | "failed" | "already_done";
    suggested_actions: string[];
    apk_path?: string | undefined;
}, {
    message: string;
    repo_path: string;
    status: "success" | "failed" | "already_done";
    suggested_actions?: string[] | undefined;
    apk_path?: string | undefined;
}>;
export declare const InstallResultSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "already_done", "failed"]>;
    message: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    device_id: z.ZodString;
    package_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "success" | "failed" | "already_done";
    suggested_actions: string[];
    device_id: string;
    package_name: string;
}, {
    message: string;
    status: "success" | "failed" | "already_done";
    device_id: string;
    package_name: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const LaunchResultSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "already_done", "failed"]>;
    message: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    device_id: z.ZodString;
    pid: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "success" | "failed" | "already_done";
    suggested_actions: string[];
    device_id: string;
    pid?: string | undefined;
}, {
    message: string;
    status: "success" | "failed" | "already_done";
    device_id: string;
    pid?: string | undefined;
    suggested_actions?: string[] | undefined;
}>;
export declare const DeviceListResultSchema: z.ZodObject<{
    devices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        status: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        status: string;
    }, {
        id: string;
        status: string;
    }>, "many">;
    count: z.ZodNumber;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    devices: {
        id: string;
        status: string;
    }[];
    suggested_actions: string[];
    count: number;
}, {
    devices: {
        id: string;
        status: string;
    }[];
    count: number;
    suggested_actions?: string[] | undefined;
}>;
export declare const DeviceInfoResultSchema: z.ZodObject<{
    device_id: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    manufacturer: z.ZodOptional<z.ZodString>;
    android_version: z.ZodOptional<z.ZodString>;
    sdk_version: z.ZodOptional<z.ZodString>;
    device: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    screen_size: z.ZodOptional<z.ZodString>;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    device_id: string;
    device?: string | undefined;
    model?: string | undefined;
    manufacturer?: string | undefined;
    android_version?: string | undefined;
    sdk_version?: string | undefined;
    brand?: string | undefined;
    screen_size?: string | undefined;
}, {
    device_id: string;
    device?: string | undefined;
    suggested_actions?: string[] | undefined;
    model?: string | undefined;
    manufacturer?: string | undefined;
    android_version?: string | undefined;
    sdk_version?: string | undefined;
    brand?: string | undefined;
    screen_size?: string | undefined;
}>;
export declare const AVDListResultSchema: z.ZodObject<{
    avds: z.ZodArray<z.ZodString, "many">;
    count: z.ZodNumber;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    count: number;
    avds: string[];
}, {
    count: number;
    avds: string[];
    suggested_actions?: string[] | undefined;
}>;
export declare const EmulatorLaunchResultSchema: z.ZodObject<{
    avd_name: z.ZodString;
    device_id: z.ZodOptional<z.ZodString>;
    pid: z.ZodOptional<z.ZodNumber>;
    already_running: z.ZodBoolean;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    avd_name: string;
    already_running: boolean;
    pid?: number | undefined;
    device_id?: string | undefined;
}, {
    avd_name: string;
    already_running: boolean;
    pid?: number | undefined;
    suggested_actions?: string[] | undefined;
    device_id?: string | undefined;
}>;
export declare const SimulatorInfoSchema: z.ZodObject<{
    device_id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    isAvailable: z.ZodOptional<z.ZodBoolean>;
    deviceTypeIdentifier: z.ZodOptional<z.ZodString>;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    device_id: string;
    name?: string | undefined;
    state?: string | undefined;
    isAvailable?: boolean | undefined;
    deviceTypeIdentifier?: string | undefined;
}, {
    device_id: string;
    name?: string | undefined;
    suggested_actions?: string[] | undefined;
    state?: string | undefined;
    isAvailable?: boolean | undefined;
    deviceTypeIdentifier?: string | undefined;
}>;
export declare const SimulatorListResultSchema: z.ZodObject<{
    simulators: z.ZodArray<z.ZodObject<{
        device_id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        isAvailable: z.ZodOptional<z.ZodBoolean>;
        deviceTypeIdentifier: z.ZodOptional<z.ZodString>;
        suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        suggested_actions: string[];
        device_id: string;
        name?: string | undefined;
        state?: string | undefined;
        isAvailable?: boolean | undefined;
        deviceTypeIdentifier?: string | undefined;
    }, {
        device_id: string;
        name?: string | undefined;
        suggested_actions?: string[] | undefined;
        state?: string | undefined;
        isAvailable?: boolean | undefined;
        deviceTypeIdentifier?: string | undefined;
    }>, "many">;
    count: z.ZodNumber;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    count: number;
    simulators: {
        suggested_actions: string[];
        device_id: string;
        name?: string | undefined;
        state?: string | undefined;
        isAvailable?: boolean | undefined;
        deviceTypeIdentifier?: string | undefined;
    }[];
}, {
    count: number;
    simulators: {
        device_id: string;
        name?: string | undefined;
        suggested_actions?: string[] | undefined;
        state?: string | undefined;
        isAvailable?: boolean | undefined;
        deviceTypeIdentifier?: string | undefined;
    }[];
    suggested_actions?: string[] | undefined;
}>;
export declare const SimulatorStateResultSchema: z.ZodObject<{
    device_id: z.ZodString;
    status: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status: string;
    suggested_actions: string[];
    device_id: string;
}, {
    status: string;
    device_id: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const SimulatorOpenURLResultSchema: z.ZodObject<{
    device_id: z.ZodString;
    url: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    device_id: string;
    url: string;
}, {
    device_id: string;
    url: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const AppActionResultSchema: z.ZodObject<{
    status: z.ZodEnum<["success", "already_done", "failed"]>;
    message: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    device_id: z.ZodString;
    package_name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "success" | "failed" | "already_done";
    suggested_actions: string[];
    device_id: string;
    package_name: string;
}, {
    message: string;
    status: "success" | "failed" | "already_done";
    device_id: string;
    package_name: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const AppLogsResultSchema: z.ZodObject<{
    device_id: z.ZodString;
    logs: z.ZodString;
    line_count: z.ZodNumber;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    device_id: string;
    logs: string;
    line_count: number;
}, {
    device_id: string;
    logs: string;
    line_count: number;
    suggested_actions?: string[] | undefined;
}>;
export declare const ScreenshotResultSchema: z.ZodObject<{
    device_id: z.ZodString;
    screenshot_path: z.ZodString;
    suggested_actions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    suggested_actions: string[];
    device_id: string;
    screenshot_path: string;
}, {
    device_id: string;
    screenshot_path: string;
    suggested_actions?: string[] | undefined;
}>;
export declare const FetchRepoInputSchema: z.ZodObject<{
    directory: z.ZodOptional<z.ZodString>;
    overwrite: z.ZodDefault<z.ZodBoolean>;
    template: z.ZodDefault<z.ZodEnum<["native", "react-native"]>>;
}, "strip", z.ZodTypeAny, {
    overwrite: boolean;
    template: "native" | "react-native";
    directory?: string | undefined;
}, {
    directory?: string | undefined;
    overwrite?: boolean | undefined;
    template?: "native" | "react-native" | undefined;
}>;
export declare const BuildAppInputSchema: z.ZodObject<{
    repo_path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    repo_path: string;
}, {
    repo_path: string;
}>;
export declare const InstallAppInputSchema: z.ZodObject<{
    repo_path: z.ZodString;
    device_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    repo_path: string;
    device_id?: string | undefined;
}, {
    repo_path: string;
    device_id?: string | undefined;
}>;
export declare const LaunchAppInputSchema: z.ZodObject<{
    device_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    device_id?: string | undefined;
}, {
    device_id?: string | undefined;
}>;
export declare const ListDevicesInputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const ListAVDsInputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const StartEmulatorInputSchema: z.ZodObject<{
    avd_name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    avd_name?: string | undefined;
}, {
    avd_name?: string | undefined;
}>;
export declare const AndroidDeviceActionInputSchema: z.ZodObject<{
    action: z.ZodEnum<["info", "logs", "screenshot", "force_stop", "uninstall"]>;
    device_id: z.ZodOptional<z.ZodString>;
    lines: z.ZodOptional<z.ZodNumber>;
    output_path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "logs" | "info" | "screenshot" | "force_stop" | "uninstall";
    lines?: number | undefined;
    device_id?: string | undefined;
    output_path?: string | undefined;
}, {
    action: "logs" | "info" | "screenshot" | "force_stop" | "uninstall";
    lines?: number | undefined;
    device_id?: string | undefined;
    output_path?: string | undefined;
}>;
export declare const IOSDeviceActionInputSchema: z.ZodObject<{
    action: z.ZodEnum<["logs", "terminate", "uninstall", "screenshot"]>;
    device_id: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
    last: z.ZodDefault<z.ZodString>;
    max_lines: z.ZodDefault<z.ZodNumber>;
    output_path: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: "logs" | "screenshot" | "uninstall" | "terminate";
    last: string;
    max_lines: number;
    device_id?: string | undefined;
    output_path?: string | undefined;
    bundle_id?: string | undefined;
}, {
    action: "logs" | "screenshot" | "uninstall" | "terminate";
    device_id?: string | undefined;
    output_path?: string | undefined;
    bundle_id?: string | undefined;
    last?: string | undefined;
    max_lines?: number | undefined;
}>;
export declare const IOSBuildInputSchema: z.ZodObject<{
    repo_path: z.ZodString;
    scheme: z.ZodOptional<z.ZodString>;
    configuration: z.ZodDefault<z.ZodString>;
    destination_name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    repo_path: string;
    configuration: string;
    scheme?: string | undefined;
    destination_name?: string | undefined;
}, {
    repo_path: string;
    scheme?: string | undefined;
    configuration?: string | undefined;
    destination_name?: string | undefined;
}>;
export declare const IOSInstallInputSchema: z.ZodObject<{
    app_path: z.ZodString;
    device_udid: z.ZodOptional<z.ZodString>;
    bundle_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    app_path: string;
    bundle_id?: string | undefined;
    device_udid?: string | undefined;
}, {
    app_path: string;
    bundle_id?: string | undefined;
    device_udid?: string | undefined;
}>;
export declare const IOSLaunchInputSchema: z.ZodObject<{
    bundle_id: z.ZodOptional<z.ZodString>;
    device_udid: z.ZodOptional<z.ZodString>;
    launch_args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    bundle_id?: string | undefined;
    device_udid?: string | undefined;
    launch_args?: string[] | undefined;
}, {
    bundle_id?: string | undefined;
    device_udid?: string | undefined;
    launch_args?: string[] | undefined;
}>;
export type FetchRepoResult = z.infer<typeof FetchRepoResultSchema>;
export type BuildResult = z.infer<typeof BuildResultSchema>;
export type InstallResult = z.infer<typeof InstallResultSchema>;
export type LaunchResult = z.infer<typeof LaunchResultSchema>;
export type DeviceListResult = z.infer<typeof DeviceListResultSchema>;
export type DeviceInfoResult = z.infer<typeof DeviceInfoResultSchema>;
export type AVDListResult = z.infer<typeof AVDListResultSchema>;
export type EmulatorLaunchResult = z.infer<typeof EmulatorLaunchResultSchema>;
export type SimulatorInfo = z.infer<typeof SimulatorInfoSchema>;
export type SimulatorListResult = z.infer<typeof SimulatorListResultSchema>;
export type SimulatorStateResult = z.infer<typeof SimulatorStateResultSchema>;
export type AppActionResult = z.infer<typeof AppActionResultSchema>;
export type AppLogsResult = z.infer<typeof AppLogsResultSchema>;
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;
//# sourceMappingURL=schemas.d.ts.map