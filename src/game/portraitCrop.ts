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
 * cover 裁切：等比缩放填满 w×h 展示框，按 focal 锚定裁掉溢出部分。
 * focal 点最终落在展示框内 (focusX·w, focusY·h) 的位置——
 * 即 focusY 越小，保住的越是立绘上缘（头部）；focusY 越大越往下切。
 * 返回的是原图像素坐标系的裁切矩形。
 */
export function portraitCoverCrop(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
  focusX: number,
  focusY: number,
): CropRect {
  const scale = Math.max(boxW / srcW, boxH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const overflowX = Math.max(0, drawW - boxW);
  const overflowY = Math.max(0, drawH - boxH);
  const offsetX = clamp(overflowX * focusX, 0, overflowX);
  const offsetY = clamp(overflowY * focusY, 0, overflowY);
  return {
    x: offsetX / scale,
    y: offsetY / scale,
    width: boxW / scale,
    height: boxH / scale,
  };
}

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
