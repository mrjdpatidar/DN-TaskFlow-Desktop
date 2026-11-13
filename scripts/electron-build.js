import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function computeSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function runStep(command, description) {
  console.log(`\n======================================================`);
  console.log(`🚀 [Step] ${description}`);
  console.log(`   Running: ${command}`);
  console.log(`======================================================\n`);
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });
}

async function main() {
  const startTime = Date.now();
  console.log('\n======================================================');
  console.log('⚡ DN TaskFlow - Automated Electron Build & Versioning');
  console.log('======================================================\n');

  // 1. Read package.json
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json not found in root directory');
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version || '1.0.0';
  const productName = pkg.build?.productName || 'DN TaskFlow';
  console.log(`📦 Application: ${productName}`);
  console.log(`🔖 Target Version: v${version}`);

  // 2. Build Web Assets + Electron Code
  runStep('npm run build:all', 'Compiling Vite Web Bundle & Electron Main/Preload');

  // 3. Package Windows Executable
  runStep('npx electron-builder --win', 'Packaging Windows Installer (.exe)');

  // 4. Locate Generated .exe in release/
  const releaseDir = path.join(rootDir, 'release');
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory "${releaseDir}" was not created by electron-builder.`);
  }

  // Look for installer executable
  const files = fs.readdirSync(releaseDir);
  const expectedExeName = `${productName}-Setup-${version}.exe`;
  let exeFile = files.find((f) => f === expectedExeName);

  if (!exeFile) {
    // Fallback: any setup exe for this version or any .exe
    exeFile = files.find((f) => f.endsWith('.exe') && f.includes(version)) ||
              files.find((f) => f.endsWith('.exe') && !f.includes('unpacked'));
  }

  if (!exeFile) {
    throw new Error(`No generated .exe found in ${releaseDir}`);
  }

  const exePath = path.join(releaseDir, exeFile);
  const fileStats = fs.statSync(exePath);
  const fileSizeBytes = fileStats.size;
  const fileSizeFormatted = formatBytes(fileSizeBytes);
  console.log(`\n🔍 Found generated executable: ${exeFile}`);
  console.log(`   Size: ${fileSizeFormatted} (${fileSizeBytes} bytes)`);

  // 5. Calculate SHA-256 Checksum
  console.log('🔐 Computing SHA-256 checksum...');
  const sha256 = computeSha256(exePath);
  console.log(`   SHA-256: ${sha256}`);

  // 6. Update version.json
  const downloadUrl = `https://app.drunall.com/taskflow/downloads/${encodeURIComponent(exeFile)}`;
  const nowIso = new Date().toISOString();

  // Load existing version.json from php-api or public
  const phpVersionPath = path.join(rootDir, 'php-api', 'version.json');
  const publicVersionPath = path.join(rootDir, 'public', 'version.json');

  let existingManifest = null;
  if (fs.existsSync(phpVersionPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(phpVersionPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ Could not parse existing php-api/version.json');
    }
  } else if (fs.existsSync(publicVersionPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(publicVersionPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️ Could not parse existing public/version.json');
    }
  }

  // Extract releases list
  let releases = [];
  if (Array.isArray(existingManifest)) {
    releases = [...existingManifest];
  } else if (existingManifest && Array.isArray(existingManifest.releases)) {
    releases = [...existingManifest.releases];
  } else if (existingManifest && existingManifest.version) {
    // Single object without releases array: wrap it
    const { releases: _, ...single } = existingManifest;
    releases = [single];
  }

  // Find if this version already exists in releases list
  const existingIndex = releases.findIndex((r) => r && r.version === version);
  let actionTaken = '';
  let releaseNotes = '';

  // Check command line arg: --notes="Custom release notes"
  const notesArg = process.argv.find((a) => a.startsWith('--notes='));
  if (notesArg) {
    releaseNotes = notesArg.split('=')[1]?.replace(/^"|"$/g, '').trim();
  }

  if (existingIndex !== -1) {
    // UPDATE EXISTING ENTRY
    actionTaken = 'UPDATED (Same version detected, refreshed in-place)';
    const existing = releases[existingIndex];
    releases[existingIndex] = {
      ...existing,
      version: version,
      name: existing.name || `${productName} ${version}`,
      notes: releaseNotes || existing.notes || `⚡ ${productName} v${version} Production updates and optimizations.`,
      pub_date: nowIso,
      url: downloadUrl,
      filename: exeFile,
      size: fileSizeFormatted,
      size_bytes: fileSizeBytes,
      sha256: sha256,
      mandatory: existing.mandatory ?? false,
      min_os_version: existing.min_os_version || '10.0.0',
    };
  } else {
    // ADD NEW OBJECT
    actionTaken = 'ADDED (New version detected, appended new object)';
    const newEntry = {
      version: version,
      name: `${productName} ${version}`,
      notes: releaseNotes || `⚡ ${productName} v${version} Production Release with new features and performance enhancements.`,
      pub_date: nowIso,
      url: downloadUrl,
      filename: exeFile,
      size: fileSizeFormatted,
      size_bytes: fileSizeBytes,
      sha256: sha256,
      mandatory: false,
      min_os_version: '10.0.0',
    };
    releases.unshift(newEntry);
  }

  // Ensure latest release is at top of releases
  const currentRelease = releases.find((r) => r.version === version) || releases[0];

  // Construct master manifest supporting both flat structure & releases array
  const updatedManifest = {
    version: currentRelease.version,
    name: currentRelease.name,
    notes: currentRelease.notes,
    pub_date: currentRelease.pub_date,
    url: currentRelease.url,
    filename: currentRelease.filename,
    size: currentRelease.size,
    size_bytes: currentRelease.size_bytes,
    sha256: currentRelease.sha256,
    mandatory: currentRelease.mandatory ?? false,
    min_os_version: currentRelease.min_os_version || '10.0.0',
    releases: releases,
  };

  const manifestJson = JSON.stringify(updatedManifest, null, 2) + '\n';

  // 7. Write to target locations
  const targetPaths = [
    path.join(rootDir, 'php-api', 'version.json'),
    path.join(rootDir, 'public', 'version.json'),
    path.join(rootDir, 'release', 'version.json'),
  ];

  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    targetPaths.push(path.join(distDir, 'version.json'));
  }

  const writtenTo = [];
  for (const targetPath of targetPaths) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, manifestJson, 'utf-8');
    writtenTo.push(path.relative(rootDir, targetPath));
  }

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  // 8. Output Summary
  console.log('\n======================================================');
  console.log('🎉 BUILD & VERSIONING COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`📦 Application   : ${productName}`);
  console.log(`🏷️  Version       : ${version}`);
  console.log(`📝 Action        : ${actionTaken}`);
  console.log(`💿 Executable    : ${exeFile}`);
  console.log(`⚖️  File Size     : ${fileSizeFormatted}`);
  console.log(`🔑 SHA-256       : ${sha256}`);
  console.log(`🌐 Download URL  : ${downloadUrl}`);
  console.log(`⏱️  Total Time    : ${elapsedSeconds}s`);
  console.log('📁 Updated Manifests:');
  writtenTo.forEach((p) => console.log(`   ✓ ${p}`));
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Build failed:', err);
  process.exit(1);
});

