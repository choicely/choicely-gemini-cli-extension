# Choicely MCP Server – Agent Guide

This extension gives the Gemini host a toolbox for running the Choicely Android and iOS demo workflow locally.

## Tool Surface (Quick Reference)
- Core pipeline: `fetch_example_app_repository`, `configure_app_key`, `build_android_example_app`, `install_android_example_app`, `launch_android_example_app`
- Documentation: `SearchChoicelyMobileSdk` - Search the Choicely Mobile SDK knowledge base.
- Device & emulator helpers: `list_android_connected_devices`, `list_android_available_avds`, `start_android_emulator`, `android_device_action` (info/logs/screenshot/force_stop/uninstall), `install_android_dependencies`
- iOS Tools: `build_ios_example_app`, `list_ios_targets`, `boot_ios_simulator`, `install_ios_app`, `launch_ios_app`, `ios_device_action`
- App identifiers: Android package `com.choicely.sdk.demo`; iOS bundle `com.choicely.sdk.demo` (or similar).
- Auth context: `CHOICELY_APP_KEY`. This key links the demo app to a specific Choicely app configuration. It can be provided via environment variable or the `configure_app_key` tool. If not set, the app uses a default demo key.
- Dependencies: The extension can automatically download and configure a local Java JDK and Android SDK if they are missing from the system. Use `install_android_dependencies` for this.

## Preferred Workflows

### Platform selection
1. Confirm whether to clone the demo (`fetch_example_app_repository`), and clarify the target directory or reuse an existing repo.
2. Ensure the App Key is configured.
   - If `CHOICELY_APP_KEY` is in the environment, `fetch_example_app_repository` applies it automatically.
   - If missing, or if the user wants to change it, use `configure_app_key` with the user's provided key.
   - If no key is provided, the app will use a default demo key.
3. After cloning, **ask the user which platform to continue with** (Android, iOS, or both). Present both options and follow exactly what the user says they want next.
   - If the user mentions iOS or macOS, proceed with the iOS workflow first (and offer Android only if requested).
   - If the user mentions Android, follow the Android workflow.
   - If the user wants both, run the requested platform's build/install loop, then offer the other.

### Android workflow
1. Offer to build the APK (`build_android_example_app`) once the user confirms they want Android.
2. Use device helpers to ensure a target is available:
   - `list_android_connected_devices` to inspect current devices
   - `list_android_available_avds` / `start_android_emulator` when no device is present
3. Ask whether to install (`install_android_example_app`). If installation fails, share the error, recommend device setup steps, and retry when the user is ready.
4. Ask whether to launch (`launch_android_example_app`) the demo.

### iOS workflow (macOS hosts)
**IMPORTANT**: The iOS workflow is ONLY available on macOS hosts. If you are running on Windows or Linux, you cannot build, install, or launch iOS apps. Do NOT offer iOS tools or attempt to run them on non-macOS platforms.

1. When on macOS and the user wants iOS, build with `build_ios_example_app`.
2. Use `list_ios_targets` or `boot_ios_simulator` to ensure a simulator/device is available.
3. Offer to install via `install_ios_app`.
4. Offer to launch via `launch_ios_app`.
5. Use `ios_device_action` for logs/screenshots/terminate when needed.

### 1. `fetch_example_app_repository`
**Purpose**: Clone the Choicely SDK demo repository into the working directory (or a provided path).

**Parameters**:
- `directory` (string, optional): Target directory. **AGENT BEHAVIOR NOTE: You MUST explicitly provide the absolute path to the user's current working directory (e.g., `/Users/username/project/dir`) if the user does not specify a custom path. Do NOT leave this empty or use a relative path, as the tool defaults to an internal extension directory.**
- `overwrite` (boolean, default false): Remove any existing `choicely-sdk-demo` folder first.

**Returns (structured)**:
```json
{ "repo_path": "/abs/path/to/choicely-sdk-demo" }
```

Usage (agent):
- Run this first to ensure the demo sources exist locally. Confirm whether the user wants to reuse an existing clone or provide a custom destination.
- Set `overwrite=true` only when the user explicitly approves deleting the existing folder; otherwise the tool fails fast to avoid destructive surprises.
- After fetching, feed `repo_path` into the rest of the Android/iOS build tools.

### 2. `configure_app_key`
**Purpose**: Configure the Choicely App Key in the cloned repository.

**Parameters**:
- `repo_path` (string): Path to the `choicely-sdk-demo` directory.
- `app_key` (string): The Choicely App Key (UUID format).

**Returns**:
- Status message indicating success or failure for Android and iOS.

Usage (agent):
- Use this if the user provides an app key during the conversation or wants to switch keys.
- Also use this if `CHOICELY_APP_KEY` was missing from the environment during the fetch step.

