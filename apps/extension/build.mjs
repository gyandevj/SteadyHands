import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWatch = process.argv.includes('--watch');
const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(__dirname, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyStaticFiles() {
  ensureDir(distDir);
  ensureDir(distAssetsDir);

  // Copy manifest.json
  fs.copyFileSync(
    path.join(__dirname, 'manifest.json'),
    path.join(distDir, 'manifest.json')
  );

  // Copy popup.html & options.html
  fs.copyFileSync(
    path.join(__dirname, 'popup.html'),
    path.join(distDir, 'popup.html')
  );
  fs.copyFileSync(
    path.join(__dirname, 'options.html'),
    path.join(distDir, 'options.html')
  );

  // Copy assets
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    for (const f of files) {
      fs.copyFileSync(path.join(assetsDir, f), path.join(distAssetsDir, f));
    }
  }

  console.log('[SteadyHand] Static files copied to dist/');
}

async function build() {
  console.log('[SteadyHand] Building extension bundle...');
  copyStaticFiles();

  const commonOptions = {
    bundle: true,
    target: 'chrome116',
    sourcemap: true,
    minify: false,
    logLevel: 'info'
  };

  // 1. Worker (ES module)
  const workerBuild = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(__dirname, 'src/background/serviceWorker.ts')],
    outfile: path.join(distDir, 'worker.js'),
    format: 'esm'
  });

  // 2. Content script (IIFE standalone single bundle)
  const contentBuild = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(__dirname, 'src/content/index.ts')],
    outfile: path.join(distDir, 'content.js'),
    format: 'iife'
  });

  // 3. Popup UI
  const popupBuild = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(__dirname, 'src/entrypoints/popup.tsx')],
    outfile: path.join(distDir, 'popup.js'),
    format: 'esm'
  });

  // 4. Options UI
  const optionsBuild = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(__dirname, 'src/entrypoints/options.tsx')],
    outfile: path.join(distDir, 'options.js'),
    format: 'esm'
  });

  if (isWatch) {
    console.log('[SteadyHand] Watching for changes...');
    await Promise.all([
      workerBuild.watch(),
      contentBuild.watch(),
      popupBuild.watch(),
      optionsBuild.watch()
    ]);
  } else {
    await Promise.all([
      workerBuild.rebuild(),
      contentBuild.rebuild(),
      popupBuild.rebuild(),
      optionsBuild.rebuild()
    ]);
    await Promise.all([
      workerBuild.dispose(),
      contentBuild.dispose(),
      popupBuild.dispose(),
      optionsBuild.dispose()
    ]);
    console.log('[SteadyHand] Build completed successfully into dist/');
  }
}

build().catch((err) => {
  console.error('[SteadyHand] Build failed:', err);
  process.exit(1);
});
