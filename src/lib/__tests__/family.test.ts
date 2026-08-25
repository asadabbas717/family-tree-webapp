import { describe, expect, it } from 'vitest';
import {
  FamilyDomainError,
  addParentChildRelationship,
  addPartnerRelationship,
  addPerson,
  deletePerson,
  getDescendantIds,
  getVisiblePersonIds,
} from '../family';
import type { FamilyTreeData, PersonInput } from '../../types/family';
import { SCHEMA_VERSION } from '../../types/family';

const person = (name: string): PersonInput => ({ name, gender: 'unspecified' });

function baseTree(): FamilyTreeData {
  const now = new Date('2026-08-25T00:00:00.000Z').toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    treeId: 'tree_test',
    startingContext: 'unspecified',
    people: {},
    partnerRelationships: {},
    parentChildRelationships: {},
    createdAt: now,
    updatedAt: now,
  };
}

function withPeople(names: string[]) {
  let tree = baseTree();
  const ids: string[] = [];
  for (const name of names) {
    const result = addPerson(tree, person(name));
    tree = result.tree;
    ids.push(result.person.id);
  }
  return { tree, ids };
}

describe('family domain operations', () => {
  it('adds people as unique normalized records', () => {
    const { tree, ids } = withPeople(['Ahmed', 'Fatima']);
    expect(Object.keys(tree.people)).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(tree.people[ids[0] ?? '']?.name).toBe('Ahmed');
  });

  it('adds one partner relationship without duplicating either person', () => {
    const { tree, ids } = withPeople(['Ahmed', 'Fatima']);
    const next = addPartnerRelationship(tree, ids[0]!, ids[1]!, 'spouses');
    expect(Object.keys(next.people)).toHaveLength(2);
    expect(Object.keys(next.partnerRelationships)).toHaveLength(1);
    expect(() => addPartnerRelationship(next, ids[1]!, ids[0]!, 'partners')).toThrow(FamilyDomainError);
  });

  it('adds children and traverses descendants', () => {
    const { tree, ids } = withPeople(['Grandparent', 'Parent', 'Child']);
    let next = addParentChildRelationship(tree, ids[0]!, ids[1]!);
    next = addParentChildRelationship(next, ids[1]!, ids[2]!);
    expect([...getDescendantIds(next, ids[0]!)].sort()).toEqual([ids[1]!, ids[2]!].sort());
  });

  it('hides only existing descendants when a branch is collapsed', () => {
    const { tree, ids } = withPeople(['Grandparent', 'Parent', 'Child', 'Unrelated']);
    let next = addParentChildRelationship(tree, ids[0]!, ids[1]!);
    next = addParentChildRelationship(next, ids[1]!, ids[2]!);
    const visible = getVisiblePersonIds(next, [ids[1]!]);
    expect(visible.has(ids[0]!)).toBe(true);
    expect(visible.has(ids[1]!)).toBe(true);
    expect(visible.has(ids[2]!)).toBe(false);
    expect(visible.has(ids[3]!)).toBe(true);
  });

  it('prevents self-parent relationships', () => {
    const { tree, ids } = withPeople(['A']);
    expect(() => addParentChildRelationship(tree, ids[0]!, ids[0]!)).toThrow('own parent');
  });

  it('prevents ancestry cycles', () => {
    const { tree, ids } = withPeople(['A', 'B', 'C']);
    let next = addParentChildRelationship(tree, ids[0]!, ids[1]!);
    next = addParentChildRelationship(next, ids[1]!, ids[2]!);
    expect(() => addParentChildRelationship(next, ids[2]!, ids[0]!)).toThrow('circular ancestry');
  });

  it('deletes a person and cleans relationships without deleting descendants', () => {
    const { tree, ids } = withPeople(['Parent', 'Partner', 'Child']);
    let next = addPartnerRelationship(tree, ids[0]!, ids[1]!, 'spouses');
    next = addParentChildRelationship(next, ids[0]!, ids[2]!);
    next = addParentChildRelationship(next, ids[1]!, ids[2]!);
    const cleaned = deletePerson(next, ids[0]!);
    expect(cleaned.people[ids[0]!]).toBeUndefined();
    expect(cleaned.people[ids[2]!]?.name).toBe('Child');
    expect(Object.values(cleaned.partnerRelationships)).toHaveLength(0);
    expect(Object.values(cleaned.parentChildRelationships)).toHaveLength(1);
    expect(Object.values(cleaned.parentChildRelationships)[0]?.parentId).toBe(ids[1]);
  });
});
