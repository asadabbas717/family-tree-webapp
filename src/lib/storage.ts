import { validateFamilyTree } from './validation';
import type { FamilyTreeData, UiState } from '../types/family';

export const DATA_STORAGE_KEY = 'family-tree-webapp:data:v1';
export const UI_STORAGE_KEY = 'family-tree-webapp:ui:v1';
export const THEME_STORAGE_KEY = 'family-tree-webapp:theme';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: FamilyTreeData }
  | { status: 'unavailable'; error: string }
  | { status: 'corrupt'; raw: string; error: string };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeFamilyTree(data: FamilyTreeData): string {
  return JSON.stringify(data);
}

export function parseStoredFamilyTree(raw: string | null): LoadResult {
  if (!raw) return { status: 'empty' };
  try {
    const parsed: unknown = JSON.parse(raw);
    const validation = validateFamilyTree(parsed);
    if (!validation.ok || !validation.data) {
      return { status: 'corrupt', raw, error: validation.errors.join(' ') };
    }
    return { status: 'ok', data: validation.data };
  } catch (error) {
    return {
      status: 'corrupt',
      raw,
      error: error instanceof Error ? error.message : 'Saved family data is not valid JSON.',
    };
  }
}

export class LocalFamilyRepository {
  private expectedRaw: string | null | undefined;
  constructor(private readonly storage: StorageLike) {}

  load(): LoadResult {
    try {
      this.expectedRaw = this.storage.getItem(DATA_STORAGE_KEY);
      return parseStoredFamilyTree(this.expectedRaw);
    } catch {
      return {
        status: 'unavailable',
        error:
          'Browser storage is unavailable. Changes are kept in memory only; export a backup before closing this page.',
      };
    }
  }

  private checkConflict(): void {
    const current = this.storage.getItem(DATA_STORAGE_KEY);
    if (this.expectedRaw === undefined || current !== this.expectedRaw) {
      throw new Error(
        'Saved data changed in another tab or could not be read. Export your current tree, then reload before saving or resetting.',
      );
    }
  }

  save(data: FamilyTreeData): void {
    this.checkConflict();
    const raw = serializeFamilyTree(data);
    this.storage.setItem(DATA_STORAGE_KEY, raw);
    this.expectedRaw = raw;
  }

  clear(): void {
    this.checkConflict();
    this.storage.removeItem(DATA_STORAGE_KEY);
    this.expectedRaw = null;
    try {
      this.storage.removeItem(UI_STORAGE_KEY);
    } catch {
      // Clearing optional presentation state must not misreport family deletion.
    }
  }

  loadUiState(): UiState {
    try {
      const raw = this.storage.getItem(UI_STORAGE_KEY);
      if (!raw) return { collapsedPersonIds: [] };
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        Array.isArray((parsed as UiState).collapsedPersonIds) &&
        (parsed as UiState).collapsedPersonIds.every((id) => typeof id === 'string')
      ) {
        return { collapsedPersonIds: [...new Set((parsed as UiState).collapsedPersonIds)] };
      }
    } catch {
      // UI-only state can safely fall back without touching family data.
    }
    return { collapsedPersonIds: [] };
  }

  saveUiState(state: UiState): void {
    this.storage.setItem(UI_STORAGE_KEY, JSON.stringify(state));
  }
}

export function getBrowserRepository(): LocalFamilyRepository | null {
  if (typeof window === 'undefined') return null;
  // Access the localStorage property inside repository error handling: the getter itself can throw.
  return new LocalFamilyRepository({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  });
}
