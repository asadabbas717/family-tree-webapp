import { describe, expect, it } from 'vitest';
import { exportTree, importTree } from '../backup';
import { addParentChildRelationship, addPerson } from '../family';
import { SCHEMA_VERSION, type FamilyTreeData } from '../../types/family';

function makeTree(): FamilyTreeData {
  const now = '2026-08-25T00:00:00.000Z';
  let tree: FamilyTreeData = {
    schemaVersion: SCHEMA_VERSION,
    treeId: 'tree_backup',
    startingContext: 'grandparents',
    people: {},
    partnerRelationships: {},
    parentChildRelationships: {},
    createdAt: now,
    updatedAt: now,
  };
  const parent = addPerson(tree, { name: 'Parent', gender: 'unspecified' });
  tree = parent.tree;
  const child = addPerson(tree, { name: 'Child', gender: 'unspecified' });
  tree = addParentChildRelationship(child.tree, parent.person.id, child.person.id);
  return tree;
}

describe('backup import and export', () => {
  it('round-trips a valid tree through exported JSON', () => {
    const tree = makeTree();
    const text = exportTree(tree, new Date('2026-08-25T12:00:00.000Z'));
    const result = importTree(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.treeId).toBe('tree_backup');
  });

  it('rejects malformed JSON without throwing', () => {
    expect(importTree('{not json')).toMatchObject({ ok: false });
  });

  it('rejects corrupt relationship references', () => {
    const envelope = JSON.parse(exportTree(makeTree())) as { data: FamilyTreeData };
    const relationship = Object.values(envelope.data.parentChildRelationships)[0]!;
    relationship.parentId = 'missing_person';
    const result = importTree(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('missing person');
  });

  it('rejects imported ancestry cycles', () => {
    const tree = makeTree();
    const ids = Object.keys(tree.people);
    const envelope = JSON.parse(exportTree(tree)) as { data: FamilyTreeData };
    envelope.data.parentChildRelationships.cycle = {
      id: 'cycle',
      parentId: ids[1]!,
      childId: ids[0]!,
      type: 'biological',
      createdAt: '2026-08-25T00:00:00.000Z',
    };
    const result = importTree(JSON.stringify(envelope));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Circular ancestry');
  });
});
