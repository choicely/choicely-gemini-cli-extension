/**
 * iOS Simulator management using simctl.
 *
 * This mirrors the Android emulator utilities to provide parity operations on iOS:
 * list/boot/install/launch/terminate/uninstall/openurl/screenshot/logs.
 */
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
import { SIMCTL_TIMEOUT_SEC, IOS_LOG_TIMEOUT_SEC } from '../constants.js';
/**
 * Run a simctl command.
 */
async function runSimctl(args, timeout = SIMCTL_TIMEOUT_SEC * 1000) {
    return execa('xcrun', ['simctl', ...args], {
        timeout,
        reject: false,
        env: process.env,
    });
}
/**
 * List available simulators via simctl, sorted by relevance.
 */
export async function listSimulators() {
    const result = await runSimctl(['list', 'devices', '--json']);
    if (result.exitCode !== 0) {
        const stderr = (result.stderr || result.stdout || '').trim();
        throw new Error(`Failed to list simulators: ${stderr}`);
    }
    const rawData = JSON.parse(result.stdout || '{}');
    const flatDevices = [];
    // Flatten the nested runtime structure
    for (const [runtime, devices] of Object.entries(rawData.devices || {})) {
        for (const d of devices) {
            flatDevices.push({
                ...d,
                runtime,
            });
        }
    }
    // Sort: Booted first, then most recently used
    flatDevices.sort((a, b) => {
        const aBooted = a.state === 'Booted' ? 1 : 0;
        const bBooted = b.state === 'Booted' ? 1 : 0;
        if (aBooted !== bBooted)
            return bBooted - aBooted;
        // Parse lastBootedAt timestamps
        const aTime = a.lastBootedAt ? new Date(a.lastBootedAt).getTime() : 0;
        const bTime = b.lastBootedAt ? new Date(b.lastBootedAt).getTime() : 0;
        return bTime - aTime;
    });
    return { devices: flatDevices, count: flatDevices.length };
}
/**
 * Boot a simulator by UDID and optionally wait until fully booted.
 */
export async function bootSimulator(udid, wait = true) {
    const boot = await runSimctl(['boot', udid]);
    // simctl boot returns non-zero if already booted
    if (boot.exitCode !== 0) {
        const stderr = boot.stderr || '';
        if (!stderr.includes('is already booted')) {
            throw new Error(stderr.trim() || boot.stdout?.trim() || 'Failed to boot simulator');
        }
    }
    if (wait) {
        const status = await runSimctl(['bootstatus', udid, '-b']);
        if (status.exitCode !== 0) {
            throw new Error((status.stderr || status.stdout || '').trim());
        }
    }
    // Open Simulator.app window
    try {
        await execa('open', ['-a', 'Simulator'], { reject: false });
    }
    catch {
        // Don't fail if opening window fails
    }
    return { device_id: udid, status: 'booted' };
}
/**
 * Install a simulator-built .app to a booted simulator.
 */
export async function installApp(udid, appPath) {
    if (!fs.existsSync(appPath)) {
        throw new Error(`.app not found at ${appPath}`);
    }
    // Try to extract bundle ID and uninstall existing version
    try {
        const infoPlistPath = path.join(appPath, 'Info.plist');
        if (fs.existsSync(infoPlistPath)) {
            // Simple plist parsing for bundle ID (works for XML plists)
            const content = fs.readFileSync(infoPlistPath, 'utf-8');
            const match = content.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
            if (match) {
                const bundleId = match[1];
                await runSimctl(['uninstall', udid, bundleId]);
            }
        }
    }
    catch {
        // Ignore uninstall errors
    }
    const result = await runSimctl(['install', udid, appPath]);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: [
                'Ensure the .app is built for iphonesimulator (not .ipa)',
                'Verify the simulator is booted',
            ],
            device_id: udid,
            package_name: '',
        };
    }
    return {
        status: 'success',
        message: `Installed app ${path.basename(appPath)} to simulator ${udid}`,
        suggested_actions: ['Launch the app via launch_app'],
        device_id: udid,
        package_name: '',
    };
}
/**
 * Launch an installed app by bundle id on a simulator.
 */
export async function launchApp(udid, bundleId, args) {
    const cmd = ['launch', udid, bundleId];
    if (args && args.length > 0) {
        cmd.push('--args', ...args);
    }
    const result = await runSimctl(cmd);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: ['Check that the app is installed', 'Check bundle identifier'],
            device_id: udid,
            pid: null,
        };
    }
    // Parse PID from output (format: "<bundle>: <pid>")
    let pid = null;
    const out = (result.stdout || '').trim();
    if (out.includes(':')) {
        const parts = out.split(':');
        if (parts.length >= 2) {
            pid = parts[1].trim();
        }
    }
    return {
        status: 'success',
        message: `Launched ${bundleId} on simulator ${udid}` + (pid ? ` (PID: ${pid})` : ''),
        suggested_actions: ['Open URL or capture screenshot'],
        device_id: udid,
        pid,
    };
}
/**
 * Terminate an app on the simulator.
 */
