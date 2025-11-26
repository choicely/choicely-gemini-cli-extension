import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const TOOLS_DIR = path.join(PACKAGE_ROOT, 'tools');

const JDK_URLS = {
  'linux-x64': 'https://download.oracle.com/java/25/latest/jdk-25_linux-x64_bin.tar.gz',
  'darwin-arm64': 'https://download.oracle.com/java/25/latest/jdk-25_macos-aarch64_bin.tar.gz',
  'win32-x64': 'https://download.oracle.com/java/25/latest/jdk-25_windows-x64_bin.zip',
};

const ANDROID_CMDLINE_URLS = {
  'win32': 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip',
  'darwin': 'https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip',
  'linux': 'https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip',
};

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

export async function installLocalDependencies() {
  if (!fs.existsSync(TOOLS_DIR)) {
    fs.mkdirSync(TOOLS_DIR, { recursive: true });
  }

  const platform = process.platform;
  const arch = process.arch;

  // 1. Install JDK
  const jdkKey = `${platform}-${arch}`;
  const jdkUrl = (JDK_URLS as any)[jdkKey];

  if (jdkUrl) {
    const jdkDir = path.join(TOOLS_DIR, 'jdk');
    if (!fs.existsSync(jdkDir)) {
      console.log(`Downloading JDK from ${jdkUrl}...`);
      const ext = jdkUrl.endsWith('.zip') ? '.zip' : '.tar.gz';
      const archivePath = path.join(TOOLS_DIR, `jdk${ext}`);
      
      await downloadFile(jdkUrl, archivePath);
      
      console.log('Extracting JDK...');
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
      } else {
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
      console.log('JDK installed locally.');
    } else {
      console.log('Local JDK already exists.');
    }
  } else {
    console.warn(`No JDK URL found for ${platform}-${arch}`);
  }

  // 2. Install Android Command Line Tools
  const cmdUrl = (ANDROID_CMDLINE_URLS as any)[platform];
  if (cmdUrl) {
    const sdkDir = path.join(TOOLS_DIR, 'android-sdk');
    if (!fs.existsSync(sdkDir)) {
      console.log(`Downloading Android Command Line Tools from ${cmdUrl}...`);
      const archivePath = path.join(TOOLS_DIR, 'cmdline-tools.zip');
      await downloadFile(cmdUrl, archivePath);

      console.log('Extracting Android Tools...');
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
      } else {
          // If flat or other name, move everything to latest
           fs.renameSync(extractTemp, path.join(cmdlineToolsDir, 'latest'));
      }
      
      fs.rmSync(extractTemp, { recursive: true, force: true });
      fs.unlinkSync(archivePath);

      console.log('Android Tools installed locally.');
      
      // 3. Accept Licenses & Install Platform Tools
      console.log('Installing platform-tools...');
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
        // Yes | sdkmanager --licenses
        // sdkmanager "platform-tools" "platforms;android-34"
        const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: sdkDir };
        
        // Accept licenses
        console.log('Accepting licenses...');
        execSync(`yes | "${sdkManagerBin}" --licenses`, { env, stdio: 'ignore' });
        
        // Install platform-tools
        console.log('Installing platform-tools and emulator...');
        execSync(`"${sdkManagerBin}" "platform-tools" "emulator"`, { env, stdio: 'inherit' });
        
      } catch (e) {
        console.error('Failed to run sdkmanager:', e);
      }

    } else {
      console.log('Local Android SDK already exists.');
    }
  }
}

