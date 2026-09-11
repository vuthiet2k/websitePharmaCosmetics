'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'vercel-dist');
const assetsDir = path.join(rootDir, 'assets');
const port = 4173;
const wsPort = 4174;
const baseUrl = `http://127.0.0.1:${port}`;
const pageExports = [
  { template: 'index', output: 'index.html' },
  { template: 'page.mops-admin', output: 'mops-admin/index.html' },
];

function outputAssetName(sourceName) {
  if (sourceName.endsWith('.scss.bwt')) return sourceName.replace(/\.bwt$/, '.css');
  if (sourceName.endsWith('.js.bwt')) return sourceName.replace(/\.bwt$/, '');
  return sourceName;
}

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolutePath, relativePath) : [relativePath];
  });
}

function waitForServer(process) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server did not start within 30 seconds.')), 30000);
    const attempt = async () => {
      if (process.exitCode !== null) {
        clearTimeout(timeout);
        reject(new Error(`Preview server stopped unexpectedly (exit code ${process.exitCode}).`));
        return;
      }
      try {
        const response = await fetch(`${baseUrl}/?tpl=index`);
        if (response.ok) {
          clearTimeout(timeout);
          resolve();
          return;
        }
      } catch (_) {
        // The process is still starting.
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to export ${url}: HTTP ${response.status}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const preview = spawn(process.execPath, ['dev-server.js'], {
    cwd: rootDir,
    env: { ...process.env, PORT: String(port), WS_PORT: String(wsPort), STATIC_EXPORT: 'true' },
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  try {
    await waitForServer(preview);
    for (const page of pageExports) {
      await download(
        `${baseUrl}/?tpl=${encodeURIComponent(page.template)}`,
        path.join(outputDir, page.output),
      );
    }
    fs.copyFileSync(path.join(outputDir, 'index.html'), path.join(outputDir, '404.html'));

    const assets = listFiles(assetsDir);
    for (const sourceName of assets) {
      const assetName = outputAssetName(sourceName);
      await download(`${baseUrl}/assets/${encodeURIComponent(assetName).replace(/%2F/g, '/')}`, path.join(outputDir, 'assets', assetName));
    }

    console.log(`Vercel static site created: ${path.relative(rootDir, outputDir)}`);
  } finally {
    if (preview.exitCode === null) preview.kill();
  }
}

main().catch((error) => {
  console.error(`Vercel export failed: ${error.message}`);
  process.exitCode = 1;
});
