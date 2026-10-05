import { describe, expect, it } from 'vitest';
import { createEmptyTree } from '../family';
import { DATA_STORAGE_KEY, LocalFamilyRepository, type StorageLike } from '../storage';

function memoryStorage(): StorageLike {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

describe('repository failure and conflict handling', () => {
  it('reports blocked reads without crashing or treating unknown saved data as empty', () => {
    const storage = memoryStorage();
    storage.getItem = () => {
      throw new Error('Storage blocked');
    };
    expect(new LocalFamilyRepository(storage).load()).toMatchObject({ status: 'unavailable' });
  });

  it('refuses a stale tab save and preserves the newer tree', () => {
    const storage = memoryStorage();
    const first = new LocalFamilyRepository(storage);
    const second = new LocalFamilyRepository(storage);
    first.load();
    second.load();
    const newer = createEmptyTree();
    first.save(newer);
    expect(() => second.save(createEmptyTree())).toThrow('another tab');
    expect(JSON.parse(storage.getItem(DATA_STORAGE_KEY)!)).toEqual(newer);
  });

  it('refuses a stale reset after another tab saved', () => {
    const storage = memoryStorage();
    const repository = new LocalFamilyRepository(storage);
    repository.load();
    storage.setItem(DATA_STORAGE_KEY, JSON.stringify(createEmptyTree()));
    expect(() => repository.clear()).toThrow('another tab');
    expect(storage.getItem(DATA_STORAGE_KEY)).not.toBeNull();
  });

  it('retains the previous tree after quota failure and allows retry', () => {
    const storage = memoryStorage();
    const repository = new LocalFamilyRepository(storage);
    repository.load();
    const original = createEmptyTree();
    repository.save(original);
    const setItem = storage.setItem;
    storage.setItem = () => {
      throw new Error('Quota exceeded');
    };
    expect(() => repository.save(createEmptyTree())).toThrow('Quota');
    expect(JSON.parse(storage.getItem(DATA_STORAGE_KEY)!)).toEqual(original);
    storage.setItem = setItem;
    expect(() => repository.save(createEmptyTree())).not.toThrow();
  });
});
