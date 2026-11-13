import * as esbuild from 'esbuild';

async function buildElectron() {
  try {
    await esbuild.build({
      entryPoints: {
        main: 'electron/main.ts',
        preload: 'electron/preload.ts',
      },
      outdir: 'dist-electron',
      outExtension: { '.js': '.cjs' },
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      external: ['electron'],
    });
    console.log('✓ Electron main & preload compiled to dist-electron/');
  } catch (err) {
    console.error('Failed to compile Electron files:', err);
    process.exit(1);
  }
}

buildElectron();

