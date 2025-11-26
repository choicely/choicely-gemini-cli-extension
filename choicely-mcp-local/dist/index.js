#!/usr/bin/env node
/**
 * Choicely MCP Local Server
 *
 * Exposes local tooling for Android/iOS build, install, launch, and device management.
 * This server is designed to run locally and provides tools that require access to
 * local SDKs, emulators, simulators, and connected devices.
 *
 * Key flows handled by this server:
 * 1. Demo app pipeline – fetch the SDK demo repo, build the Android/iOS binaries,
 *    install them to the selected target, and launch/diagnose with logs or screenshots.
 * 2. Device & emulator helpers – list/boot AVDs and simulators, capture device info,
 *    logs, and screenshots, manage running processes, and uninstall when cleanup is needed.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { CHOICELY_PACKAGE, CHOICELY_IOS_BUNDLE_ID, EMULATOR_BOOT_TIMEOUT_SEC, } from './constants.js';
// Android imports
import { listConnectedDevices as androidListDevices, installApp as androidInstallApp, launchApp as androidLaunchApp, getDeviceInfo as androidGetDeviceInfo, forceStopApp as androidForceStopApp, uninstallApp as androidUninstallApp, getAppLogs as androidGetAppLogs, takeScreenshot as androidTakeScreenshot, } from './android/device.js';
import { listAvailableAvds, startEmulator } from './android/emulator.js';
import { buildApp as androidBuildApp, setUpAppKey as setAndroidAppKey } from './android/build.js';
// iOS imports
import { listSimulators, bootSimulator, installApp as iosSimInstallApp, launchApp as iosSimLaunchApp, terminateApp as iosSimTerminateApp, uninstallApp as iosSimUninstallApp, takeScreenshot as iosSimTakeScreenshot, getLogs as iosSimGetLogs, } from './ios/simulator.js';
import { listConnectedDevices as iosListDevices, installApp as iosDeviceInstallApp, launchApp as iosDeviceLaunchApp, terminateApp as iosDeviceTerminateApp, uninstallApp as iosDeviceUninstallApp, takeScreenshot as iosDeviceTakeScreenshot, getDeviceLogs as iosDeviceGetLogs, } from './ios/device.js';
import { buildAppSimulator as iosBuildSimulator } from './ios/build.js';
import { setIOSAppKey } from './ios/index.js';
// Git imports
import { fetchExampleAppRepository } from './git.js';
// Schema imports
import { FetchRepoInputSchema, ConfigureAppKeyInputSchema, BuildAppInputSchema, InstallAppInputSchema, LaunchAppInputSchema, StartEmulatorInputSchema, AndroidDeviceActionInputSchema, IOSDeviceActionInputSchema, IOSBuildInputSchema, IOSInstallInputSchema, IOSLaunchInputSchema, } from './schemas.js';
const IS_MACOS = process.platform === 'darwin';
const DEFAULT_ANDROID_LOG_LINES = 200;
const DEFAULT_IOS_LOG_LAST = '2m';
const DEFAULT_IOS_LOG_LINES = 500;
/**
 * Get the current app key from environment.
 */
function getCurrentAppKey() {
    return process.env.CHOICELY_APP_KEY;
}
/**
 * Configure demo app keys for both Android and iOS after cloning.
 */
async function configureDemoAppKeys(repoPath) {
    const appKey = getCurrentAppKey();
    if (!appKey) {
        return false;
    }
    await logInfo({ event: 'app_key_autoconfigure_start', repo_path: repoPath });
    try {
        setAndroidAppKey(appKey, repoPath);
    }
    catch (error) {
        throw toolError(`Failed to configure Android demo with CHOICELY_APP_KEY: ${error.message}`);
    }
    if (IS_MACOS) {
        try {
            setIOSAppKey(appKey, repoPath);
        }
        catch (error) {
            throw toolError(`Configured Android demo but failed to update iOS demo with CHOICELY_APP_KEY: ${error.message}`);
        }
    }
    await logInfo({ event: 'app_key_autoconfigure_complete', repo_path: repoPath });
    return true;
}
// MCP Error codes (from JSON-RPC spec)
const ErrorCode = {
    InvalidRequest: -32600,
    MethodNotFound: -32601,
    InvalidParams: -32602,
    InternalError: -32603,
};
// Create MCP server
const server = new McpServer({
    name: 'choicely-local',
    version: '1.0.0',
});
/**
 * Helper to log info messages via MCP notifications.
 */
