import { targetRegistry } from '../content/discovery.js';
import { geometryTracker } from '../content/geometry.js';

export interface ExtensionDebugSnapshot {
  timestampMs: number;
  targetCount: number;
  geometryRevision: number;
  viewport: { width: number; height: number };
  activeDocumentUrlType: string;
}

export function getDebugSnapshot(): ExtensionDebugSnapshot {
  const targets = targetRegistry.getAllTargets();
  const url = window.location.href;
  const urlType = url.startsWith('https://')
    ? 'https'
    : url.startsWith('http://')
    ? 'http'
    : url.startsWith('file://')
    ? 'file'
    : 'other';

  return {
    timestampMs: performance.now(),
    targetCount: targets.length,
    geometryRevision: geometryTracker.getRevision(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    activeDocumentUrlType: urlType
  };
}
