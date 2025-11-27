# @choicely/mcp-local

Local MCP (Model Context Protocol) server for Choicely mobile SDK tools. This server provides tools for Android and iOS build, install, launch, and device management operations.

## Installation

```bash
npm install -g @choicely/mcp-local
```

Or run directly with npx:

```bash
npx @choicely/mcp-local
```

## Requirements

### Android Development
- **Java JDK 21+** - Set `JAVA_HOME` environment variable, OR run `install_android_dependencies` to download a local copy.
- **Android SDK** - Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable, OR run `install_android_dependencies` to download a local copy.
- **ADB** - Part of Android SDK Platform Tools (should be on PATH or provided by local install)

### iOS Development (macOS only)
- **Xcode** - With command line tools installed
- **Simulator** - At least one iOS Simulator runtime installed
- **Developer Mode** - Enabled on physical devices for device deployment

## App Key Configuration

The Choicely app key can be configured in two ways:

### 1. Via MCP Tool (Recommended)
Use the `configure_app_key` tool to set the app key dynamically:
```typescript
// The agent can call this tool to set the app key
configure_app_key({
  app_key: "your-app-key-here",
  repo_path: "/path/to/choicely-sdk-demo"
})
```

This approach:
- Allows the agent to set the app key based on user prompts
- Updates existing cloned repositories without re-cloning
- Overrides any environment variable setting
- Works for both Android and iOS demo apps

### 2. Via Environment Variable (Development)
For development convenience, you can set `CHOICELY_APP_KEY` as an environment variable:
```bash
export CHOICELY_APP_KEY="your-app-key-here"
```

When set, the app key is automatically written during `fetch_example_app_repository`. However, the `configure_app_key` tool will always override this setting.

## Environment Variables

- `CHOICELY_APP_KEY`: Your Choicely app key (optional, auto-configured during repo clone if set)
- `JAVA_HOME`: Path to Java JDK (auto-detected on macOS via `/usr/libexec/java_home`)
- `ANDROID_HOME` / `ANDROID_SDK_ROOT`: Path to Android SDK (auto-detected from common locations)
- `CHOICELY_ARTIFACTS_DIR`: Directory for screenshots (default: `~/ChoicelyArtifacts`)

## Usage with Cursor/Claude

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "choicely-local": {
      "command": "npx",
      "args": ["@choicely/mcp-local"],
      "env": {
        "JAVA_HOME": "/path/to/java",
        "ANDROID_HOME": "/path/to/android/sdk"
      }
    }
  }
}
```

**Setting the App Key:**
The recommended approach is to have the agent call `configure_app_key` with the user-provided key. Alternatively, for development convenience, you can add `CHOICELY_APP_KEY` to the `env` section above.

## Available Tools

### Repository Tools
| Tool | Purpose | Notes |
| --- | --- | --- |
| `fetch_example_app_repository` | Clone the Choicely SDK demo repository | Set `overwrite=true` only to delete an existing clone. Auto-writes `CHOICELY_APP_KEY` env var into sources if set. |
| `configure_app_key` | Configure/update the Choicely app key | **Recommended way** to set the app key. Updates both Android and iOS sources. User-specified key overrides environment variable. Can be called multiple times. |

### Android Tools
| Tool | Purpose | Notes |
| --- | --- | --- |
| `install_android_dependencies` | Install local Java/Android SDK | Downloads JDK 21 and Android tools if missing from system |
| `build_android_example_app` | Build the Android demo app (debug APK) | Uses Gradle |
| `install_android_example_app` | Install APK to connected device | Accepts optional `device_id` |
| `launch_android_example_app` | Launch the installed app | Selects first target if none provided |
| `list_android_connected_devices` | List connected devices and emulators | Use before install/launch steps |
| `list_android_available_avds` | List configured Android Virtual Devices | Use to pick an emulator target |
| `start_android_emulator` | Start an Android emulator (AVD) | Uses fixed sensible defaults |
| `android_device_action` | Run device diagnostics | Actions: `info`, `logs`, `screenshot`, `force_stop`, `uninstall` |

### iOS Tools (macOS only)
| Tool | Purpose | Notes |
| --- | --- | --- |
| `build_ios_example_app` | Build the iOS demo app for simulator | Uses xcodebuild |
| `list_ios_targets` | List available simulators and physical devices | Combined view |
| `boot_ios_simulator` | Boot an iOS simulator by UDID | Opens Simulator.app window |
| `install_ios_app` | Install .app to simulator or device | Auto-detects target type |
| `launch_ios_app` | Launch the app on target | Selects first target if none provided |
| `ios_device_action` | Run device diagnostics | Actions: `logs`, `terminate`, `uninstall`, `screenshot` |

## Platform Workflows

### Android
1. `fetch_example_app_repository` — Clone the demo repository
2. `configure_app_key` — Set your Choicely app key (user-provided key recommended)
3. `build_android_example_app` — Build the APK with your app key
4. Ensure a target via `list_android_connected_devices`; start/verify an emulator with `start_android_emulator` + `list_android_connected_devices` when needed
5. `install_android_example_app` — Install to device/emulator (optionally provide `device_id`)
6. `launch_android_example_app` — Launch the app

### iOS (macOS only)
1. `fetch_example_app_repository` — Clone the demo repository
2. `configure_app_key` — Set your Choicely app key (user-provided key recommended)
3. `build_ios_example_app` — Build the .app with your app key (tweak `scheme`/`configuration`/`destination_name` as required)
4. Inspect/boot targets with `list_ios_targets` / `boot_ios_simulator`
5. `install_ios_app` — Install to simulator/device (auto-detects target type unless `device_udid` is given)
6. `launch_ios_app` — Launch the app

## iOS Build Prerequisites (macOS)

If iOS builds fail with `xcrun: error: unable to find utility "xcodebuild"`, complete these one-time steps:

1. Install Xcode from the App Store and open it once
   - Accept licenses and allow Xcode to install additional components

2. Ensure Command Line Tools point to full Xcode (not CommandLineTools)
```bash
xcode-select -p
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

3. Install CLT if prompted and accept the license
```bash
xcode-select --install || true
sudo xcodebuild -license accept
```

4. Verify `xcodebuild` is discoverable
```bash
xcrun -find xcodebuild
```

5. Install at least one iOS Simulator runtime in Xcode (e.g., iOS 17/18)
   - Xcode → Settings → Platforms → iOS → download a simulator runtime

## Troubleshooting

- **Build failures**: Verify `JAVA_HOME` and `ANDROID_HOME` (or `ANDROID_SDK_ROOT`). Ensure Gradle can run.
- **Install/launch**: Ensure a device/emulator is listed by `adb devices` and USB debugging is enabled.
- **Repo fetch**: Network access and `git` must be available in the environment.
- **Artifacts**: Screenshots are saved under `~/ChoicelyArtifacts` by default. Set `CHOICELY_ARTIFACTS_DIR` for a different location.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev
```

## License

MIT
