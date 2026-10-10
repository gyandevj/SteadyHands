import test from 'node:test';
import assert from 'node:assert';
import { SettingsStore } from '../../apps/extension/src/background/settingsStore.ts';
import { DEFAULT_ASSISTANCE_CONFIG } from '../../apps/extension/src/types/index.ts';

test('Worker Restart: settings store recovers state and increments revision', async () => {
  const inMemoryStorage: Record<string, any> = {};

  // Mock chrome.storage.local
  (global as any).chrome = {
    storage: {
      local: {
        get: async (key: string) => ({ [key]: inMemoryStorage[key] }),
        set: async (items: Record<string, any>) => {
          Object.assign(inMemoryStorage, items);
        }
      }
    }
  };

  const store = new SettingsStore();

  // Initial read sets default config
  const initial = await store.getConfig();
  assert.strictEqual(initial.revision, 1);
  assert.strictEqual(initial.mode, DEFAULT_ASSISTANCE_CONFIG.mode);

  // Update config
  const updated = await store.updateConfig({
    dwell: { enabled: true, duration_ms: 1200, rearm_ms: 400 }
  });
  assert.strictEqual(updated.revision, 2);
  assert.strictEqual(updated.dwell.duration_ms, 1200);

  // Simulate worker disposal and wake-up with fresh store instance
  const restartedStore = new SettingsStore();
  const recovered = await restartedStore.getConfig();
  assert.strictEqual(recovered.revision, 2);
  assert.strictEqual(recovered.dwell.duration_ms, 1200, 'Settings must survive service worker restart');
});
