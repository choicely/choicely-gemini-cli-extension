/**
 * iOS build helpers using xcodebuild for iphonesimulator.
 *
 * Parallels Android build flow to produce a simulator .app and return a
 * BuildResult-like dict for parity (apk_path contains the .app path).
 */
import { BuildResult } from '../schemas.js';
/**
 * Build the iOS demo app for iphonesimulator.
 */
export declare function buildAppSimulator(repoPath: string, scheme?: string, configuration?: string, destinationName?: string): Promise<BuildResult>;
//# sourceMappingURL=build.d.ts.map