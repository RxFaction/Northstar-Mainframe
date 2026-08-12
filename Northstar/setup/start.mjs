#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/*
 * Cross-platform Northstar launcher.
 *
 * Auto mode selects HTTPS only when both local TLS files exist. Explicit modes
 * fail closed when their prerequisites are incomplete, and the child server
 * inherits stdio so Ctrl+C and runtime logs behave like a direct Node process.
 */

const setupDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.dirname(setupDir);
const serverDir = path.join(appDir, 'server');
const serverEntry = path.join(serverDir, 'index.js');
const defaultKeyPath = path.join(serverDir, 'certs', 'key.pem');
const defaultCertificatePath = path.join(serverDir, 'certs', 'cert.pem');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function printHelp() {
  console.log(`Northstar launcher

Usage:
  node Northstar/setup/start.mjs [options]

Options:
  --https         Require HTTPS
  --http          Use HTTP even if local certificates exist
  --port <number> Listen on this port (default: 3000)
  -h, --help      Show this help

With no mode option, HTTPS is selected when both certificate files exist;
otherwise Northstar starts in HTTP mode.`);
}

// Parse locally instead of adding a CLI dependency for three simple options.
function parseArguments(argv) {
  const options = { help: false, mode: 'auto', port: process.env.PORT || '3000' };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '-h' || argument === '--help') {
      options.help = true;
    } else if (argument === '--https' || argument === '--http') {
      const requestedMode = argument.slice(2);
      if (options.mode !== 'auto' && options.mode !== requestedMode) {
        throw new Error('Choose either --http or --https, not both.');
      }
      options.mode = requestedMode;
    } else if (argument === '--port') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) throw new Error('--port requires a number.');
      options.port = value;
      index += 1;
    } else if (argument.startsWith('--port=')) {
      options.port = argument.slice('--port='.length);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  const numericPort = Number(options.port);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  options.port = String(numericPort);

  return options;
}

// Environment overrides may be absolute or relative to the launch directory.
function configuredPath(environmentValue, fallback) {
  if (!environmentValue) return fallback;
  return path.isAbsolute(environmentValue)
    ? environmentValue
    : path.resolve(process.cwd(), environmentValue);
}

// Printed LAN addresses are convenience URLs; certificate SANs are configured separately.
function getLocalIPv4Addresses() {
  const addresses = new Set();
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      const isV4 = entry.family === 'IPv4' || entry.family === 4;
      if (isV4 && !entry.internal) addresses.add(entry.address);
    }
  }
  return [...addresses];
}

// Resolve from the server package so launching from another directory is reliable.
function ensureDependencies() {
  const requireFromServer = createRequire(serverEntry);
  try {
    requireFromServer.resolve('ws');
  } catch {
    throw new Error(`Server dependencies are missing. Run ${npmCommand} install from Northstar/server first.`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  ensureDependencies();

  const keyPath = configuredPath(process.env.SSL_KEY, defaultKeyPath);
  const certificatePath = configuredPath(process.env.SSL_CERT, defaultCertificatePath);
  const keyExists = existsSync(keyPath);
  const certificateExists = existsSync(certificatePath);

  if (options.mode !== 'http' && keyExists !== certificateExists) {
    throw new Error('HTTPS configuration is incomplete: both the certificate and private key are required.');
  }

  const mode = options.mode === 'auto'
    ? (keyExists && certificateExists ? 'https' : 'http')
    : options.mode;

  if (mode === 'https' && (!keyExists || !certificateExists)) {
    throw new Error(`HTTPS certificates were not found. Run ${npmCommand} run setup:https first.`);
  }

  const protocol = mode === 'https' ? 'https' : 'http';
  console.log(`Northstar starting in ${mode.toUpperCase()} mode.`);
  if (mode === 'http') {
    console.log(`Screen sharing on other devices requires HTTPS. Run ${npmCommand} run setup:https to configure it.`);
  }
  console.log('\nOpen:');
  console.log(`  ${protocol}://localhost:${options.port}`);
  getLocalIPv4Addresses().forEach(address => {
    console.log(`  ${protocol}://${address}:${options.port}`);
  });
  console.log('');

  const child = spawn(process.execPath, [serverEntry], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: options.port,
      USE_HTTPS: mode === 'https' ? '1' : '0'
    },
    stdio: 'inherit',
    windowsHide: true
  });

  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (typeof code === 'number') process.exitCode = code;
      else if (signal && signal !== 'SIGINT') process.exitCode = 1;
      resolve();
    });
  });
}

main().catch(error => {
  console.error(`\nStartup failed: ${error.message}`);
  process.exitCode = 1;
});