export async function terminateApp(udid, bundleId) {
    const result = await runSimctl(['terminate', udid, bundleId]);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: ['Verify bundle identifier', 'Ensure simulator is booted'],
            device_id: udid,
            package_name: bundleId,
        };
    }
    return {
        status: 'success',
        message: `Terminated ${bundleId} on simulator ${udid}`,
        suggested_actions: [],
        device_id: udid,
        package_name: bundleId,
    };
}
/**
 * Uninstall an app from the simulator.
 */
export async function uninstallApp(udid, bundleId) {
    // Check if installed first
    const listResult = await runSimctl(['listapps', udid]);
    let isInstalled = false;
    if (listResult.exitCode === 0) {
        try {
            const appsData = JSON.parse(listResult.stdout || '{}');
            isInstalled = bundleId in appsData;
        }
        catch {
            isInstalled = (listResult.stdout || '').toLowerCase().includes(bundleId.toLowerCase());
        }
    }
    if (!isInstalled) {
        return {
            status: 'already_done',
            message: `App ${bundleId} is not installed on simulator ${udid}. No action needed.`,
            suggested_actions: [],
            device_id: udid,
            package_name: bundleId,
        };
    }
    const result = await runSimctl(['uninstall', udid, bundleId]);
    if (result.exitCode !== 0) {
        return {
            status: 'failed',
            message: (result.stderr || result.stdout || '').trim(),
            suggested_actions: [
                'Verify simulator is booted',
                'Check bundle identifier is correct',
                'Try restarting the simulator',
            ],
            device_id: udid,
            package_name: bundleId,
        };
    }
    return {
        status: 'success',
        message: `Successfully uninstalled ${bundleId} from simulator ${udid}.`,
        suggested_actions: [],
        device_id: udid,
        package_name: bundleId,
    };
}
/**
 * Open a deep link/URL on the simulator.
 */
export async function openUrl(udid, url) {
    const result = await runSimctl(['openurl', udid, url]);
    if (result.exitCode !== 0) {
        throw new Error((result.stderr || result.stdout || '').trim());
    }
    return { device_id: udid, url };
}
/**
 * Capture a simulator screenshot.
 */
export async function takeScreenshot(udid, outputPath) {
    const dir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // Ensure .png extension (simctl outputs PNG)
    if (!outputPath.toLowerCase().endsWith('.png')) {
        outputPath = outputPath.replace(/\.[^.]+$/, '') + '.png';
    }
    const absPath = path.resolve(outputPath);
    const result = await runSimctl(['io', udid, 'screenshot', absPath]);
    if (result.exitCode !== 0) {
        throw new Error((result.stderr || result.stdout || '').trim());
    }
    return { device_id: udid, screenshot_path: absPath };
}
/**
 * Fetch recent logs for a process by bundle id from the simulator.
 */
export async function getLogs(udid, bundleId, last = '2m', maxLines = 200) {
    // Use process name from bundle id suffix
    const processName = bundleId.split('.').pop() || bundleId;
    const predicate = `process CONTAINS '${processName}'`;
    const result = await runSimctl(['spawn', udid, 'log', 'show', '--style', 'compact', '--last', last, '--predicate', predicate], IOS_LOG_TIMEOUT_SEC * 1000);
    if (result.exitCode !== 0) {
        throw new Error((result.stderr || result.stdout || '').trim());
    }
    let lines = (result.stdout || '').trim().split('\n');
    if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
    }
    return {
        device_id: udid,
        logs: lines.join('\n'),
        line_count: lines.length,
    };
}
/**
 * Shutdown the simulator device.
 */
export async function shutdownSimulator(udid) {
    const result = await runSimctl(['shutdown', udid]);
    if (result.exitCode !== 0) {
        throw new Error((result.stderr || result.stdout || '').trim());
    }
    return { device_id: udid, status: 'shutdown' };
}
/**
 * Return basic information about a simulator by UDID.
 */
export async function getDeviceInfo(udid) {
    const data = await listSimulators();
    for (const d of data.devices) {
        if (d.udid === udid) {
            return d;
        }
    }
    throw new Error(`Simulator with UDID ${udid} not found`);
}
//# sourceMappingURL=simulator.js.map