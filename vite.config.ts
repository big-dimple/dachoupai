import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const git = (...args: string[]) => {
  try { return execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim(); }
  catch { return 'unknown'; }
};
const buildInfo = {
  version: 'C00',
  revision: git('rev-parse', 'HEAD'),
  modified: git('status', '--porcelain', '--untracked-files=no') !== '',
  builtAt: new Date().toISOString(),
};
let offlineOutputDir = '';
let offlineModels: string[] = [];

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [{
    name: 'offline-models-stay-in-source',
    apply: 'build',
    configResolved(config) {
      const outputDir = resolve(config.root, config.build.outDir);
      const withinRoot = relative(config.root, outputDir);
      if (!withinRoot || isAbsolute(withinRoot) || withinRoot.startsWith(`..${sep}`) || withinRoot === '..') {
        throw new Error('Build output must be inside the workspace, separate from source.');
      }
      const publicRoot = resolve(config.publicDir || 'public');
      const withinPublic = relative(publicRoot, outputDir);
      if (!isAbsolute(withinPublic) && withinPublic !== '..' && !withinPublic.startsWith(`..${sep}`)) {
        throw new Error('Build output cannot overwrite public source assets.');
      }
      offlineOutputDir = outputDir;
      const models = resolve(publicRoot, 'assets/models');
      offlineModels = existsSync(models) ? readdirSync(models).filter(name => name.endsWith('.glb')) : [];
    },
    closeBundle() {
      // Vite copies public verbatim. Preserve the 39 offline originals and remove only their output copies.
      for (const name of offlineModels) {
        const copy = resolve(offlineOutputDir, 'assets/models', name);
        if (!copy.startsWith(offlineOutputDir + sep)) throw new Error('Invalid offline output path.');
        if (existsSync(copy)) unlinkSync(copy);
      }
    },
  }, {
    name: 'playable-build-info',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo, null, 2) });
    },
  }],
});
