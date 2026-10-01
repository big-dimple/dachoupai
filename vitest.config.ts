import {configDefaults,defineConfig,mergeConfig} from 'vitest/config';
import viteConfig from './vite.config';

// CLI asset fixtures use node:test through test:assets; game suites use Vitest.
export default mergeConfig(viteConfig,defineConfig({
  test:{include:configDefaults.include.map(pattern=>`tests/${pattern}`)},
}));
