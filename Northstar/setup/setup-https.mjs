#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { constants as fsConstants, existsSync } from 'node:fs';
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile
} from 'node:fs/promises';
import { isIPv4 } from 'node:net';
import { networkInterfaces, hostname, tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const setupDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.dirname(setupDir);
const repositoryDir = path.dirname(appDir);
const certificateDir = path.join(appDir, 'server', 'certs');
const keyPath = path.join(certificateDir, 'key.pem');
const certificatePath = path.join(certificateDir, 'cert.pem');

function printHelp() {
  console.log(`Northstar HTTPS setup

Usage:
  node Northstar/setup/setup-https.mjs [options]

Options:
  --ip <address>  Use this IPv4 address without prompting
  --force         Replace an existing local certificate and key
  -h, --help      Show this help

Examples:
  node Northstar/setup/setup-https.mjs
  node Northstar/setup/setup-https.mjs --ip 192.168.1.50
  node Northstar/setup/setup-https.mjs --ip 192.168.1.50 --force`);
}

function parseArguments(argv) {
  const options = { force: false, help: false, ip: null };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--force') {
      options.force = true;
    } else if (argument === '-h' || argument === '--help') {
      options.help = true;
    } else if (argument === '--ip') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--ip requires an IPv4 address.');
      }
      options.ip = value;
      index += 1;
    } else if (argument.startsWith('--ip=')) {
      options.ip = argument.slice('--ip='.length);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (options.ip && !isIPv4(options.ip)) {
    throw new Error(`Invalid IPv4 address: ${options.ip}`);
  }

  return options;
}

function isPrivateIPv4(address) {
  const octets = address.split('.').map(Number);
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function getLocalIPv4Addresses() {
  const addresses = [];
  const seen = new Set();

  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries || []) {
      const isV4 = entry.family === 'IPv4' || entry.family === 4;
      if (!isV4 || entry.internal || seen.has(entry.address)) continue;
      seen.add(entry.address);
      addresses.push({ address: entry.address, name, private: isPrivateIPv4(entry.address) });
    }
  }

  return addresses.sort((left, right) => {
    if (left.private !== right.private) return left.private ? -1 : 1;
    return left.name.localeCompare(right.name) || left.address.localeCompare(right.address);
  });
}

async function selectAddress(suppliedAddress) {
  if (suppliedAddress) return suppliedAddress;

  const addresses = getLocalIPv4Addresses();
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Interactive input is unavailable. Supply the host address with --ip <address>.');
  }

  console.log('\nAvailable network addresses:');
  if (addresses.length === 0) {
    console.log('  No non-loopback IPv4 addresses were detected.');
  } else {
    addresses.forEach((entry, index) => {
      const description = entry.private ? '' : ' (VPN, virtual, or public)';
      console.log(`  ${index + 1}. ${entry.name} - ${entry.address}${description}`);
    });
  }

  const prompt = addresses.length > 0
    ? 'Select an address or enter an IPv4 address [1]: '
    : 'Enter the IPv4 address viewers will use: ';
  const reader = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = (await reader.question(prompt)).trim();
    if (!answer && addresses.length > 0) return addresses[0].address;

    const selection = Number(answer);
    if (Number.isInteger(selection) && selection >= 1 && selection <= addresses.length) {
      return addresses[selection - 1].address;
    }
    if (isIPv4(answer)) return answer;

    throw new Error(`Invalid address or selection: ${answer || '(empty)'}`);
  } finally {
    reader.close();
  }
}

function commandResult(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
}

