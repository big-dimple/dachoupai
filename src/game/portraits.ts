import Phaser from 'phaser';
import type { CharacterDefinition, CharacterId } from './characters';

export function portraitKey(id: CharacterId): string {
  return `portrait-${id}`;
}

export function queuePortraitLoads(scene: Phaser.Scene, characters: CharacterDefinition[]): void {
  characters.forEach((character) => {
    if (!scene.textures.exists(portraitKey(character.id))) {
      scene.load.image(portraitKey(character.id), character.portrait);
    }
  });
}

export function hasPortrait(scene: Phaser.Scene, id: CharacterId): boolean {
  return scene.textures.exists(portraitKey(id));
}

/**
 * 把立绘以“等比 cover、纵向保头”的方式装进 w×h 的展示框：
 * - 绝不拉伸变形
 * - 裁切纵向偏置：80% 的溢出量从下缘切掉，保住头部与上半身主体
 * - 用 setCrop 裁掉溢出部分，再精确缩放到展示框尺寸
 * 纹理缺失时退化为 accent 色占位板 + 首字，保证任何情况下界面不空、不炸。
 */
export function addPortraitInBox(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  character: CharacterDefinition,
  centerX: number,
  centerY: number,
  boxW: number,
  boxH: number,
): void {
  const key = portraitKey(character.id);
  if (!scene.textures.exists(key)) {
    const fallback = scene.add.rectangle(centerX, centerY, boxW, boxH, character.accent, 0.16)
      .setStrokeStyle(2, character.accent, 0.55);
    const initial = scene.add.text(centerX, centerY, character.name.slice(0, 1), {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: `${Math.floor(boxH * 0.4)}px`,
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add([fallback, initial]);
    return;
  }

  const texture = scene.textures.get(key);
  const frame = texture.getSourceImage() as HTMLImageElement;
  const srcW = frame.width;
  const srcH = frame.height;
  const coverScale = Math.max(boxW / srcW, boxH / srcH);
  const drawW = srcW * coverScale;
  const drawH = srcH * coverScale;

  // 裁掉溢出部分；纵向向底部偏置（offsetY 取溢出量的 80% 留在下侧），保住头部主体
  const offsetX = (drawW - boxW) / 2;
  const offsetY = (drawH - boxH) * 0.8;

  const image = scene.add.image(centerX, centerY, key);
  image.setCrop(
    Math.max(0, offsetX / coverScale),
    Math.max(0, offsetY / coverScale),
    boxW / coverScale,
    boxH / coverScale,
  );
  image.setDisplaySize(boxW, boxH);

  container.add(image);
}
