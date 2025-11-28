# Choicely Gemini Extension

The official Choicely extension for the Gemini CLI to build, install, and launch Choicely SDK demo apps on Android and iOS.

Connects directly to the Choicely SDK demo workflow, automating repository cloning, app key configuration, building, and device management.

## Installation & Setup

1.  **Get your Choicely App Key**:
    *   Log in to **Choicely Studio**.
    *   Go to **Apps** > Select your app.
    *   Copy the **App Key (UUID)** from the top left corner.

2.  **Install the extension**:
    ```bash
    gemini extensions install https://github.com/choicely/choicely-gemini-cli-extension.git
    ```

3.  **Verify installation**:
    ```bash
    gemini extensions list
    ```

## Usage

Once installed, you can control the entire mobile development workflow using natural language.

### First Step: Set your App Key

Start a chat and tell Gemini your key:
> "Configure my Choicely App Key to `YOUR-UUID-HERE`."

### Example Queries

**Start from scratch:**
> "Clone the Choicely demo app and set it up."

**Android Workflow:**
> "Build the Android app."
> "Install the app on my connected device/emulator."
> "Launch the app."

**iOS Workflow (macOS only):**
> "Build the iOS app."
> "Install and launch on my connected iPhone/simulator."
> "Launch the app."

**Self-Repair:**
> "My build failed because of missing Java. Can you fix the dependencies?"

## Available Tools

| Tool | Description |
| --- | --- |
| `fetch_example_app_repository` | Clones the SDK demo repository and auto-configures your App Key. |
| `configure_app_key` | Updates the App Key in the source code. Use this if you want to switch apps. |
| `build_android_example_app` | Compiles the Android debug APK. |
| `install_android_example_app` | Installs the APK to a connected device or emulator. |
| `launch_android_example_app` | Launches the app on the device. |
| `build_ios_example_app` | Compiles the iOS app for Simulator or Device (macOS only). |
| `install_ios_app` | Installs the iOS app to a simulator or connected iPhone/iPad (macOS only). |
| `launch_ios_app` | Launches the iOS app (macOS only). |
| `install_android_dependencies` | Automatically downloads local Java JDK and Android SDK if missing. |
| `android_device_action` | Run diagnostics: `logs`, `screenshot`, `info`, `force_stop`, `uninstall`. |
| `SearchChoicelyMobileSdk` | Search the official documentation for guides and API usage. |

## Requirements

- **Node.js 18+ & npm**: Required to run the extension.
- **Git**: Required to clone the demo repository.
- **Java & Android SDK**: Required for Android builds.
  - The extension uses your system's `JAVA_HOME` and `ANDROID_HOME` by default.
  - If you don't have them installed, ask the extension to "Install Android dependencies" and it will set up a local copy for you.
- **Xcode (macOS only)**: Required for iOS builds.

## Troubleshooting

**Build failures due to missing SDKs:**
If you see errors like "JAVA_HOME not set" or "Android SDK not found", just ask Gemini:
> "Install Android dependencies for me."

**Device not found:**
Ensure your device is connected via USB and Developer Mode/USB Debugging is enabled.
Run `adb devices` in your terminal to verify.

**iOS Builds:**
Requires a Mac with Xcode installed. Ensure you have opened Xcode at least once to accept licenses.

## License

MIT
