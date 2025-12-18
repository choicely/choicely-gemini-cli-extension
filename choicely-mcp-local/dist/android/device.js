import path from 'path';
import fs from 'fs';
import { CHOICELY_PACKAGE, INSTALL_TIMEOUT_SEC } from '../constants.js';
import { selectDevice, runAdbCommand, adbDevices } from './adb.js';
const RN_PACKAGE = 'com.choicely.sdk.rn.debug';
async function resolveInstalledPackage(device) {
    // Check default package first
    let res = await runAdbCommand(device, ["shell", "pm", "list", "packages", CHOICELY_PACKAGE]);
    if (res.stdout.includes(`package:${CHOICELY_PACKAGE}`))
        return CHOICELY_PACKAGE;
    // Check RN package
    res = await runAdbCommand(device, ["shell", "pm", "list", "packages", RN_PACKAGE]);
    if (res.stdout.includes(`package:${RN_PACKAGE}`))
        return RN_PACKAGE;
    return CHOICELY_PACKAGE; // Default to standard if neither found
}
export async function listConnectedDevices() {
    const devices = await adbDevices();
    const result = {
        devices,
        count: devices.length,
        suggested_actions: devices.length === 0
            ? ["Connect a device via USB or call start_android_emulator to boot an AVD"]
            : [
                "Use install_android_example_app with one of these device IDs",
                "Call android_device_action(action='info') for more hardware details",
            ]
    };
    return result;
}
export async function installApp(repoPath, deviceId) {
    let apkPath = path.join(repoPath, "Android", "Java", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
    let targetPackage = CHOICELY_PACKAGE;
    if (!fs.existsSync(apkPath)) {
        // Check React Native path
        const rnApkPath = path.join(repoPath, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
        if (fs.existsSync(rnApkPath)) {
            apkPath = rnApkPath;
            targetPackage = RN_PACKAGE;
        }
        else {
            throw new Error(`APK not found at ${apkPath} or ${rnApkPath}. Please run build_example_app first.`);
        }
    }
    const device = await selectDevice(deviceId);
    // Uninstall first
    try {
        const checkResult = await runAdbCommand(device, ["shell", "pm", "list", "packages", targetPackage]);
        if (checkResult.stdout.includes(targetPackage)) {
            await runAdbCommand(device, ["uninstall", targetPackage]);
        }
    }
    catch {
        // ignore errors during check/uninstall
    }
    // Install
    try {
        const installResult = await runAdbCommand(device, ["install", "-r", apkPath], INSTALL_TIMEOUT_SEC);
        if (installResult.exitCode !== 0) {
            const output = (installResult.stdout + installResult.stderr).trim();
            if (output.includes("INSTALL_FAILED_INSUFFICIENT_STORAGE")) {
                return {
                    status: "failed",
                    message: `Cannot install app: Insufficient storage on device ${device}.`,
                    suggested_actions: ["Uninstall unused apps"],
                    device_id: device,
                    package_name: targetPackage
                };
            }
            if (output.includes("INSTALL_FAILED_UPDATE_INCOMPATIBLE")) {
                return {
                    status: "failed",
                    message: `Cannot install app: Incompatible with existing version.`,
                    suggested_actions: ["Call uninstall_app first"],
                    device_id: device,
                    package_name: targetPackage
                };
            }
            return {
                status: "failed",
                message: `Installation failed: ${output}`,
                suggested_actions: ["Check USB debugging", "Try a different device"],
                device_id: device,
                package_name: targetPackage
            };
        }
        return {
            status: "success",
            message: `Successfully installed ${targetPackage} on device ${device}.`,
            suggested_actions: ["Call launch_app to start the app"],
            device_id: device,
            package_name: targetPackage
        };
    }
    catch (error) {
        throw new Error(`Unexpected error during installation: ${error.message}`);
    }
}
export async function launchApp(deviceId) {
    const device = await selectDevice(deviceId);
    const packageName = await resolveInstalledPackage(device);
    // Pre-flight check 1: Is installed?
    const checkResult = await runAdbCommand(device, ["shell", "pm", "list", "packages", packageName]);
    if (!checkResult.stdout.includes(packageName)) {
        return {
            status: "failed",
            message: `Cannot launch ${packageName} - app is not installed.`,
            suggested_actions: ["Call install_app first"],
            device_id: device
        };
    }
    // Pre-flight check 2: Is running?
    const pidResult = await runAdbCommand(device, ["shell", "pidof", "-s", packageName]);
    const isRunning = pidResult.exitCode === 0 && pidResult.stdout.trim().length > 0;
    if (isRunning) {
        const pid = pidResult.stdout.trim();
        return {
            status: "already_done",
            message: `App ${packageName} is already running (PID: ${pid}).`,
            suggested_actions: ["Call force_stop_app to restart it"],
            device_id: device,
            pid
        };
    }
    // Launch
    const launchResult = await runAdbCommand(device, [
        "shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"
    ]);
    if (launchResult.exitCode !== 0) {
        return {
            status: "failed",
            message: `Failed to launch app: ${launchResult.stderr}`,
            suggested_actions: ["Check logs", "Try uninstall/reinstall"],
            device_id: device
        };
    }
    // Verify
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pidVerify = await runAdbCommand(device, ["shell", "pidof", "-s", packageName]);
    const pid = pidVerify.exitCode === 0 ? pidVerify.stdout.trim() : undefined;
    return {
        status: "success",
        message: `Successfully launched ${packageName} on device ${device}` + (pid ? ` (PID: ${pid}).` : '.'),
        suggested_actions: ["Call take_screenshot", "Call get_app_logs"],
        device_id: device,
        pid
    };
}
export async function getDeviceInfo(deviceId) {
    const device = await selectDevice(deviceId);
    const props = { device_id: device };
    const propMap = {
        model: "ro.product.model",
        manufacturer: "ro.product.manufacturer",
        android_version: "ro.build.version.release",
        sdk_version: "ro.build.version.sdk",
        device: "ro.product.device",
        brand: "ro.product.brand",
    };
    for (const [key, prop] of Object.entries(propMap)) {
        const res = await runAdbCommand(device, ["shell", "getprop", prop]);
        if (res.exitCode === 0) {
            props[key] = res.stdout.trim();
        }
    }
    const sizeRes = await runAdbCommand(device, ["shell", "wm", "size"]);
    if (sizeRes.exitCode === 0) {
        const match = sizeRes.stdout.match(/Physical size: (\d+x\d+)/);
        if (match)
            props.screen_size = match[1];
    }
    props.suggested_actions = [
        "Install the latest build with install_android_example_app",
        "Capture logs with android_device_action(action='logs')"
    ];
    return props;
}
export async function forceStopApp(deviceId) {
    const device = await selectDevice(deviceId);
    // Check if running
    const pidResult = await runAdbCommand(device, ["shell", "pidof", "-s", CHOICELY_PACKAGE]);
    if (pidResult.exitCode !== 0 || !pidResult.stdout.trim()) {
        return {
            status: "already_done",
            message: `App ${CHOICELY_PACKAGE} is not running on device ${device}.`,
            suggested_actions: ["Call launch_app"],
            device_id: device,
            package_name: CHOICELY_PACKAGE
        };
    }
    const res = await runAdbCommand(device, ["shell", "am", "force-stop", CHOICELY_PACKAGE]);
    if (res.exitCode !== 0) {
        return {
            status: "failed",
            message: `Failed to force stop app: ${res.stderr}`,
            suggested_actions: ["Try again"],
            device_id: device,
            package_name: CHOICELY_PACKAGE
        };
    }
    return {
        status: "success",
        message: `Successfully stopped ${CHOICELY_PACKAGE}.`,
        suggested_actions: ["Call launch_app to restart"],
        device_id: device,
        package_name: CHOICELY_PACKAGE
    };
}
export async function uninstallApp(deviceId) {
    const device = await selectDevice(deviceId);
    const checkResult = await runAdbCommand(device, ["shell", "pm", "list", "packages", CHOICELY_PACKAGE]);
    if (!checkResult.stdout.includes(CHOICELY_PACKAGE)) {
        return {
            status: "already_done",
            message: `App ${CHOICELY_PACKAGE} is not installed.`,
            suggested_actions: [],
            device_id: device,
            package_name: CHOICELY_PACKAGE
        };
    }
    const res = await runAdbCommand(device, ["uninstall", CHOICELY_PACKAGE]);
    if (res.exitCode !== 0) {
        return {
            status: "failed",
            message: `Failed to uninstall: ${res.stderr || res.stdout}`,
            suggested_actions: ["Check permissions"],
            device_id: device,
            package_name: CHOICELY_PACKAGE
        };
    }
    return {
        status: "success",
        message: `Successfully uninstalled ${CHOICELY_PACKAGE}.`,
        suggested_actions: [],
        device_id: device,
        package_name: CHOICELY_PACKAGE
    };
}
export async function getAppLogs(deviceId, lines = 100) {
    const device = await selectDevice(deviceId);
    let result;
    // Try PID filtering
    try {
        const pidRes = await runAdbCommand(device, ["shell", "pidof", "-s", CHOICELY_PACKAGE]);
        if (pidRes.exitCode === 0 && pidRes.stdout.trim()) {
            const pid = pidRes.stdout.trim();
            result = await runAdbCommand(device, ["logcat", "--pid", pid, "-d", "-t", lines.toString()]);
        }
    }
    catch { }
    // Fallback to tags
    if (!result || result.exitCode !== 0 || !result.stdout.trim()) {
        result = await runAdbCommand(device, ["logcat", "-t", lines.toString(), "*:W", "Choicely:*", "SDK-DEMO:*"]);
    }
    const logs = result.stdout || "";
    const logLines = logs.trim().split(/\r?\n/);
    return {
        device_id: device,
        logs,
        line_count: logs.trim() ? logLines.length : 0,
        suggested_actions: ["Force stop and relaunch"]
    };
}
export async function takeScreenshot(deviceId, outputPath) {
    const device = await selectDevice(deviceId);
    if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
        outputPath = `screenshot_${device}_${timestamp}.png`;
    }
    // Enforce PNG extension if not present, since we aren't converting to JPEG
    if (!outputPath.toLowerCase().endsWith('.png')) {
        outputPath += '.png';
    }
    const devicePath = "/sdcard/screenshot.png";
    const absOutputPath = path.resolve(outputPath);
    await runAdbCommand(device, ["shell", "screencap", "-p", devicePath]);
    await runAdbCommand(device, ["pull", devicePath, absOutputPath]);
    await runAdbCommand(device, ["shell", "rm", devicePath]);
    return {
        device_id: device,
        screenshot_path: absOutputPath,
        suggested_actions: ["Collect logs if screenshot shows errors"]
    };
}
//# sourceMappingURL=device.js.map
//# sourceMappingURL=device.js.map