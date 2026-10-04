// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Neil Matatall
// Copied from oreoshake-s-team/browslatro at eb3d51f1537e527b3a3b7a06976dc971b0a20979.
// Full notice: public/licenses/browslatro.MIT.txt (shipped with the build).
// Source: src/scoring/reordering.ts, lines 1–14. Algorithm unchanged.
export function insertIdAtIndex<T>(
  ids: ReadonlyArray<T>,
  sourceId: T,
  destIndex: number,
): ReadonlyArray<T> {
  const fromIdx = ids.indexOf(sourceId);
  if (fromIdx < 0) return ids;
  if (destIndex === fromIdx || destIndex === fromIdx + 1) return ids;
  const next = ids.slice();
  next.splice(fromIdx, 1);
  const insertIdx = destIndex > fromIdx ? destIndex - 1 : destIndex;
  next.splice(insertIdx, 0, sourceId);
  return next;
}
