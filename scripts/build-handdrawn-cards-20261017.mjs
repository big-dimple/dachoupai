import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sourceDir = 'art/sources/handdrawn-runtime-20261017-half1';
const outCardsDir = 'public/assets/handdrawn-p08/cards';
const manifestPath = 'public/assets/handdrawn-p08/manifest.json';

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg')).sort();

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const batchManifest = {
  schemaVersion: 1,
  batch: 'handdrawn-runtime-20261017-half1',
  date: '2026-10-17',
  scope: 'First half of 72 card illustrations (A01-C12, 36 cards). High-resolution 1122x1402 originals converted to optimized WebP thumbnails (128x160) and details (615x768).',
  totalCards: files.length,
  assets: []
};

for (const file of files) {
  const parts = file.split('_');
  const index = parts[0];
  const cardId = parts[1];
  const rawName = parts.slice(2).join('_').replace(/\.(png|jpg)$/, '');

  const srcPath = path.join(sourceDir, file);
  const srcBuf = fs.readFileSync(srcPath);
  const srcHash = sha256(srcBuf);
  const srcMeta = await sharp(srcBuf, { failOn: 'none' }).metadata();

  // Compress thumbnail (128x160)
  const thumbBuf = await sharp(srcBuf, { failOn: 'none' })
    .resize(128, 160, { fit: 'cover', position: 'center' })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();
  const thumbHash = sha256(thumbBuf);

  // Compress detail (615x768)
  const detailBuf = await sharp(srcBuf, { failOn: 'none' })
    .resize(615, 768, { fit: 'cover', position: 'center' })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
  const detailHash = sha256(detailBuf);

  const thumbDest = path.join(outCardsDir, `${cardId}.thumbnail.webp`);
  const detailDest = path.join(outCardsDir, `${cardId}.detail.webp`);

  fs.writeFileSync(thumbDest, thumbBuf);
  fs.writeFileSync(detailDest, detailBuf);

  // Special case for a11 legacy compatibility
  if (cardId === 'a11') {
    fs.writeFileSync(path.join(outCardsDir, 'a11-v2-ea9e76e4a31f.thumbnail.webp'), thumbBuf);
    fs.writeFileSync(path.join(outCardsDir, 'a11-v2-aa4e6a9988ab.detail.webp'), detailBuf);
  }

  // Update manifest entry
  const asset = manifest.assets.find(a => a.id === cardId);
  if (!asset) {
    console.error(`Asset not found in manifest: ${cardId}`);
    continue;
  }

  const thumbOut = asset.outputs.find(o => o.purpose === 'thumbnail');
  if (thumbOut) {
    thumbOut.bytes = thumbBuf.length;
    thumbOut.sha256 = thumbHash;
    thumbOut.width = 128;
    thumbOut.height = 160;
  }

  const detailOut = asset.outputs.find(o => o.purpose === 'detail');
  if (detailOut) {
    detailOut.bytes = detailBuf.length;
    detailOut.sha256 = detailHash;
    detailOut.width = 615;
    detailOut.height = 768;
  }

  batchManifest.assets.push({
    id: cardId,
    index,
    name: rawName,
    sourceFile: file,
    sourceSHA256: srcHash,
    sourceWidth: srcMeta.width,
    sourceHeight: srcMeta.height,
    sourceBytes: srcBuf.length,
    thumbnail: {
      path: `cards/${cardId}.thumbnail.webp`,
      width: 128,
      height: 160,
      bytes: thumbBuf.length,
      sha256: thumbHash
    },
    detail: {
      path: `cards/${cardId}.detail.webp`,
      width: 615,
      height: 768,
      bytes: detailBuf.length,
      sha256: detailHash
    }
  });

  console.log(`Processed ${index} [${cardId}] ${rawName}: thumb=${thumbBuf.length}B, detail=${detailBuf.length}B`);
}

// Recompute total runtime bytes
manifest.runtimeBytes = manifest.assets.reduce((sum, a) => sum + a.outputs.reduce((s, o) => s + o.bytes, 0), 0);

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(sourceDir, 'manifest.json'), JSON.stringify(batchManifest, null, 2) + '\n');

console.log('Done! Updated manifest.runtimeBytes =', manifest.runtimeBytes);
