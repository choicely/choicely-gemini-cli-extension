import { BuildResult } from '../schemas.js';
/**
 * Write the provided Choicely app key into the demo application code.
 */
export declare function setUpAppKey(appKey: string, repoPath: string): Promise<{
    file_path: string;
}>;
/**
 * Build the Android demo application (debug APK).
 */
export declare function buildApp(repoPath: string): Promise<BuildResult>;
//# sourceMappingURL=build.d.ts.map