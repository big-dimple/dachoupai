import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';

const git = (...args: string[]) => {
  try { return execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim(); }
  catch { return 'unknown'; }
};
const buildInfo = {
  version: 'P00',
  revision: git('rev-parse', 'HEAD'),
  modified: git('status', '--porcelain', '--untracked-files=no') !== '',
  builtAt: new Date().toISOString(),
};

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0' },
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [{
    name: 'playable-build-info',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo, null, 2) });
    },
  }],
});
