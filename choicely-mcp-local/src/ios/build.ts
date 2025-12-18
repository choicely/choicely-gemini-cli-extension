/**
 * iOS build helpers using xcodebuild for iphonesimulator.
 * 
 * Parallels Android build flow to produce a simulator .app and return a
 * BuildResult-like dict for parity (apk_path contains the .app path).
 */

import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
import { IOS_BUILD_TIMEOUT_SEC } from '../constants.js';
import { BuildResult } from '../schemas.js';

/**
 * Best-effort resolution of Xcode project and default scheme.
 */
function resolveProjectAndScheme(repoPath: string): { project: string; scheme: string } {
  // Check standard RN path first or Native path
  const iosDirRN = path.join(repoPath, 'ios');
  const iosDirNative = path.join(repoPath, 'iOS');
  
  let iosDir = fs.existsSync(iosDirRN) ? iosDirRN : iosDirNative;

  // Demo repo layout suggests sdk-ios-demo.xcodeproj (Native)
  const proj = path.join(iosDir, 'sdk-ios-demo', 'sdk-ios-demo.xcodeproj');
  if (fs.existsSync(proj)) {
    return { project: proj, scheme: 'sdk-ios-demo' };
  }

  // Fallback: search any .xcworkspace (preferred for RN/Pods) or .xcodeproj
  const findXcodeContainer = (dir: string): string | null => {
    if (!fs.existsSync(dir)) return null;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    // Prefer workspace if exists (CocoaPods)
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.endsWith('.xcworkspace')) {
        return path.join(dir, entry.name);
      }
    }
    // Fallback to project
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.endsWith('.xcodeproj')) {
        return path.join(dir, entry.name);
      }
      if (entry.isDirectory()) {
         // simple shallow check to avoid deep traversal in node_modules
         if (entry.name !== 'node_modules' && entry.name !== 'Pods') {
             const nested = findXcodeContainer(path.join(dir, entry.name));
             if (nested) return nested;
         }
      }
    }
    return null;
  };

  const foundContainer = findXcodeContainer(iosDir);
  if (foundContainer) {
    const scheme = path.basename(foundContainer, path.extname(foundContainer));
    return { project: foundContainer, scheme };
  }

  throw new Error(`No Xcode project found under ${iosDir} or ${iosDirNative}`);
}

/**
 * Build the iOS demo app for iphonesimulator.
 */
export async function buildAppSimulator(
  repoPath: string,
  scheme?: string,
  configuration = 'Debug',
  destinationName = 'iPhone 17 Pro'
): Promise<BuildResult> {
  if (!fs.existsSync(repoPath)) {
    throw new Error(`Repository not found: ${repoPath}`);
  }

  // Detect React Native
  const packageJson = path.join(repoPath, 'package.json');
  const isRN = fs.existsSync(packageJson);

  if (isRN) {
    console.error('Detected React Native project. Installing dependencies...');
    try {
      await execa('npm', ['install'], { cwd: repoPath, timeout: 300000 });
      
      const iosDir = path.join(repoPath, 'ios');
      if (fs.existsSync(iosDir)) {
          console.error('Installing CocoaPods...');
          await execa('pod', ['install'], { cwd: iosDir, timeout: 300000 });
      }
    } catch (e: any) {
       return {
        status: 'failed',
        message: `Failed to install dependencies (npm/pod): ${e.message}`,
        suggested_actions: ['Ensure npm and CocoaPods are installed', 'Check network connection'],
        repo_path: repoPath,
      };
    }
  }

  const { project: projOrWs, scheme: defaultScheme } = resolveProjectAndScheme(repoPath);
  const buildScheme = scheme || defaultScheme;

  // Prepare DerivedData output
  const derivedData = path.join(repoPath, '.derivedData-ios-sim');
  if (fs.existsSync(derivedData)) {
    fs.rmSync(derivedData, { recursive: true, force: true });
  }
  fs.mkdirSync(derivedData, { recursive: true });

  // Determine whether it's a workspace or project
  const isWorkspace = projOrWs.endsWith('.xcworkspace');
  const isProject = projOrWs.endsWith('.xcodeproj');

  if (!isWorkspace && !isProject) {
    throw new Error(`Unsupported Xcode container: ${projOrWs}`);
  }

  const args = [
    'xcodebuild',
    isWorkspace ? '-workspace' : '-project',
    projOrWs,
    '-scheme',
    buildScheme,
    '-configuration',
    configuration,
    '-sdk',
    'iphonesimulator',
    '-destination',
    `platform=iOS Simulator,name=${destinationName}`,
    '-derivedDataPath',
    derivedData,
    'build',
  ];

  console.error(`Building iOS simulator app: xcrun ${args.join(' ')}`);

  try {
    const result = await execa('xcrun', args, {
      cwd: path.dirname(projOrWs),
      timeout: IOS_BUILD_TIMEOUT_SEC * 1000,
      reject: false,
      env: process.env,
    });

    if (result.exitCode !== 0) {
      const combined = (result.stderr || '') + '\n' + (result.stdout || '');
      return {
        status: 'failed',
        message: `Build failed (simulator).\n${combined.slice(-2000)}`,
        suggested_actions: [
          'Open the project in Xcode to accept prompts and resolve packages',
          'Install the required simulator runtime in Xcode',
          'Try a different destination_name that exists on your machine',
        ],
        repo_path: repoPath,
        apk_path: undefined,
      };
    }

    // Resolve .app path
    const productsDir = path.join(derivedData, 'Build', 'Products', `${configuration}-iphonesimulator`);
    let appPath: string | undefined;

    if (fs.existsSync(productsDir)) {
      const entries = fs.readdirSync(productsDir);
      for (const entry of entries) {
        if (entry.endsWith('.app')) {
          appPath = path.join(productsDir, entry);
          break;
        }
      }
    }

    if (appPath && fs.existsSync(appPath)) {
      return {
        status: 'success',
        message: `Successfully built simulator app at ${path.resolve(appPath)}.`,
        suggested_actions: ['Install to a booted simulator with install_ios_app'],
        repo_path: repoPath,
        apk_path: path.resolve(appPath),
      };
    }

    return {
      status: 'failed',
      message: 'Build completed but .app not found at expected location.',
      suggested_actions: [
        'Verify scheme and configuration',
        'Inspect DerivedData Build/Products for actual output',
      ],
      repo_path: repoPath,
      apk_path: undefined,
    };

  } catch (error: any) {
    if (error.timedOut) {
      return {
        status: 'failed',
        message: 'xcodebuild timed out building for simulator.',
        suggested_actions: [
          'Try building again',
          'Ensure Xcode command line tools are installed',
          'Open the project in Xcode to resolve signing/indexing then retry',
        ],
        repo_path: repoPath,
        apk_path: undefined,
      };
    }
    throw error;
  }
}

