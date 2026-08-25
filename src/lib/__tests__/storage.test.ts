import { describe, expect, it } from 'vitest';
import { parseStoredFamilyTree, serializeFamilyTree } from '../storage';
import { SCHEMA_VERSION, type FamilyTreeData } from '../../types/family';

function tree(): FamilyTreeData {
  return {
    schemaVersion: SCHEMA_VERSION,
    treeId: 'tree_storage',
    startingContext: 'unspecified',
    people: {},
    partnerRelationships: {},
    parentChildRelationships: {},
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
  };
}

describe('storage serialization', () => {
  it('serializes and validates persisted data', () => {
    const result = parseStoredFamilyTree(serializeFamilyTree(tree()));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.data.treeId).toBe('tree_storage');
  });

  it('returns empty for no saved value', () => {
    expect(parseStoredFamilyTree(null)).toEqual({ status: 'empty' });
  });

  it('preserves raw corrupted data for recovery', () => {
    const raw = '{broken';
    const result = parseStoredFamilyTree(raw);
    expect(result.status).toBe('corrupt');
    if (result.status === 'corrupt') expect(result.raw).toBe(raw);
  });
});
