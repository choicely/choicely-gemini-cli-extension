import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
import { BUILD_TIMEOUT_SEC } from '../constants.js';
import { getEnvironment } from '../environment.js';
/**
 * Write the provided Choicely app key into the demo application code.
 */
export async function setUpAppKey(appKey, repoPath) {
    // 1. Check for React Native XML config (choicely_config.xml)
    // This is the preferred method for the React Native template
    const rnXmlPath = path.join(repoPath, 'android', 'app', 'src', 'main', 'res', 'values', 'choicely_config.xml');
    if (fs.existsSync(rnXmlPath)) {
        let content = fs.readFileSync(rnXmlPath, 'utf-8');
        const pattern = /<string name="choicely_app_key">.*?<\/string>/;
        if (pattern.test(content)) {
            const newContent = content.replace(pattern, `<string name="choicely_app_key">${appKey}</string>`);
            fs.writeFileSync(rnXmlPath, newContent, 'utf-8');
            return { file_path: rnXmlPath };
        }
    }
    // 2. Fallback to Native path (MyApplication.java)
    let filePath = path.join(repoPath, 'Android', 'Java', 'app', 'src', 'main', 'java', 'com', 'choicely', 'sdk', 'demo', 'MyApplication.java');
    if (!fs.existsSync(filePath)) {
        // Try React Native paths (MainApplication.kt or .java) if XML update didn't happen
        const rnKtPath = path.join(repoPath, 'android', 'app', 'src', 'main', 'java', 'com', 'choicely', 'sdk', 'demo', 'MainApplication.kt');
        const rnJavaPath = path.join(repoPath, 'android', 'app', 'src', 'main', 'java', 'com', 'choicely', 'sdk', 'demo', 'MainApplication.java');
        const rnMyPath = path.join(repoPath, 'android', 'app', 'src', 'main', 'java', 'com', 'choicely', 'sdk', 'rn', 'MyApplication.java');
        if (fs.existsSync(rnKtPath)) {
            filePath = rnKtPath;
        }
        else if (fs.existsSync(rnJavaPath)) {
            filePath = rnJavaPath;
        }
        else if (fs.existsSync(rnMyPath)) {
            filePath = rnMyPath;
        }
        else {
            throw new Error(`File not found at ${filePath} (or React Native variants). Please make sure the path to the repository is correct.`);
        }
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    // Use a regular expression to find and replace the key
    // Supports optional semicolon (Kotlin) and strict semicolon (Java)
    const pattern = /ChoicelySDK\.init\(this, "[^"]*"\);?/;
    const match = content.match(pattern);
    const suffix = (match && match[0].endsWith(';')) ? ';' : '';
    const newContent = content.replace(pattern, `ChoicelySDK.init(this, "${appKey}")${suffix}`);
    if (newContent === content) {
        throw new Error("Could not locate ChoicelySDK.init(...) in application class. " +
            "Confirm the demo source matches the expected template.");
    }
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return { file_path: filePath };
}
/**
 * Build the Android demo application (debug APK).
 */
export async function buildApp(repoPath) {
    // Detect React Native
    const packageJson = path.join(repoPath, 'package.json');
    const isRN = fs.existsSync(packageJson);
    if (isRN) {
        console.error('Detected React Native project. Installing dependencies...');
        try {
            await execa('npm', ['install'], {
                cwd: repoPath,
                timeout: 300000, // 5 minutes
            });
        }
        catch (e) {
            return {
                status: 'failed',
                message: `Failed to install NPM dependencies: ${e.message}`,
                suggested_actions: ['Check network connection', 'Ensure node/npm is installed'],
                repo_path: repoPath,
            };
        }
    }
    let buildDir = path.join(repoPath, 'Android', 'Java');
    let apkRelativePath = path.join('app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (!fs.existsSync(buildDir)) {
        // Try React Native standard path
        const rnAndroidDir = path.join(repoPath, 'android');
        if (fs.existsSync(rnAndroidDir)) {
            buildDir = rnAndroidDir;
        }
        else {
            throw new Error(`Build directory not found: ${buildDir} or ${rnAndroidDir}`);
        }
    }
    const apkFullPath = path.join(buildDir, apkRelativePath);
    console.error(`Building Android app in ${buildDir}...`);
    let env;
    try {
        env = getEnvironment(true, true); // require JAVA_HOME and ANDROID_HOME
        // Ensure platform-tools is in PATH for tasks like adbReverseMetro which call 'adb' directly
        if (env.ANDROID_HOME) {
            const platformTools = path.join(env.ANDROID_HOME, 'platform-tools');
            const pathVar = process.platform === 'win32' ? 'Path' : 'PATH';
            env[pathVar] = `${platformTools}${path.delimiter}${env[pathVar] || ''}`;
        }
    }
    catch (error) {
        return {
            status: 'failed',
            message: error.message,
            suggested_actions: [
                'Install the required SDKs/tools',
                'Set JAVA_HOME and ANDROID_HOME in your environment or .env file',
            ],
            repo_path: repoPath,
            apk_path: undefined,
        };
    }
    // Use gradlew.bat on Windows, gradlew on Unix/Mac
    const isWin = process.platform === 'win32';
    const gradlewName = isWin ? 'gradlew.bat' : 'gradlew';
    const gradlewPath = path.join(buildDir, gradlewName);
    if (!fs.existsSync(gradlewPath)) {
        throw new Error(`${gradlewName} not found at ${gradlewPath}`);
    }
    try {
        let cmd = isWin ? gradlewPath : `./${gradlewName}`;
        if (isWin && cmd.includes(' ')) {
            cmd = `"${cmd}"`;
        }
        const args = ['assembleDebug'];
        // Skip adbReverseMetro for React Native builds to avoid build failures due to ADB connectivity issues.
        // The user can run 'adb reverse tcp:8081 tcp:8081' manually if needed for Metro.
        if (isRN) {
            args.push('-x', 'adbReverseMetro');
        }
        const result = await execa(cmd, args, {
            cwd: buildDir,
            timeout: BUILD_TIMEOUT_SEC * 1000,
            env,
            shell: isWin, // Windows .bat files need shell
            reject: false, // Don't throw on error
            stdin: 'ignore', // Don't wait for stdin
        });
        if (result.exitCode !== 0) {
            const stderr = result.stderr || '';
            const stdout = result.stdout || '';
            const combinedOutput = stderr + '\n' + stdout;
            const lowerOutput = combinedOutput.toLowerCase();
            // Parse specific Gradle/Android build errors
            if (lowerOutput.includes('unsupportedclassversionerror') ||
                lowerOutput.includes('unsupported class file major version')) {
                return {
                    status: 'failed',
                    message: 'Build failed: Java version mismatch. Gradle requires Java 21 or compatible version.',
                    suggested_actions: [
                        "Install Java 21 (e.g., 'brew install openjdk@21' on macOS)",
                        'Set JAVA_HOME to Java 21 installation',
                        "Check current Java version with 'java -version'",
                        'Update JAVA_HOME in .env file',
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            if (lowerOutput.includes('sdk location not found') || lowerOutput.includes('android_home')) {
                return {
                    status: 'failed',
                    message: 'Build failed: Android SDK not found. ANDROID_HOME environment variable must be set.',
                    suggested_actions: [
                        'Install Android Studio and SDK',
                        "Set ANDROID_HOME to SDK path (e.g., '~/Library/Android/sdk' on macOS)",
                        'Update ANDROID_HOME in .env file',
                        'Verify SDK installation at the path',
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            if (lowerOutput.includes('java_home') && lowerOutput.includes('not')) {
                return {
                    status: 'failed',
                    message: 'Build failed: JAVA_HOME environment variable is not set or invalid.',
                    suggested_actions: [
                        'Install JDK 21',
                        'Set JAVA_HOME to JDK installation path',
                        "On macOS, try '/usr/libexec/java_home' to find JDK path",
                        'Update JAVA_HOME in .env file',
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            if (lowerOutput.includes('could not resolve') || lowerOutput.includes('could not download')) {
                return {
                    status: 'failed',
                    message: 'Build failed: Could not resolve dependencies. Check network connection and repository access.',
                    suggested_actions: [
                        'Check internet connection',
                        'Try running build again (transient network issues)',
                        'Check if repositories are accessible',
                        "Clear Gradle cache: './gradlew clean'",
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            if (lowerOutput.includes('permission denied')) {
                return {
                    status: 'failed',
                    message: 'Build failed: Permission denied executing gradlew. Make gradlew executable.',
                    suggested_actions: [
                        `Run: chmod +x ${gradlewPath}`,
                        'Then retry build_app',
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            if (lowerOutput.includes('compilation failed') || lowerOutput.includes('error:')) {
                return {
                    status: 'failed',
                    message: 'Build failed: Code compilation errors. Check the source code for syntax errors.',
                    suggested_actions: [
                        'Review compiler errors in build output',
                        'Ensure source code is correct',
                        'Check if app key was set correctly with set_up_example_app_with_client_app_key',
                        'Try re-fetching repository if code is corrupted',
                    ],
                    repo_path: repoPath,
                    apk_path: undefined,
                };
            }
            // Generic build failure
            const errorLines = combinedOutput
                .split('\n')
                .filter((line) => line.toLowerCase().includes('error') || line.toLowerCase().includes('failed'));
            const errorContext = errorLines.slice(0, 3).join('\n') || 'See build logs for details';
            return {
                status: 'failed',
                message: `Build failed with return code ${result.exitCode}.\n${errorContext}`,
                suggested_actions: [
                    'Check build logs for specific errors',
                    'Verify JAVA_HOME and ANDROID_HOME are set correctly',
                    "Try './gradlew clean' and rebuild",
                    'Ensure all dependencies are available',
                ],
                repo_path: repoPath,
                apk_path: undefined,
            };
        }
        // Build succeeded, check for APK
        if (fs.existsSync(apkFullPath)) {
            const fullApkPath = path.resolve(apkFullPath);
            console.error(`Build successful: ${fullApkPath}`);
            return {
                status: 'success',
                message: `Successfully built APK at ${fullApkPath}.`,
                suggested_actions: ['Call install_app to install the APK on a device'],
                repo_path: repoPath,
                apk_path: fullApkPath,
            };
        }
        return {
            status: 'failed',
            message: 'Build completed but APK not found at expected location. This might indicate a build configuration issue.',
            suggested_actions: [
                'Check Gradle build configuration',
                "Verify build variant is 'debug'",
                "Try './gradlew clean assembleDebug'",
            ],
            repo_path: repoPath,
            apk_path: undefined,
        };
    }
    catch (error) {
        // Timeout handling
        if (error.timedOut) {
            return {
                status: 'failed',
                message: `Build timed out after ${BUILD_TIMEOUT_SEC} seconds. The build might be too complex or system is slow.`,
                suggested_actions: [
                    'Try building again',
                    'Check system resources',
                    'Increase BUILD_TIMEOUT_SEC if needed',
                ],
                repo_path: repoPath,
                apk_path: undefined,
            };
        }
        const errorMsg = `Unexpected error during build: ${error.message}`;
        console.error(errorMsg);
        throw error;
    }
}
//# sourceMappingURL=build.js.map