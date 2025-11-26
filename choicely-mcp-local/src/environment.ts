import os from 'os';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { JAVA_HOME_TIMEOUT_SEC } from './constants.js';

/**
 * Build the environment object for Android build/adb commands.
 */
export function getEnvironment(
  requireJava = false,
  requireAndroidHome = false
): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const platform = process.platform;

  const javaHome = resolveJavaHome(platform);
  const pathKey = getPathKey(process.env);

  if (javaHome) {
    env['JAVA_HOME'] = javaHome;
  } else if (requireJava) {
    throw new Error(getJavaErrorMessage(platform));
  }

  const androidHome = resolveAndroidHome(platform);
  if (androidHome) {
    env['ANDROID_HOME'] = androidHome;
    // Set ANDROID_SDK_ROOT as fallback/alias if not already set
    if (!env['ANDROID_SDK_ROOT']) {
      env['ANDROID_SDK_ROOT'] = androidHome;
    }
  } else if (requireAndroidHome) {
    throw new Error(getAndroidErrorMessage(platform));
  }

  env[pathKey] = buildPath(javaHome, androidHome, env[pathKey] || '');
  return env;
}

export function getPathKey(env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === 'win32') {
    const key = Object.keys(env).find(k => k.toLowerCase() === 'path');
    if (key) return key;
  }
  return 'PATH';
}

function resolveJavaHome(platform: NodeJS.Platform): string | null {
  // 1. Check existing JAVA_HOME
  const existingJavaHome = normalizeExistingDir(process.env['JAVA_HOME']);

  // 2. OS-specific resolution
  let resolved: string | null = null;
  if (platform === 'darwin') {
    resolved = getMacosJavaHome();
  } else if (platform === 'linux') {
    resolved = getLinuxJavaHome();
  } else if (platform === 'win32') {
    resolved = getWindowsJavaHome();
  }

  // 3. Path derivation
  const pathJava = javaHomeFromPath();

  const candidates: Array<{ path: string; version: number }> = [];

  if (existingJavaHome) {
    candidates.push({ path: existingJavaHome, version: getJavaVersionFromPath(existingJavaHome) });
  }
  if (resolved) {
    candidates.push({ path: resolved, version: getJavaVersionFromPath(resolved) });
  }
  if (pathJava && !candidates.some((c) => c.path === pathJava)) {
    candidates.push({ path: pathJava, version: getJavaVersionFromPath(pathJava) });
  }

  if (candidates.length === 0) return null;

  // Prefer Java 11+, then newest
  const java11Plus = candidates.filter((c) => c.version >= 11);
  if (java11Plus.length > 0) {
    java11Plus.sort((a, b) => b.version - a.version);
    return java11Plus[0].path;
  }

  // Fallback to newest
  candidates.sort((a, b) => b.version - a.version);
  return candidates[0].path;
}

function getJavaVersionFromPath(javaHome: string): number {
  if (!javaHome) return 0;
  const name = path.basename(javaHome);

  // jdk-17, jdk-21
  if (name.startsWith('jdk-')) {
    const parts = name.split('-');
    if (parts[1]) {
      const ver = parseInt(parts[1].split('.')[0], 10);
      if (!isNaN(ver)) return ver;
    }
  }

  // jdk1.8
  if (name.startsWith('jdk1.')) {
    const parts = name.split('.');
    if (parts[1]) {
      const ver = parseInt(parts[1], 10);
      if (!isNaN(ver)) return ver;
    }
  }

  // extract numbers
  const numbers = name.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const ver = parseInt(numbers[0], 10);
    // Reasonable Java version check (8-25)
    if (ver >= 8 && ver <= 25) return ver;
  }

  return 0;
}

function getMacosJavaHome(): string | null {
  if (fs.existsSync('/usr/libexec/java_home')) {
    try {
      const output = execSync('/usr/libexec/java_home', {
        timeout: JAVA_HOME_TIMEOUT_SEC * 1000,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return output.trim();
    } catch {
      // ignore
    }
  }
  return null;
}

function getLinuxJavaHome(): string | null {
  const defaultJava = '/usr/lib/jvm/default-java';
  if (fs.existsSync(defaultJava)) return defaultJava;

  const jvmDir = '/usr/lib/jvm';
  if (!fs.existsSync(jvmDir)) return null;

  const candidates: Array<{ path: string; version: number }> = [];
  try {
    const entries = fs.readdirSync(jvmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && (entry.name.startsWith('java-') || entry.name.startsWith('jdk'))) {
        const fullPath = path.join(jvmDir, entry.name);
        const version = getJavaVersionFromPath(fullPath);
        if (version > 0) {
          candidates.push({ path: fullPath, version });
        }
      }
    }
  } catch {
    // ignore
  }

  if (candidates.length === 0) return null;

  const java11Plus = candidates.filter((c) => c.version >= 11);
  if (java11Plus.length > 0) {
    java11Plus.sort((a, b) => b.version - a.version);
    return java11Plus[0].path;
  }

  candidates.sort((a, b) => b.version - a.version);
  return candidates[0].path;
}

function getWindowsJavaHome(): string | null {
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const lookupRoots = [
    path.join(programFiles, 'Java'),
    path.join(programFiles, 'Eclipse Adoptium'),
    path.join(programFiles, 'Microsoft'),
    path.join(programFilesX86, 'Java'),
  ];

  const candidates: string[] = [];
  for (const root of lookupRoots) {
    candidates.push(...listJdkDirectories(root));
  }

  if (candidates.length === 0) return null;

  const candidatesWithVersion = candidates
    .map((c) => ({ path: c, version: getJavaVersionFromPath(c) }))
    .filter((c) => c.version > 0);

  if (candidatesWithVersion.length === 0) return null;

  const java11Plus = candidatesWithVersion.filter((c) => c.version >= 11);
  if (java11Plus.length > 0) {
    java11Plus.sort((a, b) => b.version - a.version);
    return java11Plus[0].path;
  }

  candidatesWithVersion.sort((a, b) => b.version - a.version);
  return candidatesWithVersion[0].path;
}

function listJdkDirectories(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name.toLowerCase().startsWith('jdk'))
      .map((e) => path.join(root, e.name));
  } catch {
    return [];
  }
}

