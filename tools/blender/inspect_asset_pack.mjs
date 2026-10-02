/** Read-only by default; --optimize is the explicit legacy asset-production mode.
 * This mode writes GLBs/manifest/logs and is never invoked by the Python builder.
 * --write-inventory refreshes only the separate current inventory.
 * Default verification shares verify_assets.mjs and never repairs inputs.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, sparse, weld, unweld, tangents } from '@gltf-transform/functions';
import validator from 'gltf-validator';
import sharp from 'sharp';
import mikktspace from 'mikktspace';

import { runAssetVerificationCLI, filesIn, p0PublicationErrors, packManifestErrors } from './verify_assets.mjs';

async function optimizePack() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const assetsRoot = path.join(root, 'public/assets');
  const manifestPath = path.join(assetsRoot, 'models/asset-pack-v1.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  // Reject a stale producer manifest or public review files before the first write.
  const actual = (await filesIn(assetsRoot)).map(file => path.relative(root, file).replaceAll('\\', '/'));
  const errors = [...p0PublicationErrors(actual), ...await packManifestErrors(root, actual, { checkBytes: false })];
  if (errors.length) throw new Error(errors.join('\n'));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const temp = path.join(root, 'shots/p0-build');
  await fs.mkdir(temp, { recursive: true });
  const fail = message => { throw new Error(message); };
  let totalBytes = 0;
  let count = 0;
  for (const entry of manifest.assets) {
    const file = path.join(assetsRoot, entry.file);
    if (entry.file.endsWith('.glb')) {
      let doc = await io.read(file);
      if (entry.clips) {
        const timeAccessors = new Map();
        for (const animation of doc.getRoot().listAnimations()) {
          for (const sampler of animation.listSamplers()) {
            const input = sampler.getInput();
            const offset = Math.min(...input.getArray());
            if (offset < 1e-6) continue;
            if (!timeAccessors.has(input)) {
              timeAccessors.set(input, doc.createAccessor('ClipTimeZero')
                .setType('SCALAR').setBuffer(input.getBuffer())
                .setArray(Float32Array.from(input.getArray(), value => value - offset)));
            }
            sampler.setInput(timeAccessors.get(input));
          }
        }
        // Blender 5.2 NLA object tracks export correctly, but Key NLA sampling
        // collapses the bend weights to the final frame. Bake the source curve
        // into the existing glTF weight channel before lossless resampling.
        const bend = doc.getRoot().listAnimations().find(animation => animation.getName() === 'bend');
        const channel = bend?.listChannels().find(channel => channel.getTargetPath() === 'weights');
        if (!channel) fail('Missing bend weight channel');
        const frames = entry.clips.find(clip => clip.name === 'bend').fps;
        const time = new Float32Array(frames + 1);
        const weights = new Float32Array((frames + 1) * 3);
        for (let i = 0; i <= frames; i++) {
          time[i] = i / frames;
          const value = Math.sin(Math.PI * time[i]);
          weights.set([value, value * .35, value * .35], i * 3);
        }
        const buffer = doc.getRoot().listBuffers()[0];
        channel.getSampler()
          .setInput(doc.createAccessor('BendTime').setType('SCALAR').setArray(time).setBuffer(buffer))
          .setOutput(doc.createAccessor('BendWeights').setType('SCALAR').setArray(weights).setBuffer(buffer))
          .setInterpolation('LINEAR');
      }
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const primitive of mesh.listPrimitives()) primitive.setAttribute('TANGENT', null);
      }
      if (doc.getRoot().listMaterials().some(material => material.getNormalTexture())) {
        await doc.transform(unweld(), tangents({ generateTangents: mikktspace.generateTangents }));
        for (const mesh of doc.getRoot().listMeshes()) {
          for (const primitive of mesh.listPrimitives()) {
            if (!primitive.getMaterial()?.getNormalTexture()) primitive.setAttribute('TANGENT', null);
          }
        }
      }
      await doc.transform(weld(), dedup(),
        prune({ keepAttributes: true, keepLeaves: true, keepSolidTextures: true }),
        resample(), sparse());
      await io.write(file, doc);
      const bytes = await fs.readFile(file);
      const report = await validator.validateBytes(new Uint8Array(bytes), { maxIssues: 50 });
      if (report.issues.numErrors) {
        fail(`${entry.file}: ${JSON.stringify(report.issues.messages.filter(m => m.severity === 0))}`);
      }
      doc = await io.read(file);
      let triangles = 0;
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const primitive of mesh.listPrimitives()) {
          if (primitive.getMode() !== 4) fail(`${entry.file}: non-triangle primitive`);
          triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3;
          if (!primitive.getAttribute('TEXCOORD_0') || !primitive.getAttribute('NORMAL')) {
            fail(`${entry.file}: missing UV0 / normals`);
          }
        }
      }
      const budget = entry.category === 'prop' ? 5000
        : entry.category === 'card' || entry.category === 'animation' ? 15000 : 20000;
      if (triangles > budget) fail(`${entry.file}: ${triangles} tris exceeds ${budget}`);
      const names = doc.getRoot().listNodes().map(n => n.getName());
      for (const name of entry.replaceableNodes ?? []) {
        if (!names.includes(name)) fail(`${entry.file}: missing replaceable ${name}`);
      }
      if (entry.morphTargets) {
        const mesh = doc.getRoot().listMeshes()[0];
        if (mesh.listPrimitives().some(p => p.listTargets().length !== 3)) fail('Card morph contract broken');
      }
      const clips = doc.getRoot().listAnimations().map(a => a.getName()).sort();
      if (entry.clips && JSON.stringify(clips) !== JSON.stringify(entry.clips.map(c => c.name).sort())) {
        fail(`11-clip contract broken: ${clips}`);
      }
      if (entry.clips) {
        const bend = doc.getRoot().listAnimations().find(animation => animation.getName() === 'bend');
        const weights = bend.listChannels().find(channel => channel.getTargetPath() === 'weights')
          ?.getSampler().getOutput().getArray();
        if (!weights || Math.max(...weights) < .8) fail('Bend clip has no visible morph motion');
        for (const animation of doc.getRoot().listAnimations()) {
          const duration = Math.max(...animation.listSamplers().map(s => Math.max(...s.getInput().getArray())));
          if (Math.abs(duration - 1) > .001) fail(`Unexpected clip duration: ${animation.getName()}`);
        }
      }
      // Same installed CLI used by `npx gltf-transform inspect <glb>`.
      const inspected = spawnSync(process.execPath,
        [path.join(root, 'node_modules/@gltf-transform/cli/bin/cli.js'), 'inspect', file],
        { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      if (inspected.status !== 0) fail(`inspect failed: ${entry.file}\n${inspected.stderr}`);
      await fs.writeFile(path.join(temp, path.basename(entry.file) + '.inspect.txt'), inspected.stdout);
      entry.triangles = triangles;
      entry.validation = { gltfTransformInspect: 'passed', khronosErrors: 0,
        khronosWarnings: report.issues.numWarnings, animationClips: clips };
      console.log(`${++count} ${entry.file}: ${triangles} tris, ${bytes.length} bytes, valid`);
    }
    if (/\.(png|webp)$/.test(entry.file)) {
      const metadata = await sharp(file).metadata();
      entry.width = metadata.width;
      entry.height = metadata.height;
      entry.alpha = metadata.hasAlpha;
      if (entry.file.startsWith('textures/') && Math.max(metadata.width, metadata.height) > 2048) fail('Texture > 2048');
      if (/background-(far|mid|near)/.test(entry.file) && (metadata.width !== 1920 || metadata.height !== 1080)) fail('Background dimensions');
      if (/background-(mid|near)/.test(entry.file) && !metadata.hasAlpha) fail('Parallax layer has no alpha');
      if (entry.file.endsWith('.avatar.webp') && (metadata.width !== 512 || metadata.height !== 512)) fail('Avatar dimensions');
      if (entry.file.startsWith('sprites/')) {
        if (!metadata.hasAlpha || metadata.width !== 1024 || metadata.height !== 1024) fail('Sprite atlas contract');
      }
    }
    entry.bytes = (await fs.stat(file)).size;
    totalBytes += entry.bytes;
    if (/renders\/p0\/background-/.test(entry.file) && entry.bytes > 2_000_000) fail('Background exceeds 2 MB');
  }
  manifest.validation = { models: count, totalAssetBytes: totalBytes, budgetBytes: 20_000_000,
    geometryCompression: 'none (no decoder dependency)',
    checks: 'gltf-transform inspect + Khronos validator + topology/UV/morph/clip/node budgets',
    tangentSpace: 'MikkTSpace on Normal-mapped primitives' };
  // Include the inventory itself; iterate to stabilize the byte-count field.
  for (let i = 0; i < 3; i++) {
    manifest.validation.totalAssetBytes = totalBytes + Buffer.byteLength(JSON.stringify(manifest, null, 2) + '\n');
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  totalBytes += (await fs.stat(manifestPath)).size;
  if (totalBytes > 20_000_000) fail(`Asset pack ${totalBytes} bytes exceeds 20 MB`);
  console.log(`PACK_VALID: ${count} GLBs, ${(totalBytes / 1_000_000).toFixed(2)} / 20 MB`);
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--optimize') await optimizePack();
else process.exitCode = await runAssetVerificationCLI(args, 'inspect_asset_pack.mjs');
