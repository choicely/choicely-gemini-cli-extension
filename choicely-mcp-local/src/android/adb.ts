import { execa } from 'execa';
import { ADB_TIMEOUT_SEC } from '../constants.js';
import { getEnvironment, getPathKey } from '../environment.js';
import path from 'path';
import fs from 'fs';

/**
 * Locate the Android ADB executable.
 */
export function resolveAdbBinary(): string {
  const env = getEnvironment();
  
  // 1. Check PATH
  const pathKey = getPathKey(env);
  const adbFromPath = whichAdb(env[pathKey] || '');
  if (adbFromPath) return adbFromPath;

  // 2. Check ANDROID_HOME (implicit)
  let sdkAdb = adbFromSdk(env['ANDROID_HOME']);
  if (sdkAdb) return sdkAdb;

  // 3. Require ANDROID_HOME
  try {
    const envWithSdk = getEnvironment(false, true);
    sdkAdb = adbFromSdk(envWithSdk['ANDROID_HOME']);
    if (sdkAdb) return sdkAdb;
  } catch (error) {
    throw new Error("Android SDK not found. Please install the SDK or set ANDROID_HOME/ANDROID_SDK_ROOT.");
  }

  throw new Error("Android ADB binary not found. Install Android Platform Tools via Android Studio's SDK Manager.");
}

function whichAdb(pathEnv: string): string | null {
  const isWin = process.platform === 'win32';
  const candidates = isWin ? ['adb.exe', 'adb'] : ['adb'];
  const paths = pathEnv.split(path.delimiter);

  for (const p of paths) {
    for (const bin of candidates) {
      const full = path.join(p, bin);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) { // Check file, not just existence
         // In Node we don't easily check X_OK on Windows without ACLs, but checking file is usually enough
         return path.resolve(full);
      }
    }
  }
  return null;
}

function adbFromSdk(androidHome?: string): string | null {
  if (!androidHome) return null;
  const isWin = process.platform === 'win32';
  const executable = isWin ? 'adb.exe' : 'adb';
  const candidate = path.join(androidHome, 'platform-tools', executable);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return path.resolve(candidate);
  }
  return null;
}

export interface AdbDevice {
  id: string;
  status: string;
}

/**
 * Get list of all ADB devices.
 */
export async function adbDevices(): Promise<AdbDevice[]> {
  const env = getEnvironment();
  const adbPath = resolveAdbBinary();
  
  try {
    const { stdout } = await execa(adbPath, ['devices'], {
      env,
      timeout: ADB_TIMEOUT_SEC * 1000,
    });
    
    const devices: AdbDevice[] = [];
    const lines = stdout.trim().split(/\r?\n/);
    // Skip first line "List of devices attached"
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        devices.push({ id: parts[0].trim(), status: parts[1].trim() });
      }
    }
    return devices;
  } catch (error: any) {
    throw new Error(`Error checking for adb devices. Ensure adb is installed and in PATH. Details: ${error.stderr || error.message}`);
  }
}

export async function getConnectedDeviceIds(): Promise<string[]> {
  const devices = await adbDevices();
  return devices.filter(d => d.status === 'device').map(d => d.id);
}

/**
 * Select a device ID (provided or first available).
 */
export async function selectDevice(deviceId?: string | null): Promise<string> {
  const deviceIds = await getConnectedDeviceIds();

  if (deviceIds.length === 0) {
    throw new Error("No Android devices connected. Please connect a device or start an emulator.");
  }

  if (deviceId) {
    if (!deviceIds.includes(deviceId)) {
      throw new Error(`Device '${deviceId}' not found. Available devices: ${deviceIds.join(', ')}`);
    }
    return deviceId;
  }

  return deviceIds[0];
}

/**
 * Run an ADB command on a specific device.
 */
export async function runAdbCommand(
  deviceId: string,
  command: string[],
  timeout = ADB_TIMEOUT_SEC,
  shell = false
) {
  const env = getEnvironment();
  const adbPath = resolveAdbBinary();
  const args = ['-s', deviceId, ...command];

  // execa doesn't handle 'shell=true' in the same way as python subprocess for arbitrary command strings
  // but if 'command' is array of args, it's fine.
  // The python code used shell=True sometimes? The port should be careful.
  // In `tools/android/build.py` it was used with a string command.
  // In `run_adb_command` in python, `command` arg is `list[str]`.
  // So we pass args array to execa.

  let file = adbPath;
  if (shell && file.includes(' ')) {
    file = `"${file}"`;
  }

  return execa(file, args, {
    env,
    timeout: timeout * 1000,
    shell, // Use shell option if requested (rarely needed if args are passed correctly)
    reject: false // Don't throw on error, return result so caller can check exit code
  });
}

export async function queryEmulatorAvdName(deviceId: string): Promise<string | null> {
  const env = getEnvironment();
  const adbPath = resolveAdbBinary();
  
  try {
    const { stdout, exitCode } = await execa(adbPath, ['-s', deviceId, 'shell', 'getprop', 'ro.boot.qemu.avd_name'], {
      env,
      timeout: ADB_TIMEOUT_SEC * 1000,
      reject: false
    });

    if (exitCode === 0) {
      const value = stdout.trim();
      return value || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function findRunningEmulatorByAvd(avdName: string): Promise<string | null> {
  const devices = await adbDevices();
  for (const { id, status } of devices) {
    if (id.startsWith('emulator-') && status === 'device') {
      const runningName = await queryEmulatorAvdName(id);
      if (runningName === avdName) return id;
    }
  }
  return null;
}

export async function isEmulatorBootCompleted(deviceId: string): Promise<boolean> {
  const env = getEnvironment();
  const adbPath = resolveAdbBinary();
  
  try {
    const { stdout, exitCode } = await execa(adbPath, ['-s', deviceId, 'shell', 'getprop', 'sys.boot_completed'], {
      env,
      timeout: ADB_TIMEOUT_SEC * 1000,
      reject: false
    });

    if (exitCode === 0) {
      return stdout.trim() === '1';
    }
  } catch {
    // ignore
  }
  return false;
}
//# sourceMappingURL=adb.js.map