function findOpenSsl() {
  const candidates = [process.env.OPENSSL, 'openssl'];

  if (process.platform === 'win32') {
    for (const base of [
      process.env.ProgramW6432,
      process.env.ProgramFiles,
      process.env['ProgramFiles(x86)'],
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')
    ]) {
      if (base) candidates.push(path.join(base, 'Git', 'usr', 'bin', 'openssl.exe'));
    }

    const gitProbe = commandResult('git', ['--exec-path']);
    if (!gitProbe.error && gitProbe.status === 0) {
      const gitRoot = path.resolve(gitProbe.stdout.trim(), '..', '..', '..');
      candidates.push(path.join(gitRoot, 'usr', 'bin', 'openssl.exe'));
    }
  } else {
    candidates.push('/opt/homebrew/bin/openssl', '/usr/local/bin/openssl', '/usr/bin/openssl');
  }

  const seen = new Set();
  for (const candidate of candidates.filter(Boolean)) {
    const key = process.platform === 'win32' ? candidate.toLowerCase() : candidate;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = commandResult(candidate, ['version']);
    if (!result.error && result.status === 0) {
      return { command: candidate, version: result.stdout.trim() || result.stderr.trim() };
    }
  }

  return null;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function validDnsName(value) {
  if (!value || value.length > 253) return false;
  return value.split('.').every(label => (
    label.length >= 1
    && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
  ));
}

function buildOpenSslConfig(hostAddress) {
  const localHostname = hostname().trim();
  const dnsNames = ['localhost'];
  if (validDnsName(localHostname) && localHostname.toLowerCase() !== 'localhost') {
    dnsNames.push(localHostname);
  }

  const ipAddresses = ['127.0.0.1'];
  if (hostAddress !== '127.0.0.1') ipAddresses.push(hostAddress);

  const alternateNames = [
    ...dnsNames.map((value, index) => `DNS.${index + 1} = ${value}`),
    ...ipAddresses.map((value, index) => `IP.${index + 1} = ${value}`)
  ];
  const commonName = dnsNames[1] || 'localhost';

  return {
    commonName,
    dnsNames,
    ipAddresses,
    text: `[req]
distinguished_name = distinguished_name
x509_extensions = server_certificate
prompt = no

[distinguished_name]
CN = ${commonName}

[server_certificate]
subjectAltName = @alternate_names
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth

[alternate_names]
${alternateNames.join('\n')}
`
  };
}

function assertGitIgnored() {
  const gitDirectory = path.join(repositoryDir, '.git');
  if (!existsSync(gitDirectory)) {
    console.log('Git metadata was not found; skipping the .gitignore check.');
    return;
  }

  const probe = spawnSync('git', [
    'check-ignore',
    '--quiet',
    '--no-index',
    '--',
    'Northstar/server/certs/key.pem'
  ], {
    cwd: repositoryDir,
    stdio: 'ignore',
    windowsHide: true
  });

  if (probe.status === 0) return;
  if (probe.error?.code === 'ENOENT') {
    console.warn('Warning: Git was not found, so the certificate ignore rule could not be verified.');
    return;
  }

  throw new Error(
    'Northstar/server/certs/ is not protected by .gitignore. Add the ignore rule before generating a key.'
  );
}

function runOpenSsl(command, args, description) {
  const result = commandResult(command, args);
  if (result.error || result.status !== 0) {
    const details = (result.stderr || result.stdout || result.error?.message || 'Unknown OpenSSL error').trim();
    throw new Error(`${description} failed:\n${details}`);
  }
  return result.stdout.trim() || result.stderr.trim();
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  console.log('Northstar HTTPS setup');

  const keyExists = await exists(keyPath);
  const certificateExists = await exists(certificatePath);
  if ((keyExists || certificateExists) && !options.force) {
    throw new Error(
      'A local certificate or key already exists. Nothing was changed. Use --force only if you intend to rotate it.'
    );
  }

  assertGitIgnored();

  const hostAddress = await selectAddress(options.ip);
  const openSsl = findOpenSsl();
  if (!openSsl) {
    throw new Error(
      'OpenSSL was not found. Install OpenSSL or Git for Windows, or set OPENSSL to the executable path.'
    );
  }

  const config = buildOpenSslConfig(hostAddress);
  console.log(`\nUsing ${openSsl.version}`);
  console.log('\nGenerating a certificate for:');
  config.dnsNames.forEach(name => console.log(`  DNS: ${name}`));
  config.ipAddresses.forEach(address => console.log(`  IP:  ${address}`));

  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'northstar-certificate-'));
  const temporaryConfig = path.join(temporaryDirectory, 'openssl.cnf');
  const temporaryKey = path.join(temporaryDirectory, 'key.pem');
  const temporaryCertificate = path.join(temporaryDirectory, 'cert.pem');

  try {
    await writeFile(temporaryConfig, config.text, { encoding: 'utf8', mode: 0o600 });
    runOpenSsl(openSsl.command, [
      'req',
      '-x509',
      '-nodes',
      '-newkey', 'rsa:3072',
      '-sha256',
      '-days', '365',
      '-keyout', temporaryKey,
      '-out', temporaryCertificate,
      '-config', temporaryConfig
    ], 'Certificate generation');

    const verification = runOpenSsl(openSsl.command, [
      'x509',
      '-in', temporaryCertificate,
      '-noout',
      '-subject',
      '-dates',
      '-ext', 'subjectAltName'
    ], 'Certificate verification');

    await mkdir(certificateDir, { recursive: true });
    if (options.force) {
      const previousKey = path.join(temporaryDirectory, 'previous-key.pem');
      const previousCertificate = path.join(temporaryDirectory, 'previous-cert.pem');
      if (keyExists) await copyFile(keyPath, previousKey, fsConstants.COPYFILE_EXCL);
      if (certificateExists) {
        await copyFile(certificatePath, previousCertificate, fsConstants.COPYFILE_EXCL);
      }

      try {
        await copyFile(temporaryKey, keyPath);
        await copyFile(temporaryCertificate, certificatePath);
      } catch (error) {
        if (keyExists) await copyFile(previousKey, keyPath);
        else await rm(keyPath, { force: true });
        if (certificateExists) await copyFile(previousCertificate, certificatePath);
        else await rm(certificatePath, { force: true });
        throw error;
      }
    } else {
      await copyFile(temporaryKey, keyPath, fsConstants.COPYFILE_EXCL);
      try {
        await copyFile(temporaryCertificate, certificatePath, fsConstants.COPYFILE_EXCL);
      } catch (error) {
        await rm(keyPath, { force: true });
        throw error;
      }
    }
    try {
      await chmod(keyPath, 0o600);
    } catch {
      console.warn('Warning: The private-key file permissions could not be restricted on this platform.');
    }

    console.log(`\n${verification}`);
    console.log('\nCertificate created:');
    console.log(`  ${path.relative(repositoryDir, certificatePath)}`);
    console.log(`  ${path.relative(repositoryDir, keyPath)}`);
    console.log('\nStart Northstar from Northstar/server with:');
    console.log(process.platform === 'win32' ? '  npm.cmd start' : '  npm start');
    console.log('\nOpen:');
    console.log('  https://localhost:3000');
    console.log(`  https://${hostAddress}:3000`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exitCode = 1;
});
