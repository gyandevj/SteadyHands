import { Target } from '../types/index.js';
import { classifyElement } from './policy.js';

export interface TargetRecord {
  target: Target;
  element: HTMLElement;
}

const MAX_TARGETS = 250;

export class TargetRegistry {
  private elementToId = new WeakMap<HTMLElement, string>();
  private idToRecord = new Map<string, TargetRecord>();
  private nextId = 1;

  scan(root: Document | HTMLElement = document): Map<string, TargetRecord> {
    const candidates = root.querySelectorAll('input, textarea, button, [role]');
    const newRecords = new Map<string, TargetRecord>();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    for (let i = 0; i < candidates.length; i++) {
      if (newRecords.size >= MAX_TARGETS) break;

      const el = candidates[i] as HTMLElement;
      const { eligible, kind, dwellAllowed } = classifyElement(el);
      if (!eligible || !kind) continue;

      const bcr = el.getBoundingClientRect();
      if (bcr.width <= 0 || bcr.height <= 0) continue;

      // Viewport clipping check with 100px margin
      if (
        bcr.bottom < -100 ||
        bcr.top > viewportHeight + 100 ||
        bcr.right < -100 ||
        bcr.left > viewportWidth + 100
      ) {
        continue;
      }

      let id = this.elementToId.get(el);
      if (!id) {
        id = `sh-t-${this.nextId++}`;
        this.elementToId.set(el, id);
      }

      const target: Target = {
        id,
        rect: {
          x: Math.round(bcr.left),
          y: Math.round(bcr.top),
          width: Math.round(bcr.width),
          height: Math.round(bcr.height)
        },
        kind,
        enabled: !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
        dwellAllowed: dwellAllowed ?? false
      };

      newRecords.set(id, { target, element: el });
    }

    this.idToRecord = newRecords;
    return this.idToRecord;
  }

  getRecord(id: string): TargetRecord | undefined {
    return this.idToRecord.get(id);
  }

  getAllTargets(): Target[] {
    return Array.from(this.idToRecord.values()).map((r) => r.target);
  }

  isOccluded(target: Target): boolean {
    const record = this.idToRecord.get(target.id);
    if (!record) return true;

    const centerX = target.rect.x + target.rect.width / 2;
    const centerY = target.rect.y + target.rect.height / 2;

    // Use document.elementFromPoint
    const topEl = document.elementFromPoint(centerX, centerY);
    if (!topEl) return false;

    // The element at that point should be the target or inside the target (or label)
    return !record.element.contains(topEl) && !topEl.contains(record.element);
  }
}

export const targetRegistry = new TargetRegistry();
