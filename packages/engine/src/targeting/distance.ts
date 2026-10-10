import type { Point, Rect } from '../types.ts';

/**
 * Calculates the shortest Euclidean distance from a 2D point to the boundary
 * of an axis-aligned rectangle in CSS pixels.
 * Returns 0.0 if the point is within the rectangle.
 */
export function distanceToRect(point: Point, rect: Rect): number {
  if (rect.width <= 0 || rect.height <= 0) {
    return Infinity;
  }

  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  // Compute coordinate deltas to nearest boundary
  const dx = Math.max(left - point.x, 0, point.x - right);
  const dy = Math.max(top - point.y, 0, point.y - bottom);

  if (dx === 0 && dy === 0) {
    return 0.0;
  }

  return Math.sqrt(dx * dx + dy * dy);
}
