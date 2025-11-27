# Choicely Gemini Extension

A Gemini Cli extension that exposes tools for working with the Choicely SDK demo app. Tools help you fetch the demo repo, automatically write your app key (when `CHOICELY_APP_KEY` is exported), build Android/iOS demo binaries, install them to connected targets, and launch them.

This extension repository contains the configuration and the local MCP server implementation. The MCP server code is located in `choicely-mcp-local` and is a TypeScript-based server. The extension is wired via `gemini-extension.json` and communicates over stdio so IDEs like Cursor or VS Code can start/stop it automatically.

**Key features**
- MCP-compliant tool registration with input/output schemas
- Structured JSON results with status fields and suggested actions
- Standard MCP error handling via JSON-RPC error codes
- Progress and logging notifications to the client
- Slash commands for common queries
- App key configuration: Set `CHOICELY_APP_KEY` during installation (stored in `.env`) or use the `configure_app_key` tool to set it dynamically.
- The extension uses the bundled TypeScript MCP server.

## Repository Structure

This extension repository (`choicely-gemini-extension`) contains:
- `gemini-extension.json` - Extension configuration
- `run.js` - Wrapper script that launches the local MCP server
- `choicely-mcp-local/` - The TypeScript MCP server implementation
- `GEMINI.md` - Context file for Gemini AI
- Documentation and configuration files

### Configuration

**During installation**, you will be prompted to enter values for:
- `CHOICELY_APP_KEY`: Your Choicely App Key (optional; defaults to demo key if skipped)
- `JAVA_HOME`: Path to Java JDK (optional; auto-detected if standard)
- `ANDROID_HOME`: Path to Android SDK (optional; auto-detected if standard)

These values are stored in a `.env` file in the extension directory and read by the MCP server at runtime.

**MCP Tools provided**

The MCP server provides a comprehensive set of tools. Key tool categories include:

- Core pipeline
  - `fetch_example_app_repository`: Clone the Choicely SDK demo repository. When `CHOICELY_APP_KEY` is set, the tool automatically writes the key into both Android and iOS demo sources.
  - `configure_app_key`: Configure the Choicely app key for the Android and iOS projects in the cloned repository.
  - `build_android_example_app` / `build_ios_example_app`: Build the Android debug APK or the iOS simulator app bundle
  - `install_android_example_app` / `install_ios_app`: Install the Android APK or iOS app to the selected device/simulator
  - `launch_android_example_app` / `launch_ios_app`: Launch the platform-specific demo app on the target
  - `install_android_dependencies`: Download and setup local Java JDK and Android SDK if missing from the system.
- Documentation
  - `SearchChoicelyMobileSdk`: Search across the Choicely Mobile SDK knowledge base for guides, API references, and code examples.
- Emulator and device helpers
  - `start_android_emulator`: Start an Android emulator (AVD)
  - `list_android_available_avds`: List configured Android Virtual Devices to pick an emulator target
  - `list_android_connected_devices`: List devices and emulators visible to `adb`
  - `android_device_action`: One tool for Android diagnostics/maintenance (actions: `info`, `logs`, `screenshot`, `force_stop`, `uninstall`). Logs always capture the most recent 200 lines; screenshots are saved under `~/ChoicelyArtifacts` (override via `CHOICELY_ARTIFACTS_DIR`).
- iOS helpers (macOS only)
  - Unified iOS tools: `list_ios_targets` (simulators + devices), `install_ios_app`, `launch_ios_app`, `ios_device_action` (logs/terminate/uninstall/screenshot; auto-detects simulator vs device)

| Tool | Purpose | Notes |
| --- | --- | --- |
| `fetch_example_app_repository` | Clone the demo repo | Set `overwrite=true` only if you want to delete an existing clone |
| `configure_app_key` | Set the Choicely App Key | Updates the project files with the provided key |
| `build_android_example_app` / `build_ios_example_app` | Build Android APK / iOS simulator app | Uses Gradle / xcodebuild respectively |
| `install_android_dependencies` | Install local Java/Android SDK | Downloads JDK 21 and Android tools to `tools/` if missing |
| `install_android_example_app` / `install_ios_app` | Install builds onto targets | Accepts optional device IDs; iOS auto-detects simulator vs device |
| `launch_android_example_app` / `launch_ios_app` | Launch the demo app | Selects first target if none provided |
| `SearchChoicelyMobileSdk` | Search SDK documentation | specific queries for API usage and guides |
| `list_android_connected_devices`, `list_ios_targets` | Enumerate available targets | Use before install/launch steps |
| `start_android_emulator`, `boot_ios_simulator` | Boot emulator/simulator targets | Uses fixed sensible defaults |
| `android_device_action (action='logs')`, `ios_device_action (action='logs')` | Retrieve recent logs | Android logs always capture 200 lines; iOS logs default to last 2 minutes/500 lines |
| `android_device_action (action='screenshot')`, `ios_device_action (action='screenshot')` | Capture screenshots | Saved under `~/ChoicelyArtifacts` (override via `CHOICELY_ARTIFACTS_DIR`) |
| `android_device_action (action='force_stop'/'uninstall')`, `ios_device_action (action='terminate'/'uninstall')` | Stop/uninstall demo apps | Useful for clean reinstall loops |

