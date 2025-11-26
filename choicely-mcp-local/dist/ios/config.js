/**
 * Configure the Choicely iOS demo app.
 */
import path from 'path';
import fs from 'fs';
/**
 * Update the iOS demo app with the provided Choicely app key.
 *
 * The demo template stores the key in DemoApp.swift under ChoicelySDK.initialize.
 */
export function setAppKey(appKey, repoPath) {
    const swiftPath = path.join(repoPath, 'iOS', 'sdk-ios-demo', 'DemoApp.swift');
    if (!fs.existsSync(swiftPath)) {
        throw new Error(`DemoApp.swift not found at ${swiftPath}. Ensure repo_path is correct.`);
    }
    let contents = fs.readFileSync(swiftPath, 'utf-8');
    // Pattern to match ChoicelySDK.initialize with appKey parameter
    const pattern = /(ChoicelySDK\.initialize\(\s*[^)]*appKey:\s*")([^"]*)("\s*\))/s;
    if (!pattern.test(contents)) {
        throw new Error('Could not locate ChoicelySDK.initialize appKey initializer in DemoApp.swift.');
    }
    const updated = contents.replace(pattern, `$1${appKey}$3`);
    fs.writeFileSync(swiftPath, updated, 'utf-8');
    console.error(`Configured iOS app key in ${swiftPath}`);
    return { file_path: swiftPath };
}
//# sourceMappingURL=config.js.map