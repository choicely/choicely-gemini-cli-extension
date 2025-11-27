import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { spawn } from 'child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const TOOLS_DIR = path.join(PACKAGE_ROOT, 'tools');
// JDK download URLs (Java 21 LTS)
// See: https://www.oracle.com/java/technologies/downloads/#java21
const JDK_URLS = {
    'linux-x64': 'https://download.oracle.com/java/21/latest/jdk-21_linux-x64_bin.tar.gz',
    'linux-arm64': 'https://download.oracle.com/java/21/latest/jdk-21_linux-aarch64_bin.tar.gz',
    'darwin-arm64': 'https://download.oracle.com/java/21/latest/jdk-21_macos-aarch64_bin.tar.gz',
    'darwin-x64': 'https://download.oracle.com/java/21/latest/jdk-21_macos-x64_bin.tar.gz',
    'win32-x64': 'https://download.oracle.com/java/21/latest/jdk-21_windows-x64_bin.zip',
    // Windows ARM64 uses Microsoft Build of OpenJDK 21
    // Source: https://learn.microsoft.com/java/openjdk/download
    'win32-arm64': 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-aarch64.zip',
};
const ANDROID_CMDLINE_URLS = {
    'win32': 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip',
    'darwin': 'https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip',
    'linux': 'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip',
};
async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Handle Redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                if (response.headers.location) {
                    downloadFile(response.headers.location, dest)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            if (fs.existsSync(dest)) {
                fs.unlink(dest, () => { });
            }
            reject(err);
        });
    });
}
export async function installLocalDependencies(log = console.log) {
    if (!fs.existsSync(TOOLS_DIR)) {
        fs.mkdirSync(TOOLS_DIR, { recursive: true });
    }
    const platform = process.platform;
    const arch = process.arch;
    // 1. Install JDK
    const jdkKey = `${platform}-${arch}`;
    const jdkUrl = JDK_URLS[jdkKey];
    if (jdkUrl) {
        const jdkDir = path.join(TOOLS_DIR, 'jdk');
        if (!fs.existsSync(jdkDir)) {
            log(`Downloading JDK from ${jdkUrl}...`);
            const ext = jdkUrl.endsWith('.zip') ? '.zip' : '.tar.gz';
            const archivePath = path.join(TOOLS_DIR, `jdk${ext}`);
            await downloadFile(jdkUrl, archivePath);
            log('Extracting JDK...');
            if (ext === '.zip') {
                const zip = new AdmZip(archivePath);
                zip.extractAllTo(TOOLS_DIR, true);
                // Rename the extracted folder (e.g. jdk-25) to 'jdk'
                // Find the folder starting with jdk-
                const items = fs.readdirSync(TOOLS_DIR);
                const extractedJdk = items.find(i => i.startsWith('jdk-') && fs.statSync(path.join(TOOLS_DIR, i)).isDirectory());
                if (extractedJdk) {
                    fs.renameSync(path.join(TOOLS_DIR, extractedJdk), jdkDir);
                }
            }
            else {
                await tar.x({
                    file: archivePath,
                    cwd: TOOLS_DIR
                });
                // Rename the extracted folder
                const items = fs.readdirSync(TOOLS_DIR);
                const extractedJdk = items.find(i => i.startsWith('jdk-') && fs.statSync(path.join(TOOLS_DIR, i)).isDirectory());
                if (extractedJdk) {
                    fs.renameSync(path.join(TOOLS_DIR, extractedJdk), jdkDir);
                }
            }
            fs.unlinkSync(archivePath);
            log('JDK installed locally.');
        }
        else {
            log('Local JDK already exists.');
        }
    }
    else {
        log(`No JDK URL found for ${platform}-${arch}`);
    }
    // 2. Install Android Command Line Tools
    const cmdUrl = ANDROID_CMDLINE_URLS[platform];
    if (cmdUrl) {
        const sdkDir = path.join(TOOLS_DIR, 'android-sdk');
        if (!fs.existsSync(sdkDir)) {
            log(`Downloading Android Command Line Tools from ${cmdUrl}...`);
            const archivePath = path.join(TOOLS_DIR, 'cmdline-tools.zip');
            await downloadFile(cmdUrl, archivePath);
            log('Extracting Android Tools...');
            // Extract to android-sdk/cmdline-tools/latest
            // The zip contains 'cmdline-tools' folder usually, or just 'tools'
            const extractTemp = path.join(TOOLS_DIR, 'temp_android');
            fs.mkdirSync(extractTemp, { recursive: true });
            const zip = new AdmZip(archivePath);
            zip.extractAllTo(extractTemp, true);
            // Move to correct structure: android-sdk/cmdline-tools/latest
            const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools');
            fs.mkdirSync(cmdlineToolsDir, { recursive: true });
            // The zip usually has a 'cmdline-tools' root or direct contents. 
            // Google's zip usually extracts 'cmdline-tools' folder.
            const items = fs.readdirSync(extractTemp);
            if (items.includes('cmdline-tools')) {
                fs.renameSync(path.join(extractTemp, 'cmdline-tools'), path.join(cmdlineToolsDir, 'latest'));
            }
            else {
                // If flat or other name, move everything to latest
                fs.renameSync(extractTemp, path.join(cmdlineToolsDir, 'latest'));
            }
            fs.rmSync(extractTemp, { recursive: true, force: true });
            fs.unlinkSync(archivePath);
            log('Android Tools installed locally.');
            // 3. Accept Licenses & Install Platform Tools
            log('Installing platform-tools...');
            const sdkManagerBin = path.join(cmdlineToolsDir, 'latest', 'bin', platform === 'win32' ? 'sdkmanager.bat' : 'sdkmanager');
            if (platform !== 'win32') {
                fs.chmodSync(sdkManagerBin, 0o755);
            }
            // Set JAVA_HOME for sdkmanager to our local JDK
            const localJdk = path.join(TOOLS_DIR, 'jdk');
            let javaHome = localJdk;
            if (platform === 'darwin') {
                javaHome = path.join(localJdk, 'Contents', 'Home');
            }
            try {
                const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdkDir };
                // Helper to run sdkmanager and pipe 'y' to it continuously
                const runSdkManager = (args) => {
                    return new Promise((resolve, reject) => {
                        const isWin = process.platform === 'win32';
                        const proc = spawn(sdkManagerBin, args, {
                            env,
                            stdio: ['pipe', 'inherit', 'inherit'],
                            shell: isWin
                        });
                        // continuously feed 'y' to stdin to accept any prompts
                        const timer = setInterval(() => {
                            if (proc.stdin && !proc.stdin.destroyed) {
                                try {
                                    proc.stdin.write('y\n');
                                }
                                catch {
                                    // ignore write errors
                                }
                            }
                        }, 500);
                        proc.on('close', (code) => {
                            clearInterval(timer);
                            if (code === 0)
                                resolve();
                            else
                                reject(new Error(`sdkmanager failed with code ${code}`));
                        });
                        proc.on('error', (err) => {
                            clearInterval(timer);
                            reject(err);
                        });
                    });
                };
                // 1. Accept general licenses first
                log('Accepting licenses...');
                await runSdkManager(['--licenses']);
                // 2. Explicitly install the required packages
                // This prevents Gradle from trying (and failing) to do it later
                const requiredPackages = [
                    "platform-tools",
                    // "emulator", // Skipped to reduce download size (~400MB). Add back if local emulator hosting is required.
                    "build-tools;34.0.0", // CRITICAL: Matches typical compileSdkVersion 34
                    "platforms;android-34", // CRITICAL: The actual platform SDK
                    "extras;google;google_play_services"
                ];
                log('Installing required Android packages...');
                await runSdkManager(requiredPackages);
            }
            catch (e) {
                log(`Failed to run sdkmanager: ${e.message}`);
            }
        }
        else {
            log('Local Android SDK already exists.');
        }
    }
}
//# sourceMappingURL=installer.js.map