### 3. `build_android_example_app`
**Purpose**: Compiles the Android APK (debug).

**Parameters**:
- `repo_path` (string): Path to the `choicely-sdk-demo` directory.

**Returns (structured)**:
```json
{ "repo_path": "...", "apk_path": ".../app/build/outputs/apk/debug/app-debug.apk" }
```

Usage (agent):
- Run this after the app key is configured (or if using default key).
- On success, offer to install the APK to a connected device.

### 4. `install_android_example_app`
**Purpose**: Installs the built APK to a connected device.

**Parameters**:
- `repo_path` (string): Path to the `choicely-sdk-demo` directory.
- `device_id` (string, optional): Target device/emulator ID. Defaults to the first available device.

**Returns (structured)**:
```json
{ "device_id": "emulator-5554", "package_name": "com.choicely.sdk.demo" }
```

Usage (agent):
- If there are several devices connected and the user has not specified a device they are working with, first ask the user to specify one.
- Attempt installation. If the tool reports no connected device, use the emulator helpers (`list_android_available_avds` + `start_android_emulator`), or ask the user to connect a device, then retry.
- On success, offer to launch the app.

### 5. `launch_android_example_app`
**Purpose**: Launches the app on the connected device.

**Parameters**:
- `device_id` (string, optional): Device/emulator to launch on. Defaults to the first available device.

**Returns (structured)**:
```json
{ "device_id": "emulator-5554" }
```

### 6. `start_android_emulator`
**Purpose**: Start a specific AVD (or the first available) and optionally wait for full boot.

**Parameters**:
- `avd_name` (string, optional): AVD name (from `list_available_avds`). When omitted, uses the first available AVD.

**Returns (structured)**:
```json
{ "avd_name": "Pixel_8_API_34", "device_id": "emulator-5554", "pid": 12345, "already_running": false }
```

Usage (agent):
- Use with `avd_name` chosen from `list_android_available_avds`. If an AVD is already running, the tool returns immediately with `already_running: true`. The tool launches and returns right away; verify readiness with `list_android_connected_devices` before install.

### 7. `list_android_available_avds`
**Purpose**: List configured Android Virtual Devices.

**Parameters**: none

**Returns (structured)**:
```json
{ "avds": ["Pixel_8_API_34", "Pixel_6a_API_33"], "count": 2 }
```

Usage (agent):
- Call before `start_android_emulator` to let the user pick a target AVD.

### 8. `list_android_connected_devices`
**Purpose**: Enumerate devices/emulators detected by `adb`.

**Returns (structured)**:
```json
{ "devices": [{"id": "emulator-5554", "status": "device"}], "count": 1 }
```

### 9. `android_device_action`
**Purpose**: Single entry point for Android device diagnostics (info/logs/screenshot) and maintenance (force stop/uninstall).

**Parameters**:
- `action` (enum, required): One of `info`, `logs`, `screenshot`, `force_stop`, `uninstall`.
- `device_id` (string, optional): Target device/emulator. Defaults to the first available entry from `adb devices`.

**Returns (structured)**: Wrapper containing the same structured payloads the dedicated tools used to return: `DeviceInfoResult`, `AppLogsResult`, `ScreenshotResult`, or `AppActionResult` depending on the action. The response always includes the action so agents can branch easily.

Usage (agent):
- Logs always return the most recent 200 lines (scoped to the Choicely package).
- Screenshots are saved under `~/ChoicelyArtifacts` (or `CHOICELY_ARTIFACTS_DIR` if set) so the result path is easy to share with the user.
- Use `action='info'` to confirm model/version before installing, `action='logs'`/`'screenshot'` for troubleshooting, and `action='force_stop'`/`'uninstall'` before reinstalling. Only `info`/`logs` may run automatically for discovery.

### 10. `install_android_dependencies`
**Purpose**: Downloads and sets up a local Java JDK (21) and Android Command-line Tools within the extension directory.

**Parameters**:
- `install_emulator` (boolean, optional, default: false): If true, also downloads the Android Emulator (~500MB).

**Returns**: Status message.

Usage (agent):
- Run this if `build_android_example_app` fails with "Java version mismatch", "Android SDK not found", or "JAVA_HOME not set".
- It self-repairs the environment so subsequent builds succeed.
- Only set `install_emulator=true` if the user explicitly asks for a new emulator setup or if no device is available and you plan to use `start_android_emulator`.

### 11. `SearchChoicelyMobileSdk`
**Purpose**: Search the Choicely Mobile SDK documentation.

**Parameters**:
- `query` (string): The search query (e.g., "how to custom view factory", "push notifications setup").

