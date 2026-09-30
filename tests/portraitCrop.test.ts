import { describe, expect, it } from 'vitest';
import { portraitSquareCrop } from '../src/game/portraitCrop';

// 真实立绘尺寸与选角页展示框尺寸
const SRC_W = 1086;
const SRC_H = 1448;

describe('portraitSquareCrop（HUD 正方头像裁切）', () => {
  it('小 focusY 让正方形取立绘上段，把脸放进头像', () => {
    const rect = portraitSquareCrop(SRC_W, SRC_H, 0.52, 0.08);
    expect(rect.width).toBe(rect.height);
    expect(rect.y).toBe(0);
    const focalYpx = 0.08 * SRC_H;
    expect(rect.y).toBeLessThanOrEqual(focalYpx);
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(focalYpx);
  });

  it('中心对焦（旧行为）在竖版全身图上只能截到胸口', () => {
    const rect = portraitSquareCrop(SRC_W, SRC_H, 0.5, 0.5);
    // 旧中心裁切窗口上缘在 181px，人物脸部（~116-174px 以下）正好被切掉
    expect(rect.y).toBeGreaterThan(0.1 * SRC_H);
  });
});
