/**
 * Git-related helpers used by the Choicely MCP tools.
 */
interface FetchRepoResult {
    repo_path: string;
}
/**
 * Clone the Choicely SDK demo repository into the target directory.
 */
export declare function fetchExampleAppRepository(directory?: string, overwrite?: boolean, template?: 'native' | 'react-native'): Promise<FetchRepoResult>;
export {};
//# sourceMappingURL=git.d.ts.map