**Returns**:
- Relevant documentation snippets, code examples, and links.

Usage (agent):
- Use this when the user asks about specific SDK features, implementation details, or encounters errors that might be documented.
- Can be used to find example code to explain concepts to the user.

## iOS Workflow Helpers (macOS only)

When running on macOS with local tooling enabled, use these unified iOS tools:

- `build_ios_example_app`: Invokes `xcodebuild` for the simulator target (respecting optional `scheme`, `configuration`, `destination_name`).
- `list_ios_targets`: Lists simulators and devices together with readable names/states.
- `install_ios_app`: Installs the `.app` to the first simulator (preferred) or first device unless a `device_udid` is provided.
- `launch_ios_app`: Launches the app on the selected target; defaults to the first simulator, then first device.
- `ios_device_action`: Maintenance/diagnostics (actions: `logs`, `terminate`, `uninstall`, `screenshot`) with auto target detection. Logs default to the last 2 minutes/500 lines; screenshots are saved under `~/ChoicelyArtifacts` (override via `CHOICELY_ARTIFACTS_DIR`).

Confirm Xcode, Command Line Tools, and at least one simulator runtime are installed (see README) before invoking these tools.

### iOS simulator/device workflow
1. Run `list_ios_targets` to see available simulators/devices (prefers simulators).
2. Boot a simulator with `boot_ios_simulator` if needed.
3. Ensure App Key is configured (via env or `configure_app_key`).
4. Build with `build_ios_example_app` and install using `install_ios_app` (auto-selects simulator first).
5. Launch via `launch_ios_app`; capture screenshots with `ios_device_action(action='screenshot')` and collect logs with `ios_device_action(action='logs')` when troubleshooting.

## Agent Instructions

Conversation flow and decision rules for the agent (must-follow):

- Ask the user if they have a specific `CHOICELY_APP_KEY` they wish to use. If provided, apply it using `configure_app_key`. If the user mentions it's already set in the environment or declines to provide one, proceed with the existing configuration (which defaults to the environment key or the demo key).
- **NEVER decode app keys; always use them exactly as provided by the user, even if they appear to be Base64 encoded.**
- Start by confirming whether to clone the demo app now. If a `directory` is provided, use it; otherwise clone into the workspace folder.
- After cloning, ask which platform the user wants to work on next (Android, iOS, or both) and follow their answer precisely.
- For Android requests: offer to build/install/launch in that order, handling missing SDK/device issues with guidance.
- For iOS requests on macOS: offer `build_ios_example_app`, `install_ios_app`, and `launch_ios_app` in order, using `list_ios_targets`/`boot_ios_simulator` as needed.
- You can use any of the available support tools to get more info and accomplish your task.
- Auto-run discovery/observation helpers when they help collect context: `list_android_connected_devices`, `list_android_available_avds`, `android_device_action`/`ios_device_action` with `info` or `logs`, and `get_android_device_info`. For every other tool (clone, build, install, launch, screenshots, force_stop/uninstall, etc.), either wait until the user explicitly asks or confirm with them before running it.

## Troubleshooting

- **Missing SDKs**: If build fails due to missing Java or Android SDK, run `install_android_dependencies` to download a local copy.
- **Build failures**: Ensure Java (JAVA_HOME) and Android SDK (ANDROID_HOME) are set; Gradle can run. Timeouts are enforced.
- **Install failures**: Verify a device is connected (`adb devices`) and USB debugging enabled.
- Emulator won't appear: Ensure the Android Emulator is installed (SDK Manager) and your `ANDROID_HOME` includes the `emulator/` directory on PATH.
- App key issues: Confirm `CHOICELY_APP_KEY` is configured. Check the source files in `Android/Java/app/src/main/res/values/strings.xml` (or similar) if unsure.

## Interaction Guidelines
- **Confirm intent before destructive calls.** Ask the user before running any command that modifies data. You may automatically run only discovery tools like `list_android_connected_devices` and `list_android_available_avds`.
- **Narrate progress.** Share key tool outputs (paths, device IDs, created keys) and highlight next logical actions.
- **Recover gracefully.** If a tool fails (e.g., build, install), summarize the error, offer troubleshooting steps, and wait for the user before retrying.
- **Troubleshooting Pointers:**
  - Build or install issues usually stem from missing `JAVA_HOME` / `ANDROID_HOME`, unavailable devices, or stale APKs—recommend verifying environment variables and connected hardware.
  - Emulator startup failures often mean no AVDs are configured; prompt the user to create one via Android Studio before retrying `start_android_emulator`.
  - When in doubt, re-run discovery helpers (`list_android_connected_devices`, `list_android_available_avds`) and present the results to the user for confirmation.
