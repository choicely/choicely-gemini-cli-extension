/**
 * iOS device management (physical devices) using xcrun devicectl.
 *
 * Basic wrappers for listing devices and performing install/launch/terminate.
 * Note: Physical device installs require proper signing and Developer Mode.
 */
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
/**
 * Run a devicectl command.
 */
async function runDevicectl(args, timeout = 180000) {
    return execa('xcrun', ['devicectl', ...args], {
        timeout,
        reject: false,
        env: process.env,
    });
}
/**
 * List connected iOS devices using devicectl (Xcode 15+).
 */
export async function listConnectedDevices() {
    const result = await runDevicectl(['list', 'devices', '--columns', 'identifier,name,state']);
    if (result.exitCode !== 0) {
        const stderr = (result.stderr || result.stdout || '').trim();
        throw new Error(`Failed to list iOS devices: ${stderr}`);
    }
    const lines = (result.stdout || '').trim().split('\n');
    const devices = [];
    for (const line of lines) {
        if (!line || line.toLowerCase().includes('identifier'))
            continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const udid = parts[0];
            const state = parts[parts.length - 1];
            const name = parts.slice(1, -1).join(' ');
            const readableState = name ? `${state} (${name})` : state;
            devices.push({ id: udid, status: readableState });
        }
    }
    return { devices, count: devices.length };
}
/**
 * Install a signed .app to a physical device.
 */
export async function installApp(deviceUdid, appPath) {
    if (!fs.existsSync(appPath)) {
        throw new Error(`.app not found at ${appPath}`);
    }
    const result = await runDevicectl(['device', 'install', 'app', deviceUdid, appPath], 600000);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: [
                'Ensure the app is signed for device',
                'Enable Developer Mode on device',
                'Trust this Mac on device',
            ],
            device_id: deviceUdid,
            package_name: '',
        };
    }
    return {
        status: 'success',
        message: `Installed to device ${deviceUdid}`,
        suggested_actions: ['Launch the app via launch_app'],
        device_id: deviceUdid,
        package_name: '',
    };
}
/**
 * Launch an app on a physical device via devicectl.
 */
export async function launchApp(deviceUdid, bundleId, args) {
    const cmd = ['device', 'process', 'launch', deviceUdid, bundleId];
    if (args && args.length > 0) {
        cmd.push('--', ...args);
    }
    const result = await runDevicectl(cmd);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: ['Verify signing and bundle id', 'Ensure app is installed'],
            device_id: deviceUdid,
            pid: null,
        };
    }
    return {
        status: 'success',
        message: `Launched ${bundleId} on device ${deviceUdid}`,
        suggested_actions: [],
        device_id: deviceUdid,
        pid: null,
    };
}
/**
 * Terminate an app on a physical device.
 */
export async function terminateApp(deviceUdid, bundleId) {
    const result = await runDevicectl(['device', 'process', 'terminate', deviceUdid, bundleId]);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: ['Ensure app is running', 'Check bundle id'],
            device_id: deviceUdid,
            package_name: bundleId,
        };
    }
    return {
        status: 'success',
        message: `Terminated ${bundleId} on device ${deviceUdid}`,
        suggested_actions: [],
        device_id: deviceUdid,
        package_name: bundleId,
    };
}
/**
 * Uninstall an app from a physical device by bundle id.
 */
export async function uninstallApp(deviceUdid, bundleId) {
    const result = await runDevicectl(['device', 'uninstall', 'app', deviceUdid, bundleId], 600000);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: ['Ensure app is installed', 'Check bundle id'],
            device_id: deviceUdid,
            package_name: bundleId,
        };
    }
    return {
        status: 'success',
        message: `Uninstalled ${bundleId} from device ${deviceUdid}`,
        suggested_actions: [],
        device_id: deviceUdid,
        package_name: bundleId,
    };
}
/**
 * Fetch recent logs from a physical device via devicectl.
 */
export async function getDeviceLogs(deviceUdid, last = '2m', predicate, maxLines = 500) {
    const cmd = ['device', 'logs', deviceUdid, '--style', 'compact', '--last', last];
    if (predicate) {
        cmd.push('--predicate', predicate);
    }
    const result = await runDevicectl(cmd);
    if (result.exitCode !== 0) {
        throw new Error((result.stderr || result.stdout || '').trim());
    }
    let lines = (result.stdout || '').trim().split('\n');
    if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
    }
    return {
        device_id: deviceUdid,
        logs: lines.join('\n'),
        line_count: lines.length,
    };
}
/**
 * Capture a screenshot from a physical device via devicectl.
 */
export async function takeScreenshot(deviceUdid, outputPath) {
    const dir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const absPath = path.resolve(outputPath);
    const result = await runDevicectl(['device', 'screenshot', deviceUdid, absPath]);
    if (result.exitCode !== 0) {
        const stderr = (result.stderr || result.stdout || '').trim();
        throw new Error(`Failed to capture screenshot from device ${deviceUdid}: ${stderr}`);
    }
    return { device_id: deviceUdid, screenshot_path: absPath };
}
//# sourceMappingURL=device.js.map