function javaHomeFromPath(): string | null {
  // Simplified derivation: try to find 'java' on PATH and look up
  // Node doesn't have a built-in 'which', so we skip complex path walking for now
  // or rely on the other methods.
  // A robust implementation would scan PATH.
  return null;
}

function resolveAndroidHome(platform: NodeJS.Platform): string | null {
  const envHome = normalizeExistingDir(process.env['ANDROID_HOME'] || process.env['ANDROID_SDK_ROOT']);
  if (envHome) return envHome;

  let defaultPath: string | null = null;
  if (platform === 'darwin') {
    defaultPath = path.join(os.homedir(), 'Library/Android/sdk');
  } else if (platform === 'linux') {
    defaultPath = path.join(os.homedir(), 'Android/Sdk');
  } else if (platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');
    const p1 = path.join(localAppData, 'Android', 'Sdk');
    if (fs.existsSync(p1)) defaultPath = p1;
    else {
        const p2 = path.join(localAppData, 'Android', 'sdk');
        if (fs.existsSync(p2)) defaultPath = p2;
    }
  }

  if (defaultPath && fs.existsSync(defaultPath)) return defaultPath;
  
  // Fallback: derive from adb or emulator on PATH
  return androidHomeFromPath();
}

/**
 * Attempt to derive ANDROID_HOME from adb or emulator binaries on PATH.
 */
function androidHomeFromPath(): string | null {
  const pathKey = getPathKey(process.env);
  const pathEnv = process.env[pathKey] || '';
  const paths = pathEnv.split(path.delimiter);
  const isWin = process.platform === 'win32';

  // Look for adb in platform-tools or emulator in emulator directory
  const lookups: Array<{ binary: string; parent: string }> = [
    { binary: isWin ? 'adb.exe' : 'adb', parent: 'platform-tools' },
    { binary: isWin ? 'emulator.exe' : 'emulator', parent: 'emulator' },
  ];

  for (const { binary, parent } of lookups) {
    for (const p of paths) {
      const candidate = path.join(p, binary);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        // Check if the directory name matches expected parent
        if (path.basename(p) === parent) {
          const sdkRoot = path.dirname(p);
          if (fs.existsSync(sdkRoot) && fs.statSync(sdkRoot).isDirectory()) {
            return path.resolve(sdkRoot);
          }
        }
      }
    }
  }

  return null;
}

function normalizeExistingDir(p: string | undefined): string | null {
  if (!p) return null;
  const abs = path.resolve(path.normalize(p));
  return fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? abs : null;
}

function buildPath(javaHome: string | null, androidHome: string | null, existingPath: string): string {
  const entries: string[] = [];
  if (javaHome) entries.push(path.join(javaHome, 'bin'));
  if (androidHome) {
    entries.push(path.join(androidHome, 'platform-tools'));
    entries.push(path.join(androidHome, 'emulator'));
    entries.push(path.join(androidHome, 'tools'));
  }
  
  if (existingPath) entries.push(existingPath);
  return entries.join(path.delimiter);
}

function getJavaErrorMessage(platform: NodeJS.Platform): string {
  let msg = "JAVA_HOME environment variable is not set. Please set it to your Java JDK path.";
  if (platform === 'darwin') msg += " On macOS, try `/usr/libexec/java_home`.";
  else if (platform === 'linux') msg += " On Linux, typically /usr/lib/jvm/default-java or /usr/lib/jvm/java-21-openjdk.";
  else if (platform === 'win32') msg += " On Windows, typically C:\\Program Files\\Java\\jdk-21.";
  return msg;
}

function getAndroidErrorMessage(platform: NodeJS.Platform): string {
  let msg = "ANDROID_HOME/ANDROID_SDK_ROOT environment variable is not set. Please set it to your Android SDK path.";
  if (platform === 'darwin') msg += " Default: ~/Library/Android/sdk";
  else if (platform === 'linux') msg += " Default: ~/Android/Sdk";
  else if (platform === 'win32') msg += " Default: %LOCALAPPDATA%\\Android\\sdk";
  return msg;
}