async function logInfo(message) {
    try {
        const text = typeof message === 'string' ? message : JSON.stringify(message);
        await server.server.sendLoggingMessage({ level: 'info', data: text });
    }
    catch {
        // Logging failures shouldn't break tool execution
        console.error('[log]', message);
    }
}
/**
 * Helper to create a tool error with proper MCP error code.
 */
function toolError(message, code = ErrorCode.InternalError) {
    return new McpError(code, message);
}
// ============================================================================
// Repository Tools
// ============================================================================
server.tool('fetch_example_app_repository', 'Fetch the Choicely example app repository to the specified directory. If not provided, clones into the current working directory.', FetchRepoInputSchema.shape, async ({ directory, overwrite }) => {
    await logInfo({ event: 'repo_clone_start', directory, overwrite });
    try {
        const result = await fetchExampleAppRepository(directory, overwrite);
        // Configure app keys if CHOICELY_APP_KEY is set
        const appKeyConfigured = await configureDemoAppKeys(result.repo_path);
        await logInfo({ event: 'clone_complete', repo_path: result.repo_path });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        ...result,
                        app_key_configured: appKeyConfigured,
                        suggested_actions: [
                            'Run build_android_example_app to produce the debug APK',
                            'Install the Android build or, on macOS, run build_ios_example_app',
                            'If you need a different app key, update CHOICELY_APP_KEY and clone again',
                        ],
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw toolError(`Failed to clone repository: ${error.message}`);
    }
});
server.tool('configure_app_key', 'Configure the Choicely app key in the demo app sources. This allows updating the app key without re-cloning the repository.', ConfigureAppKeyInputSchema.shape, async ({ app_key, repo_path }) => {
    await logInfo({ event: 'configure_app_key_start', repo_path });
    let androidConfigured = false;
    let iosConfigured = false;
    let androidFilePath;
    let iosFilePath;
    const errors = [];
    // Configure Android
    try {
        const androidResult = await setAndroidAppKey(app_key, repo_path);
        androidConfigured = true;
        androidFilePath = androidResult.file_path;
        await logInfo({ event: 'android_app_key_configured', file_path: androidFilePath });
    }
    catch (error) {
        errors.push(`Android: ${error.message}`);
        await logInfo({ event: 'android_app_key_failed', error: error.message });
    }
    // Configure iOS (if on macOS)
    if (IS_MACOS) {
        try {
            const iosResult = setIOSAppKey(app_key, repo_path);
            iosConfigured = true;
            iosFilePath = iosResult.file_path;
            await logInfo({ event: 'ios_app_key_configured', file_path: iosFilePath });
        }
        catch (error) {
            errors.push(`iOS: ${error.message}`);
            await logInfo({ event: 'ios_app_key_failed', error: error.message });
        }
    }
    const status = (androidConfigured || iosConfigured) ? 'success' : 'failed';
    let message = '';
    if (status === 'success') {
        const platforms = [];
        if (androidConfigured)
            platforms.push('Android');
        if (iosConfigured)
            platforms.push('iOS');
        message = `Successfully configured app key for ${platforms.join(' and ')}`;
        if (errors.length > 0) {
            message += `. Errors: ${errors.join('; ')}`;
        }
    }
    else {
        message = `Failed to configure app key: ${errors.join('; ')}`;
    }
    const result = {
        status,
        message,
        android_configured: androidConfigured,
        ios_configured: iosConfigured,
        android_file_path: androidFilePath,
        ios_file_path: iosFilePath,
        suggested_actions: status === 'success'
            ? ['Rebuild the app(s) to include the new app key', 'Reinstall and launch to test the changes']
            : ['Check the repository path is correct', 'Ensure the demo app sources match the expected template'],
    };
    await logInfo({ event: 'configure_app_key_complete', ...result });
    return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
    };
});
// ============================================================================
// Android Tools
// ============================================================================
server.tool('build_android_example_app', 'Build the Android demo app (debug).', BuildAppInputSchema.shape, async ({ repo_path }) => {
    await logInfo({ event: 'build_start', repo_path });
    try {
        const result = await androidBuildApp(repo_path);
        await logInfo({
            event: 'build_complete',
            status: result.status,
            apk_path: result.apk_path
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
        };
    }
    catch (error) {
        throw toolError(`Build failed: ${error.message}`);
    }
});
server.tool('install_android_example_app', 'Install the built Android APK to a connected device.', InstallAppInputSchema.shape, async ({ repo_path, device_id }) => {
    const targetMsg = device_id ? `device ${device_id}` : 'first available device';
    await logInfo(`Installing APK on ${targetMsg}`);
    try {
        const result = await androidInstallApp(repo_path, device_id);
        await logInfo({
            event: 'install_complete',
            device_id: result.device_id,
            package: result.package_name,
            status: result.status
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
        };
    }
    catch (error) {
        throw toolError(`Installation failed: ${error.message}`);
    }
});
server.tool('launch_android_example_app', `Launch the installed Android demo app (${CHOICELY_PACKAGE}).`, LaunchAppInputSchema.shape, async ({ device_id }) => {
    const targetMsg = device_id ? `device ${device_id}` : 'first available device';
    await logInfo(`Launching demo app on ${targetMsg}`);
    try {
        const result = await androidLaunchApp(device_id);
        await logInfo({
            event: 'launch_complete',
            device_id: result.device_id,
            status: result.status
        });
        return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
        };
    }
    catch (error) {
        throw toolError(`Launch failed: ${error.message}`);
    }
});
server.tool('list_android_connected_devices', 'List all connected Android devices and emulators.', {}, async () => {
    await logInfo('Listing connected Android devices');
    try {
        const result = await androidListDevices();
        await logInfo({ event: 'devices_listed', count: result.count, devices: result.devices });
        const suggestions = result.count === 0
            ? ['Connect a device via USB or call start_android_emulator to boot an AVD']
            : [
                'Use install_android_example_app with one of these device IDs',
                'Call android_device_action(action="info") for more hardware details',
            ];
        return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, suggested_actions: suggestions }) }],
        };
    }
    catch (error) {
        throw toolError(`Failed to list devices: ${error.message}`);
    }
});
server.tool('list_android_available_avds', 'List configured Android Virtual Devices (AVDs) from the local SDK.', {}, async () => {
    await logInfo('Listing available Android Virtual Devices');
    try {
        const result = await listAvailableAvds();
        await logInfo({ event: 'avds_listed', count: result.count });
        const suggestions = result.count === 0
            ? ['Create an Android Virtual Device in Android Studio before retrying']
            : ['Call start_android_emulator with one of these AVD names'];
        return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, suggested_actions: suggestions }) }],
        };
    }
    catch (error) {
        throw toolError(`Failed to list AVDs: ${error.message}`);
    }
});
server.tool('start_android_emulator', 'Start an Android emulator (AVD). Launches the specified AVD or defaults to the first available one.', StartEmulatorInputSchema.shape, async ({ avd_name }) => {
    await logInfo({ event: 'android_emulator_start_requested', avd_name });
    try {
        const result = await startEmulator(avd_name, false, false, EMULATOR_BOOT_TIMEOUT_SEC);
        // Add suggested actions matching Python implementation
        const suggestions = [
            'Install the demo app with install_android_example_app',
            'Launch the demo app with launch_android_example_app',
            "Use android_device_action(action='logs') if the app misbehaves",
        ];
        return {
            content: [{ type: 'text', text: JSON.stringify({ ...result, suggested_actions: suggestions }) }],
        };
    }
    catch (error) {
        throw toolError(`Failed to start emulator: ${error.message}`);
    }
});
// Helper for screenshot paths
function getDefaultScreenshotPath(deviceId, platform) {
    const cwd = process.cwd();
    const dir = path.join(cwd, 'screenshots');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const safeId = (deviceId || 'device').replace(/:/g, '_').replace(/\//g, '_');
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
    return path.join(dir, `choicely_${platform}_${safeId}_${timestamp}.png`);
}
server.tool('android_device_action', 'Run Android device diagnostics or maintenance tasks (info/logs/screenshot/force stop/uninstall) with defaults.', AndroidDeviceActionInputSchema.shape, async ({ action, device_id, lines, output_path }) => {
    await logInfo({
        event: 'android_device_action_requested',
        action,
        device_id
    });
    try {
        let result;
        switch (action) {
            case 'info':
                result = await androidGetDeviceInfo(device_id);
                result.suggested_actions = [
                    'Install the latest build with install_android_example_app',
                    "Capture logs with android_device_action(action='logs') if needed",
                ];
                break;
            case 'logs':
                const logLines = lines || DEFAULT_ANDROID_LOG_LINES;
                await logInfo(`Getting ${logLines} log lines from ${device_id || 'first available device'}`);
                result = await androidGetAppLogs(device_id, logLines);
                result.suggested_actions = [
                    'Force stop and relaunch before collecting another log set',
                    "Capture a screenshot with android_device_action(action='screenshot') if needed",
                ];
                break;
            case 'screenshot':
                const finalPath = output_path || getDefaultScreenshotPath(device_id, 'android');
                await logInfo(`Taking screenshot from ${device_id || 'first available device'}`);
                result = await androidTakeScreenshot(device_id, finalPath);
                result.suggested_actions = [
                    "Collect logs with android_device_action(action='logs') if errors appear",
                    'Relaunch the app after applying fixes',
                ];
                break;
            case 'force_stop':
                await logInfo(`Force stopping app on ${device_id || 'first available device'}`);
                result = await androidForceStopApp(device_id);
                break;
            case 'uninstall':
                await logInfo(`Uninstalling app from ${device_id || 'first available device'}`);
                result = await androidUninstallApp(device_id);
                break;
            default:
                throw toolError(`Unsupported Android device action: ${action}`, ErrorCode.InvalidParams);
        }
        return {
            content: [{ type: 'text', text: JSON.stringify({ action, response: result }) }],
        };
    }
    catch (error) {
        if (error instanceof McpError)
            throw error;
        throw toolError(`Android device action failed: ${error.message}`);
    }
});
// ============================================================================
// iOS Tools (macOS only)
// ============================================================================
if (IS_MACOS) {
    server.tool('build_ios_example_app', 'Build the Choicely iOS demo app for the iOS simulator.', IOSBuildInputSchema.shape, async ({ repo_path, scheme, configuration, destination_name }) => {
        await logInfo('Starting iOS simulator build');
        try {
            const result = await iosBuildSimulator(repo_path, scheme, configuration, destination_name || 'iPhone 17 Pro');
            await logInfo({
                event: 'ios_build_complete',
                status: result.status,
                app_path: result.apk_path
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
            };
        }
        catch (error) {
            throw toolError(`iOS build failed: ${error.message}`);
        }
    });
    server.tool('list_ios_targets', 'List available iOS targets (simulators and physical devices) in one call.', {}, async () => {
        await logInfo('Listing iOS simulators and devices');
        try {
            const simData = await listSimulators();
            const simDevices = simData.devices.map((d) => ({
                id: d.udid,
                status: `${d.state} (${d.name})`,
            }));
            let physDevices = [];
            try {
                const devData = await iosListDevices();
                physDevices = devData.devices;
            }
            catch {
                // devicectl might not be available
            }
            const allDevices = [...simDevices, ...physDevices];
            await logInfo({ event: 'ios_targets_listed', count: allDevices.length });
            const result = {
                devices: allDevices,
                count: allDevices.length,
                suggested_actions: allDevices.length === 0
                    ? [
                        'Create or boot a simulator in Xcode, or connect a physical device',
                        'Install the demo with install_ios_app once a target is available',
                    ]
                    : [
                        'Install the demo with install_ios_app',
                        'Launch the app with launch_ios_app',
                        'Use ios_device_action for logs/maintenance if issues appear',
                    ],
            };
            return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
            };
        }
        catch (error) {
            throw toolError(`Failed to list iOS targets: ${error.message}`);
        }
    });
    server.tool('boot_ios_simulator', 'Boot an iOS simulator by UDID.', {
        simulator_udid: z.string().describe("Simulator UDID or 'booted' to target the currently booted device"),
        wait_for_boot: z.boolean().default(true).describe('Wait until the simulator reports boot completion before returning'),
    }, async ({ simulator_udid, wait_for_boot }) => {
        await logInfo(`Booting simulator ${simulator_udid}`);
        try {
            const result = await bootSimulator(simulator_udid, wait_for_boot);
            await logInfo({ event: 'ios_simulator_booted', ...result });
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            ...result,
                            suggested_actions: [
                                'Install the latest build with install_ios_app',
                                'Launch the app via launch_ios_app once installation completes',
                            ],
                        }),
                    },
                ],
            };
        }
        catch (error) {
            throw toolError(`Failed to boot simulator: ${error.message}`);
        }
    });
    server.tool('install_ios_app', 'Install the .app build to a simulator or physical device (auto-detects target type).', IOSInstallInputSchema.shape, async ({ app_path, device_udid, bundle_id }) => {
        try {
            const target = await resolveIOSTarget(device_udid);
            const bundleIdToUse = bundle_id || CHOICELY_IOS_BUNDLE_ID;
            await logInfo({
                event: 'ios_install_requested',
                target: target.udid,
                target_type: target.type
            });
            let result;
            if (target.type === 'simulator') {
                result = await iosSimInstallApp(target.udid, app_path);
            }
            else {
                result = await iosDeviceInstallApp(target.udid, app_path);
            }
            result.device_id = target.udid;
            result.package_name = bundleIdToUse;
            await logInfo({
                event: 'ios_install_complete',
                target: target.udid,
                target_type: target.type,
                status: result.status
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
            };
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw toolError(`iOS install failed: ${error.message}`);
        }
    });
    server.tool('launch_ios_app', 'Launch the demo app on a simulator or physical device (auto-detects target type).', IOSLaunchInputSchema.shape, async ({ bundle_id, device_udid, launch_args }) => {
        try {
            const target = await resolveIOSTarget(device_udid);
            const bundleIdToUse = bundle_id || CHOICELY_IOS_BUNDLE_ID;
            await logInfo({
                event: 'ios_launch_requested',
                target: target.udid,
                target_type: target.type,
                bundle: bundleIdToUse
            });
            let result;
            if (target.type === 'simulator') {
                result = await iosSimLaunchApp(target.udid, bundleIdToUse, launch_args);
            }
            else {
                result = await iosDeviceLaunchApp(target.udid, bundleIdToUse, launch_args);
            }
            result.device_id = target.udid;
            return {
                content: [{ type: 'text', text: JSON.stringify(result) }],
            };
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw toolError(`iOS launch failed: ${error.message}`);
        }
    });
    server.tool('ios_device_action', 'Run iOS maintenance/diagnostics (logs/terminate/uninstall/screenshot) on a simulator or physical device. Auto-selects the target when not provided.', IOSDeviceActionInputSchema.shape, async ({ action, device_id, bundle_id, last, max_lines, output_path }) => {
        try {
            const target = await resolveIOSTarget(device_id);
            const bundleIdToUse = bundle_id || CHOICELY_IOS_BUNDLE_ID;
            await logInfo({
                event: 'ios_device_action_requested',
                action,
                device_id: target.udid,
                target_type: target.type
            });
            let result;
            switch (action) {
                case 'logs':
                    if (target.type === 'simulator') {
                        result = await iosSimGetLogs(target.udid, bundleIdToUse, last || DEFAULT_IOS_LOG_LAST, max_lines || DEFAULT_IOS_LOG_LINES);
                        result.suggested_actions = [
                            'Relaunch the app after applying fixes',
                            "Capture a screenshot with ios_device_action(action='screenshot') for visual context",
                        ];
                    }
                    else {
                        result = await iosDeviceGetLogs(target.udid, last || DEFAULT_IOS_LOG_LAST, undefined, max_lines || DEFAULT_IOS_LOG_LINES);
                        result.suggested_actions = [
                            'Relaunch the app after applying fixes',
                            'Reinstall the build if logs show crashes',
                        ];
                    }
                    break;
                case 'terminate':
                    if (target.type === 'simulator') {
                        result = await iosSimTerminateApp(target.udid, bundleIdToUse);
                    }
                    else {
                        result = await iosDeviceTerminateApp(target.udid, bundleIdToUse);
                    }
                    result.suggested_actions = [
                        'Launch the app again to verify termination effects',
                        "Collect logs with ios_device_action(action='logs') if issues persist",
                    ];
                    break;
                case 'uninstall':
                    if (target.type === 'simulator') {
                        result = await iosSimUninstallApp(target.udid, bundleIdToUse);
                    }
                    else {
                        result = await iosDeviceUninstallApp(target.udid, bundleIdToUse);
                    }
                    result.suggested_actions = [
                        'Reinstall the latest build before relaunching',
                        "Run ios_device_action(action='logs') if reinstall still fails",
                    ];
                    break;
                case 'screenshot':
                    const resolvedOutput = output_path || getDefaultScreenshotPath(target.udid, 'ios');
                    if (target.type === 'simulator') {
                        result = await iosSimTakeScreenshot(target.udid, resolvedOutput);
                    }
                    else {
                        result = await iosDeviceTakeScreenshot(target.udid, resolvedOutput);
                    }
                    result.suggested_actions = [
                        "Collect logs with ios_device_action(action='logs') if the screenshot shows errors",
                        'Relaunch the app after applying fixes',
                    ];
                    break;
                default:
                    throw toolError(`Unsupported iOS device action: ${action}`, ErrorCode.InvalidParams);
            }
            return {
                content: [{ type: 'text', text: JSON.stringify({ action, response: result }) }],
            };
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw toolError(`iOS device action failed: ${error.message}`);
        }
    });
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get all simulator UDIDs for quick lookup.
 */
async function getSimulatorUdids() {
    try {
        const simData = await listSimulators();
        return simData.devices.map((d) => d.udid);
    }
    catch {
        return [];
    }
}
/**
 * Resolve iOS target UDID and type (simulator or device).
 * Mirrors Python's resolve_ios_target logic.
 */
async function resolveIOSTarget(deviceUdid) {
    const sims = await getSimulatorUdids();
    // If specific UDID provided, determine its type
    if (deviceUdid) {
        const type = sims.includes(deviceUdid) ? 'simulator' : 'device';
        return { udid: deviceUdid, type };
    }
    // Auto-select: first available simulator (listSimulators already sorts by booted first)
    if (sims.length > 0) {
        return { udid: sims[0], type: 'simulator' };
    }
    // Try physical devices
    try {
        const devData = await iosListDevices();
        if (devData.devices.length > 0) {
            const firstDevice = devData.devices[0];
            const udid = firstDevice.id || firstDevice.udid || '';
            return { udid, type: 'device' };
        }
    }
    catch {
        // ignore
    }
    throw toolError('No iOS simulators or physical devices available.');
}
// ============================================================================
// Server Startup
// ============================================================================
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Choicely Local MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map