// iOS module exports
// Simulator exports
export { listSimulators, bootSimulator, installApp as installAppToSimulator, launchApp as launchAppOnSimulator, terminateApp as terminateAppOnSimulator, uninstallApp as uninstallAppFromSimulator, openUrl, takeScreenshot as takeScreenshotOnSimulator, getLogs as getLogsFromSimulator, shutdownSimulator, getDeviceInfo as getSimulatorInfo, } from './simulator.js';
// Device exports
export { listConnectedDevices as listIOSDevices, installApp as installAppToDevice, launchApp as launchAppOnDevice, terminateApp as terminateAppOnDevice, uninstallApp as uninstallAppFromDevice, getDeviceLogs, takeScreenshot as takeScreenshotFromDevice, } from './device.js';
// Build exports
export { buildAppSimulator } from './build.js';
// Config exports
export { setAppKey as setIOSAppKey } from './config.js';
//# sourceMappingURL=index.js.map