### Platform workflows

- **Android**
  1. `fetch_example_app_repository` (auto-writes the app key when `CHOICELY_APP_KEY` is exported).
  2. Use `configure_app_key` if you need to change the app key or if it wasn't set in the environment.
  3. `build_android_example_app`.
  4. Ensure a target via `list_android_connected_devices`; start/verify an emulator with `start_android_emulator` + `list_android_connected_devices` when needed.
  5. `install_android_example_app` (optionally provide `device_id`).
  6. `launch_android_example_app`.

- **iOS (macOS + local tooling)**
  1. `fetch_example_app_repository` (auto-writes the app key when `CHOICELY_APP_KEY` is exported).
  2. Use `configure_app_key` if you need to change the app key or if it wasn't set in the environment.
  3. `build_ios_example_app` (tweak `scheme`/`configuration`/`destination_name` as required).
  4. Inspect/boot targets with `list_ios_targets` / `boot_ios_simulator`.
  5. `install_ios_app` (auto-detects simulator vs device unless `device_udid` is given).
  6. `launch_ios_app`.

**Slash Commands**
- `/commands:pricing [MAU]`: Fetch live pricing information (and, when MAU is provided, receive a tier recommendation).

See `GEMINI.md` for full tool details, structured outputs, and recommended workflow.

**Requirements**
- **Node.js 18+** & **npm**: Required to run the extension server.
- **Git**: Required to clone the example app repository. (https://git-scm.com/install/)
- **Java JDK**: Required for Android builds.
  - Can be set via `JAVA_HOME`.
  - If missing, the extension can download a local copy automatically.
- **Android SDK**: Required for Android builds.
  - Can be set via `ANDROID_HOME` or `ANDROID_SDK_ROOT`.
  - If missing, the extension can download local command-line tools automatically.
- **Xcode (macOS only)**: Required for iOS builds and simulators.
- Optional: a connected device or emulator for install/launch operations.

**Credential handling**
- The main credential is `CHOICELY_APP_KEY`.
- It is set during extension installation (prompted via the `settings` block) and stored in a `.env` file.
- Alternatively, you can use the `configure_app_key` tool to set it at runtime after cloning the repository.
- If `CHOICELY_APP_KEY` is not set, the app uses a default demo key.
- The server automatically writes `CHOICELY_APP_KEY` into the Android/iOS demo projects when cloning. To switch apps, use `configure_app_key` with the new key.

## iOS Build Prerequisites (macOS)
If iOS builds fail with `xcrun: error: unable to find utility "xcodebuild"`, complete these one‑time steps:

1) Install Xcode from the App Store and open it once
- Accept licenses and allow Xcode to install additional components

2) Ensure Command Line Tools point to full Xcode (not CommandLineTools)
```bash
xcode-select -p
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

3) Install CLT if prompted and accept the license
```bash
xcode-select --install || true
sudo xcodebuild -license accept
```

4) Verify `xcodebuild` is discoverable
```bash
xcrun -find xcodebuild
```

5) Install at least one iOS Simulator runtime in Xcode (e.g., iOS 17/18)
- Xcode → Settings → Platforms → iOS → download a simulator runtime

After these steps, rerun the iOS build tool.

**Install (Gemini CLI)**
- `gemini extensions install https://github.com/choicely/choicely-gemini-cli-extension.git`
- During installation, you will be prompted to enter:
  - `CHOICELY_APP_KEY`: Your Choicely App Key (UUID). Optional; if skipped, the app uses a default demo key. You can set your own key later via chat.
  - `JAVA_HOME`: Path to Java JDK (optional, auto-detected if standard).
  - `ANDROID_HOME`: Path to Android SDK (optional, auto-detected if standard).
- These values are stored in a `.env` file in the extension directory and read by the MCP server at runtime.

**How it runs**
- The Gemini host uses `gemini-extension.json` to spawn the wrapper script `run.js`.
- The wrapper script automatically:
  1. Installs dependencies for the local MCP server if missing
  2. Builds the TypeScript server if `dist/` is missing
  3. Starts the server process

**Manual run**
- `node run.js` (runs the local MCP server)
