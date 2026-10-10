import { Point } from '../types/index.js';

const CURSOR_STYLE_ID = 'steadyhand-cursor-style';

export class PointerInputManager {
  private lastPoint: Point = { x: 0, y: 0, tMs: 0 };
  private onMoveCallbacks: Array<(p: Point) => void> = [];
  private onPrimaryDownCallbacks: Array<(p: Point, e: MouseEvent) => void> = [];
  private onPrimaryUpCallbacks: Array<(p: Point, e: MouseEvent) => void> = [];
  private listening = false;

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  getLastPoint(): Point {
    return this.lastPoint;
  }

  start(): void {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true, capture: true });
    window.addEventListener('mousedown', this.handleMouseDown, { capture: true });
    window.addEventListener('mouseup', this.handleMouseUp, { capture: true });
  }

  stop(): void {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
    window.removeEventListener('mousedown', this.handleMouseDown, { capture: true });
    window.removeEventListener('mouseup', this.handleMouseUp, { capture: true });
    this.restoreNativeCursor();
  }

  onMove(cb: (p: Point) => void): () => void {
    this.onMoveCallbacks.push(cb);
    return () => {
      this.onMoveCallbacks = this.onMoveCallbacks.filter((c) => c !== cb);
    };
  }

  onPrimaryDown(cb: (p: Point, e: MouseEvent) => void): () => void {
    this.onPrimaryDownCallbacks.push(cb);
    return () => {
      this.onPrimaryDownCallbacks = this.onPrimaryDownCallbacks.filter((c) => c !== cb);
    };
  }

  onPrimaryUp(cb: (p: Point, e: MouseEvent) => void): () => void {
    this.onPrimaryUpCallbacks.push(cb);
    return () => {
      this.onPrimaryUpCallbacks = this.onPrimaryUpCallbacks.filter((c) => c !== cb);
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    this.lastPoint = {
      x: e.clientX,
      y: e.clientY,
      tMs: performance.now()
    };
    for (const cb of this.onMoveCallbacks) {
      cb(this.lastPoint);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Primary button only
    this.lastPoint = {
      x: e.clientX,
      y: e.clientY,
      tMs: performance.now()
    };
    for (const cb of this.onPrimaryDownCallbacks) {
      cb(this.lastPoint, e);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return; // Primary button only
    this.lastPoint = {
      x: e.clientX,
      y: e.clientY,
      tMs: performance.now()
    };
    for (const cb of this.onPrimaryUpCallbacks) {
      cb(this.lastPoint, e);
    }
  }

  hideNativeCursor(): void {
    if (document.getElementById(CURSOR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = CURSOR_STYLE_ID;
    style.textContent = `
      html, body, *:not(steadyhand-overlay-host) {
        cursor: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  restoreNativeCursor(): void {
    const existing = document.getElementById(CURSOR_STYLE_ID);
    if (existing) {
      existing.remove();
    }
  }
}

export const pointerInput = new PointerInputManager();
