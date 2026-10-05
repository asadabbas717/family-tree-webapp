import { describe, expect, it } from 'vitest';
import {
  createEmptyTree,
  addPerson,
  addPartnerRelationship,
  addRelative,
  updatePerson,
} from '../family';
import { validateFamilyTree } from '../validation';
import { validateLifeDates, isValidFamilyDate, calculateAgeYears } from '../date';
import { buildFlowGraph } from '../graph';
import type { Person, ParentChildRelationship } from '../../types/family';

const timestamp = '2026-01-01T00:00:00.000Z';
const person = (id: string): Person => ({
  id,
  name: id,
  gender: 'unspecified',
  createdAt: timestamp,
  updatedAt: timestamp,
});

describe('untrusted family data', () => {
  it.each([20260101, null, {}, [], true])('rejects malformed date %j without throwing', (value) => {
    const tree = createEmptyTree();
    const raw = { ...person('a'), birthDate: value };
    expect(validateFamilyTree({ ...tree, people: { a: raw } }).ok).toBe(false);
  });

  it('rejects inherited object properties as missing person references', () => {
    const tree = createEmptyTree();
    tree.people.a = person('a');
    tree.partnerRelationships.r = {
      id: 'r',
      person1Id: 'a',
      person2Id: 'toString',
      type: 'spouses',
      createdAt: timestamp,
    };
    expect(validateFamilyTree(tree).errors.join(' ')).toContain('missing person');
  });

  it.each(['__proto__', 'constructor', 'prototype', ''])('rejects unsafe record key %j', (id) => {
    const tree = { ...createEmptyTree(), people: Object.fromEntries([[id, person(id)]]) };
    expect(validateFamilyTree(tree).ok).toBe(false);
  });

  it('does not confuse distinct relationship pairs containing delimiters', () => {
    const tree = createEmptyTree();
    for (const id of ['a', 'b::c', 'a::b', 'c']) tree.people[id] = person(id);
    tree.parentChildRelationships.r1 = {
      id: 'r1',
      parentId: 'a',
      childId: 'b::c',
      type: 'biological',
      createdAt: timestamp,
    };
    tree.parentChildRelationships.r2 = {
      id: 'r2',
      parentId: 'a::b',
      childId: 'c',
      type: 'biological',
      createdAt: timestamp,
    };
    expect(validateFamilyTree(tree).ok).toBe(true);
  });

  it('validates a deep ancestry chain without recursion overflow and detects a closing cycle', () => {
    const tree = createEmptyTree();
    for (let index = 0; index < 12000; index += 1) {
      tree.people[`p${index}`] = person(`p${index}`);
      if (index)
        tree.parentChildRelationships[`r${index}`] = {
          id: `r${index}`,
          parentId: `p${index - 1}`,
          childId: `p${index}`,
          type: 'biological',
          createdAt: timestamp,
        };
    }
    expect(validateFamilyTree(tree).ok).toBe(true);
    tree.parentChildRelationships.cycle = {
      id: 'cycle',
      parentId: 'p11999',
      childId: 'p0',
      type: 'biological',
      createdAt: timestamp,
    };
    expect(validateFamilyTree(tree).errors.join(' ')).toContain('Circular ancestry');
  });
});

describe('domain and layout invariants', () => {
  it('adds a child with two parents atomically, leaving the original tree unchanged', () => {
    const first = addPerson(createEmptyTree(), { name: 'A', gender: 'unspecified' });
    const second = addPerson(first.tree, { name: 'B', gender: 'unspecified' });
    const original = JSON.stringify(second.tree);
    const result = addRelative(
      second.tree,
      first.person.id,
      'child',
      { name: 'C', gender: 'unspecified' },
      { secondParentId: second.person.id },
    );
    expect(Object.values(result.tree.parentChildRelationships)).toHaveLength(2);
    expect(JSON.stringify(second.tree)).toBe(original);
    expect(() =>
      addRelative(
        second.tree,
        first.person.id,
        'child',
        { name: 'C', gender: 'unspecified' },
        { secondParentId: 'missing' },
      ),
    ).toThrow('no longer exists');
    expect(JSON.stringify(second.tree)).toBe(original);
  });

  it('rejects custom relationship labels exceeding the import schema limit', () => {
    const first = addPerson(createEmptyTree(), { name: 'A', gender: 'unspecified' });
    const second = addPerson(first.tree, { name: 'B', gender: 'unspecified' });
    expect(() =>
      addPartnerRelationship(
        second.tree,
        first.person.id,
        second.person.id,
        'custom',
        'x'.repeat(201),
      ),
    ).toThrow('200');
    expect(() =>
      addPartnerRelationship(second.tree, first.person.id, second.person.id, 'custom'),
    ).toThrow('Describe');
  });

  it('protects person edits against invalid dates without mutating saved data', () => {
    const result = addPerson(createEmptyTree(), { name: 'A', gender: 'unspecified' });
    expect(() =>
      updatePerson(result.tree, result.person.id, {
        name: 'B',
        gender: 'unspecified',
        birthDate: '2024-02-30',
      }),
    ).toThrow('Birth');
    expect(result.tree.people[result.person.id]?.name).toBe('A');
  });

  it('creates finite graph positions and edges referring only to visible nodes', () => {
    const first = addPerson(createEmptyTree(), { name: 'A', gender: 'unspecified' });
    const child = addRelative(first.tree, first.person.id, 'child', {
      name: 'B',
      gender: 'unspecified',
    });
    for (const collapsed of [[], [first.person.id]]) {
      const graph = buildFlowGraph(child.tree, collapsed, first.person.id);
      const ids = new Set(graph.nodes.map((node) => node.id));
      expect(ids.size).toBe(graph.nodes.length);
      expect(
        graph.nodes.every(
          (node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
        ),
      ).toBe(true);
      expect(graph.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true);
      if (collapsed.length) expect(ids.has(child.person.id)).toBe(false);
    }
  });

  it('rejects duplicate imported parent relationships', () => {
    const first = addPerson(createEmptyTree(), { name: 'A', gender: 'unspecified' });
    const child = addRelative(first.tree, first.person.id, 'child', {
      name: 'B',
      gender: 'unspecified',
    });
    const relation = Object.values(
      child.tree.parentChildRelationships,
    )[0] as ParentChildRelationship;
    child.tree.parentChildRelationships.duplicate = { ...relation, id: 'duplicate' };
    expect(validateFamilyTree(child.tree).ok).toBe(false);
  });
});

describe('partial date semantics', () => {
  it('allows uncertain same-year chronology but rejects definite reversal', () => {
    expect(validateLifeDates('2000-12-31', '2000')).toBeNull();
    expect(validateLifeDates('2001', '2000-12-31')).toContain('before birth');
  });
  it.each(['0000-01-01', '0000', '2023-02-29', '2024-13-01'])(
    'rejects invalid calendar date %s',
    (date) => {
      expect(isValidFamilyDate(date)).toBe(false);
      expect(calculateAgeYears(date)).toBeUndefined();
    },
  );
});
