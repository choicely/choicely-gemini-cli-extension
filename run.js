#!/usr/bin/env node
/**
 * Extension wrapper script that runs the local TypeScript MCP server.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const EXT_DIR = __dirname;
const MCP_LOCAL_DIR = path.join(EXT_DIR, 'choicely-mcp-local');
const MCP_ENTRY_POINT = path.join(MCP_LOCAL_DIR, 'dist', 'index.js');
const NODE_MODULES_DIR = path.join(MCP_LOCAL_DIR, 'node_modules');

/**
 * Install dependencies if missing
 */
function ensureDependencies() {
  if (!fs.existsSync(NODE_MODULES_DIR)) {
    console.error('[choicelyextension] Installing dependencies for MCP server...');
    try {
      // Install only production dependencies since we ship the 'dist' folder.
      // Users don't need TypeScript or build tools.
      execSync('npm install --omit=dev', {
        cwd: MCP_LOCAL_DIR,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('[choicelyextension] Failed to install dependencies:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Build the project if dist is missing
 */
function ensureBuild() {
  if (!fs.existsSync(MCP_ENTRY_POINT)) {
    console.error('[choicelyextension] Building MCP server...');
    try {
      execSync('npm run build', {
        cwd: MCP_LOCAL_DIR,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('[choicelyextension] Failed to build MCP server:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Main entry point
 */
function main() {
  // Ensure we have dependencies and build
  ensureDependencies();
  ensureBuild();
  
  // Run the MCP server
  console.error('[choicelyextension] Starting MCP server...');
  const mcpServerProcess = spawn('node', [MCP_ENTRY_POINT], {
    cwd: MCP_LOCAL_DIR, // Set CWD to the module directory so it finds its .env etc if needed
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit']
  });
  
  mcpServerProcess.on('close', (code) => {
    process.exit(code || 0);
  });
  
  mcpServerProcess.on('error', (error) => {
    console.error('[choicelyextension] Failed to start MCP server:', error.message);
    process.exit(1);
  });
}

main();
