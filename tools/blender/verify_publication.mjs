/** Read-only P0 cleanup check. Run after build; never builds or deletes files. */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { retainedP0Renders } from './verify_assets.mjs';

export const RETAINED_P0_RENDERS = retainedP0Renders;
const renderPrefix = 'assets/renders/p0/';
const textFile = /\.(?:[cm]?js|tsx?|css|html)$/i;

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) rows.push(...await files(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) rows.push(relative);
  }
  return rows.sort();
}

export function isRemovedPreview(pathname) {
  const start = pathname.indexOf(renderPrefix);
  return start >= 0 && !RETAINED_P0_RENDERS.includes(pathname.slice(start + renderPrefix.length));
}

export async function verifyPublication(root, buildDir = 'dist') {
  const build = path.resolve(root, buildDir), errors = [];
  const trees = {
    public: { directory: path.join(root, 'public'), files: await files(path.join(root, 'public')) },
    build: { directory: build, files: await files(build) },
    src: { directory: path.join(root, 'src'), files: await files(path.join(root, 'src')) },
  };
  const renderTrees = {};
  for (const label of ['public', 'build']) {
    const renders = trees[label].files.filter(file => file.startsWith(renderPrefix));
    renderTrees[label] = renders;
    for (const name of RETAINED_P0_RENDERS) {
      if (!renders.includes(renderPrefix + name)) errors.push(`${label}: missing retained ${renderPrefix + name}`);
    }
    for (const file of renders.filter(isRemovedPreview)) errors.push(`${label}: obsolete review preview ${file}`);
  }
  const publishedModels = trees.build.files.filter(file => /\.glb$/i.test(file));
  for (const file of publishedModels) errors.push(`build: offline GLB published ${file}`);
  if (!trees.build.files.includes('index.html')) errors.push('build: missing index.html');

  // Static references are evidence about literals, not proof of every possible runtime URL.
  // Any computed P0 render expression is deliberately unresolved and requires review.
  const references = [];
  for (const label of ['src', 'build']) {
    for (const file of trees[label].files.filter(file => textFile.test(file))) {
      const text = await readFile(path.join(trees[label].directory, file), 'utf8');
      for (const match of text.matchAll(/(?:assets\/)?renders\/p0\/([^\s'"`<>\\)]*)/g)) {
        const assetPath = renderPrefix + match[1];
        references.push({ tree: label, file, path: assetPath });
        if (isRemovedPreview(assetPath)) errors.push(`${label}/${file}: removed or computed P0 render reference ${assetPath}`);
      }
    }
  }
  return {
    status: errors.length ? 'FAIL' : 'PASS', buildDir: path.relative(root, build).replaceAll('\\', '/'),
    retainedP0Renders: RETAINED_P0_RENDERS, renders: renderTrees,
    sourceModelCount: trees.public.files.filter(file => /\.glb$/i.test(file)).length,
    publishedModels, references, errors,
    limitations: ['Literal source/bundle scan; use harness/asset-cleanup.mjs for observed runtime requests.'],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = (name, fallback) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? fallback : process.argv[index + 1];
  };
  const report = await verifyPublication(process.cwd(), option('--build-dir', 'dist'));
  const output = option('--output', 'shots/asset-cleanup/publication.json');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
