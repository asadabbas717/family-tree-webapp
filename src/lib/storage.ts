import { validateFamilyTree } from './validation';
import type { FamilyTreeData, UiState } from '../types/family';

export const DATA_STORAGE_KEY = 'family-tree-webapp:data:v1';
export const UI_STORAGE_KEY = 'family-tree-webapp:ui:v1';
export const THEME_STORAGE_KEY = 'family-tree-webapp:theme';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: FamilyTreeData }
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
  constructor(private readonly storage: StorageLike) {}

  load(): LoadResult {
    return parseStoredFamilyTree(this.storage.getItem(DATA_STORAGE_KEY));
  }

  save(data: FamilyTreeData): void {
    this.storage.setItem(DATA_STORAGE_KEY, serializeFamilyTree(data));
  }

  clear(): void {
    this.storage.removeItem(DATA_STORAGE_KEY);
    this.storage.removeItem(UI_STORAGE_KEY);
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
  return new LocalFamilyRepository(window.localStorage);
}
