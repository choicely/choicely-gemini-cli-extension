import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { execa } from 'execa';
import { 
    ADB_TIMEOUT_SEC, 
    EMULATOR_LAUNCH_TIMEOUT_SEC, 
    EMULATOR_BOOT_TIMEOUT_SEC, 
    EMULATOR_POLL_INTERVAL_SEC 
} from '../constants.js';
import { getEnvironment, getPathKey } from '../environment.js';
import { adbDevices, findRunningEmulatorByAvd, isEmulatorBootCompleted } from './adb.js';
import { EmulatorLaunchResult, AVDListResult } from '../schemas.js';

/**
 * Locate the Android emulator executable.
 */
function resolveEmulatorBinary(): string {
  const env = getEnvironment(false, true); // require ANDROID_HOME
  const pathKey = getPathKey(env);
  const pathEnv = env[pathKey] || '';
  
  // Check PATH first
  const paths = pathEnv.split(path.delimiter);
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'emulator.exe' : 'emulator';

  for (const p of paths) {
    const candidate = path.join(p, binName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return path.resolve(candidate);
    }
  }

  // Check ANDROID_HOME/emulator/emulator
  const sdkCandidate = path.join(env['ANDROID_HOME']!, 'emulator', binName);
  if (fs.existsSync(sdkCandidate) && fs.statSync(sdkCandidate).isFile()) {
      return path.resolve(sdkCandidate);
  }

  throw new Error("Android emulator binary not found. Install the Android Emulator via Android Studio's SDK Manager.");
}

/**
 * Return the list of configured Android Virtual Devices (AVDs).
 */
async function listAvds(): Promise<string[]> {
  const env = getEnvironment(false, true);
  const emulatorPath = resolveEmulatorBinary();
  
  try {
    const { stdout } = await execa(emulatorPath, ['-list-avds'], {
        env,
        timeout: ADB_TIMEOUT_SEC * 1000,
    });
    
    return stdout.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
  } catch (error: any) {
    throw new Error(`Unable to list Android Virtual Devices. Details: ${error.stderr || error.message}`);
  }
}

export async function listAvailableAvds(): Promise<AVDListResult> {
  const avds = await listAvds();
  return {
      avds,
      count: avds.length,
      suggested_actions: avds.length === 0 
        ? ["Create an Android Virtual Device in Android Studio before retrying"] 
        : ["Call start_android_emulator with one of these AVD names"]
  };
}

async function waitForEmulatorDevice(
    existingSerials: Set<string>, 
    timeoutSec: number = EMULATOR_LAUNCH_TIMEOUT_SEC
): Promise<string> {
    const deadline = Date.now() + timeoutSec * 1000;
    
    while (Date.now() < deadline) {
        const devices = await adbDevices();
        for (const { id, status } of devices) {
            if (status === 'device' && id.startsWith('emulator-') && !existingSerials.has(id)) {
                return id;
            }
        }
        await new Promise(resolve => setTimeout(resolve, EMULATOR_POLL_INTERVAL_SEC * 1000));
    }
    
    throw new Error("Timed out waiting for emulator to appear in adb. Verify the AVD launches successfully in Android Studio.");
}

export async function startEmulator(
    avdName?: string | null,
    coldBoot = false,
    noWindow = false,
    bootTimeoutSec = EMULATOR_BOOT_TIMEOUT_SEC
): Promise<EmulatorLaunchResult> {
    if (bootTimeoutSec <= 0) {
        throw new Error("boot_timeout_sec must be positive.");
    }

    const env = getEnvironment(false, true);
    const emulatorPath = resolveEmulatorBinary();
    const availableAvds = await listAvds();

    if (availableAvds.length === 0) {
        throw new Error("No Android Virtual Devices configured. Use Android Studio's AVD Manager to create one.");
    }

    let targetAvd = avdName;
    if (targetAvd) {
        if (!availableAvds.includes(targetAvd)) {
            throw new Error(`AVD '${targetAvd}' not found. Available AVDs: ${availableAvds.join(', ')}`);
        }
    } else {
        targetAvd = availableAvds[0];
    }

    // Check if already running
    const runningDevice = await findRunningEmulatorByAvd(targetAvd!);
    if (runningDevice) {
        return {
            avd_name: targetAvd!,
            device_id: runningDevice,
            already_running: true,
            suggested_actions: [
                "Install the demo app with install_android_example_app",
                "Launch the demo app with launch_android_example_app"
            ]
        };
    }

    const devices = await adbDevices();
    const existingSerials = new Set(devices.map(d => d.id));

    const args = ['-avd', targetAvd!];
    if (coldBoot) args.push('-no-snapshot-load');
    if (noWindow) args.push('-no-window');

    try {
        const subprocess = spawn(emulatorPath, args, {
            env,
            detached: true,
            stdio: 'ignore'
        });
        subprocess.unref();

        const waitTimeout = Math.min(EMULATOR_LAUNCH_TIMEOUT_SEC, 30);
        let deviceId: string | undefined;
        try {
            deviceId = await waitForEmulatorDevice(existingSerials, waitTimeout);
        } catch (e) {
            // Ignored, might just be slow
        }

        return {
            avd_name: targetAvd!,
            device_id: deviceId,
            pid: subprocess.pid,
            already_running: false,
            suggested_actions: [
                "Install the demo app with install_android_example_app",
                "Launch the demo app with launch_android_example_app",
                "Use android_device_action(action='logs') if the app misbehaves"
            ]
        };

    } catch (error: any) {
        throw new Error(`Failed to start emulator process: ${error.message}`);
    }
}
//# sourceMappingURL=emulator.js.map