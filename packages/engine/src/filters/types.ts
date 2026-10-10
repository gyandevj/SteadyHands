import type { Point } from '../types.ts';

export interface IPointerFilter {
  readonly name: string;
  filter(point: Point): Point;
  reset(point?: Point): void;
}
