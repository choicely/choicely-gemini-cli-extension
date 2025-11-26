/**
 * Git-related helpers used by the Choicely MCP tools.
 */
import { execa } from 'execa';
import path from 'path';
import fs from 'fs';
const GIT_CLONE_TIMEOUT_SEC = 300;
/**
 * Clone the Choicely SDK demo repository into the target directory.
 */
export async function fetchExampleAppRepository(directory, overwrite = false) {
    if (!directory) {
        directory = process.cwd();
    }
    // Ensure we have an absolute path
    directory = path.resolve(directory);
    console.error(`Fetching Choicely example app repository to: ${directory}`);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    let repoPath = path.join(directory, 'choicely-sdk-demo');
    repoPath = path.resolve(repoPath);
    if (fs.existsSync(repoPath)) {
        if (!overwrite) {
            throw new Error(`'${repoPath}' already exists. Remove it manually or rerun with overwrite=true.`);
        }
        console.error(`Removing existing choicely-sdk-demo directory at ${repoPath}`);
        try {
            fs.rmSync(repoPath, { recursive: true, force: true });
            console.error('Successfully removed existing directory');
        }
        catch (e) {
            // Deletion failed - clone to a timestamped directory instead
            console.warn(`Failed to remove existing directory '${repoPath}': ${e.message}. ` +
                `Files may be locked by another process. Cloning to a timestamped directory instead.`);
            const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
            repoPath = path.join(directory, `choicely-sdk-demo_${timestamp}`);
            console.error(`Will clone to: ${repoPath}`);
        }
    }
    // Ensure the parent directory exists and is writable
    const parentDir = path.dirname(repoPath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
    console.error(`Cloning repository to: ${repoPath}`);
    try {
        const result = await execa('git', [
            'clone',
            '--quiet',
            'https://github.com/choicely/choicely-sdk-demo.git',
            repoPath,
        ], {
            timeout: GIT_CLONE_TIMEOUT_SEC * 1000,
            reject: false,
            stdin: 'ignore',
        });
        if (result.exitCode !== 0) {
            throw new Error(`Git clone failed with return code ${result.exitCode}. ` +
                `Ensure git is installed and you have network access.\n` +
                `Stderr: ${result.stderr}\nStdout: ${result.stdout}`);
        }
        // Verify the clone was successful
        if (!fs.existsSync(repoPath)) {
            throw new Error(`Repository was not cloned to expected path: ${repoPath}`);
        }
        console.error(`Successfully cloned repository to: ${repoPath}`);
        return { repo_path: repoPath };
    }
    catch (error) {
        if (error.timedOut) {
            throw new Error(`Git clone timed out after ${GIT_CLONE_TIMEOUT_SEC} seconds. ` +
                `This might indicate network issues or a very large repository.`);
        }
        if (error.code === 'ENOENT') {
            throw new Error('Git command not found. Please ensure git is installed and available in PATH.');
        }
        throw error;
    }
}
//# sourceMappingURL=git.js.map