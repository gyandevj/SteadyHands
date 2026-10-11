import { targetRegistry } from './discovery.js';
import { Target } from '../types/index.js';

export class GeometryTracker {
  private revision = 1;
  private onInvalidateCallbacks: Array<(revision: number) => void> = [];

  getRevision(): number {
    return this.revision;
  }

  onInvalidate(cb: (revision: number) => void): () => void {
    this.onInvalidateCallbacks.push(cb);
    return () => {
      this.onInvalidateCallbacks = this.onInvalidateCallbacks.filter((c) => c !== cb);
    };
  }

  invalidate(): void {
    this.revision++;
    for (const cb of this.onInvalidateCallbacks) {
      cb(this.revision);
    }
  }

  updateAllGeometries(): { revision: number; targets: Target[] } {
    const targets = targetRegistry.getAllTargets();
    for (const target of targets) {
      const record = targetRegistry.getRecord(target.id);
      if (record && record.element.isConnected) {
        const bcr = record.element.getBoundingClientRect();
        target.rect = {
          x: Math.round(bcr.left),
          y: Math.round(bcr.top),
          width: Math.round(bcr.width),
          height: Math.round(bcr.height)
        };
      }
    }
    this.revision++;
    return { revision: this.revision, targets };
  }

  forceGeometryRefresh(): { revision: number; targets: Target[] } {
    const res = this.updateAllGeometries();
    for (const cb of this.onInvalidateCallbacks) {
      cb(this.revision);
    }
    return res;
  }
}

export const geometryTracker = new GeometryTracker();
