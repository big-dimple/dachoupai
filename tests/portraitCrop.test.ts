import { describe, expect, it } from 'vitest';
import { portraitCoverCrop, portraitSquareCrop } from '../src/game/portraitCrop';

// 真实立绘尺寸与选角页展示框尺寸
const SRC_W = 1086;
const SRC_H = 1448;
const BOX_W = 352;
const BOX_H = 158;

describe('portraitCoverCrop（选角页 cover 裁切）', () => {
  it('小 focusY 把裁切窗口锚在立绘上缘，保住头部', () => {
    const rect = portraitCoverCrop(SRC_W, SRC_H, BOX_W, BOX_H, 0.5, 0.1);
    // 窗口上缘必须落在头部区域（原图 15% 以内），而不是胸腹
    expect(rect.y).toBeLessThan(SRC_H * 0.15);
    // 对焦点本身必须落在裁切窗口内
    const focalYpx = 0.1 * SRC_H;
    expect(rect.y).toBeLessThanOrEqual(focalYpx);
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(focalYpx);
  });

  it('focusY=0 时从图片最顶端开始裁，帽饰完整保留', () => {
    const rect = portraitCoverCrop(SRC_W, SRC_H, BOX_W, BOX_H, 0.5, 0);
    expect(rect.y).toBe(0);
  });

  it('focusY=1 时窗口贴住图片底缘', () => {
    const rect = portraitCoverCrop(SRC_W, SRC_H, BOX_W, BOX_H, 0.5, 1);
    expect(rect.y + rect.height).toBeCloseTo(SRC_H, 5);
  });

  it('cover 后窗口尺寸等比，绝不拉伸变形', () => {
    const rect = portraitCoverCrop(SRC_W, SRC_H, BOX_W, BOX_H, 0.52, 0.08);
    expect(rect.width / rect.height).toBeCloseTo(BOX_W / BOX_H, 5);
  });

  it('展示框比原图大时直接放大铺满，不裁切', () => {
    const rect = portraitCoverCrop(100, 100, 200, 200, 0.5, 0.5);
    expect(rect).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('越界的 focal 值会被钳制，不会裁出图片外', () => {
    const rect = portraitCoverCrop(SRC_W, SRC_H, BOX_W, BOX_H, 0.5, 2);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(SRC_H + 1e-6);
  });
});

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
