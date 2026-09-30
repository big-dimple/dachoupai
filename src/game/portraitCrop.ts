/**
 * 立绘裁切的纯几何计算，不依赖 Phaser，便于单元测试。
 *
 * 约定：focal (0,0) 是原图左上角，(0.5,0.5) 是几何中心，
 * (x,0.1) 之类的小 Y 值对应竖版全身立绘的头部区域。
 */

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * 正方形头像裁切：取原图内尽可能大的正方形，按 focal 锚定位置。
 * 竖版全身立绘配合小 focusY，就能把脸放进小头像，而不是胸口。
 */
export function portraitSquareCrop(
  srcW: number,
  srcH: number,
  focusX: number,
  focusY: number,
): CropRect {
  const side = Math.min(srcW, srcH);
  return {
    x: clamp(focusX * srcW - side / 2, 0, srcW - side),
    y: clamp(focusY * srcH - side / 2, 0, srcH - side),
    width: side,
    height: side,
  };
}
