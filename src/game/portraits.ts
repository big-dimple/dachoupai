import Phaser from 'phaser';
import type { CharacterDefinition, CharacterId } from './characters';
import { portraitCoverCrop } from './portraitCrop';

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
 * 把立绘以“等比 cover、按角色 focal 点锚定”的方式装进 w×h 的展示框：
 * - 绝不拉伸变形
 * - 竖版全身立绘配小 portraitFocusY（0.07~0.11），保住头部与帽饰
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

  const crop = portraitCoverCrop(
    frame.width,
    frame.height,
    boxW,
    boxH,
    character.portraitFocusX,
    character.portraitFocusY,
  );
  const image = scene.add.image(centerX, centerY, key);
  image.setCrop(crop.x, crop.y, crop.width, crop.height);
  image.setDisplaySize(boxW, boxH);

  container.add(image);
}
