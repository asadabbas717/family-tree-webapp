import { createId } from './id';
import { normalizeDateInput, validateLifeDates } from './date';
import { GENDERS, PARTNER_TYPES, PARENT_CHILD_TYPES, STARTING_CONTEXTS } from './validation';
import {
  SCHEMA_VERSION,
  type CreateTreeInput,
  type FamilyTreeData,
  type ParentChildRelationship,
  type ParentChildType,
  type PartnerRelationship,
  type PartnerType,
  type Person,
  type PersonInput,
} from '../types/family';

export class FamilyDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FamilyDomainError';
  }
}

function now(): string {
  return new Date().toISOString();
}

export function validatePersonInput(input: PersonInput): string | null {
  if (!GENDERS.has(input.gender)) return 'Gender is invalid.';
  if (!input.name.trim()) return 'Full name is required.';
  if (input.name.trim().length > 200) return 'Name must be 200 characters or fewer.';
  if ((input.notes?.length ?? 0) > 5_000) return 'Notes must be 5,000 characters or fewer.';
  return validateLifeDates(
    normalizeDateInput(input.birthDate),
    normalizeDateInput(input.deathDate),
  );
}

export function createPerson(input: PersonInput, timestamp = now()): Person {
  const error = validatePersonInput(input);
  if (error) throw new FamilyDomainError(error);
  return {
    id: createId('person'),
    name: input.name.trim(),
    gender: input.gender,
    birthDate: normalizeDateInput(input.birthDate),
    deathDate: normalizeDateInput(input.deathDate),
    notes: input.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmptyTree(): FamilyTreeData {
  const timestamp = now();
  return {
    schemaVersion: SCHEMA_VERSION,
    treeId: createId('tree'),
    startingContext: 'unspecified',
    people: {},
    partnerRelationships: {},
    parentChildRelationships: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createInitialTree(input: CreateTreeInput): FamilyTreeData {
  if (!STARTING_CONTEXTS.has(input.startingContext))
    throw new FamilyDomainError('Starting context is invalid.');
  if ((input.startingContextCustom?.trim().length ?? 0) > 500)
    throw new FamilyDomainError('Starting context must be 500 characters or fewer.');
  if (input.startingContext === 'custom' && !input.startingContextCustom?.trim())
    throw new FamilyDomainError('Describe the custom starting context.');
  const timestamp = now();
  const person1 = createPerson(input.person1, timestamp);
  const person2 = createPerson(input.person2, timestamp);
  const tree: FamilyTreeData = {
    schemaVersion: SCHEMA_VERSION,
    treeId: createId('tree'),
    startingContext: input.startingContext,
    startingContextCustom: input.startingContextCustom?.trim() || undefined,
    people: {
      [person1.id]: person1,
      [person2.id]: person2,
    },
    partnerRelationships: {},
    parentChildRelationships: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return addPartnerRelationship(
    tree,
    person1.id,
    person2.id,
    input.relationshipType,
    input.relationshipCustomLabel,
  );
}

function touch(tree: FamilyTreeData): FamilyTreeData {
  return { ...tree, updatedAt: now() };
}

function requirePerson(tree: FamilyTreeData, id: string): Person {
  const person = tree.people[id];
  if (!Object.hasOwn(tree.people, id) || !person)
    throw new FamilyDomainError('The selected family member no longer exists.');
  return person;
}

export function addPerson(
  tree: FamilyTreeData,
  input: PersonInput,
): { tree: FamilyTreeData; person: Person } {
  const person = createPerson(input);
  if (tree.people[person.id]) throw new FamilyDomainError('A duplicate person ID was generated.');
  return {
    person,
    tree: touch({ ...tree, people: { ...tree.people, [person.id]: person } }),
  };
}

export function updatePerson(tree: FamilyTreeData, id: string, input: PersonInput): FamilyTreeData {
  const existing = requirePerson(tree, id);
  const error = validatePersonInput(input);
  if (error) throw new FamilyDomainError(error);
  const updated: Person = {
    ...existing,
    name: input.name.trim(),
    gender: input.gender,
    birthDate: normalizeDateInput(input.birthDate),
    deathDate: normalizeDateInput(input.deathDate),
    notes: input.notes?.trim() || undefined,
    updatedAt: now(),
  };
  return touch({ ...tree, people: { ...tree.people, [id]: updated } });
}

export function addPartnerRelationship(
  tree: FamilyTreeData,
  person1Id: string,
  person2Id: string,
  type: PartnerType,
  customLabel?: string,
): FamilyTreeData {
  if (!PARTNER_TYPES.has(type))
    throw new FamilyDomainError('Partner relationship type is invalid.');
  validateRelationshipLabel(type, customLabel);
  requirePerson(tree, person1Id);
  requirePerson(tree, person2Id);
  if (person1Id === person2Id) throw new FamilyDomainError('A person cannot be their own partner.');

  const duplicate = Object.values(tree.partnerRelationships).some(
    (relationship) =>
      (relationship.person1Id === person1Id && relationship.person2Id === person2Id) ||
      (relationship.person1Id === person2Id && relationship.person2Id === person1Id),
  );
  if (duplicate)
    throw new FamilyDomainError('These two people already have a partner relationship.');

  const relationship: PartnerRelationship = {
    id: createId('partner'),
    person1Id,
    person2Id,
    type,
    customLabel: customLabel?.trim() || undefined,
    createdAt: now(),
  };
  return touch({
    ...tree,
    partnerRelationships: {
      ...tree.partnerRelationships,
      [relationship.id]: relationship,
    },
  });
}

export function getChildren(tree: FamilyTreeData, parentId: string): Person[] {
  const ids = new Set(
    Object.values(tree.parentChildRelationships)
      .filter((relationship) => relationship.parentId === parentId)
      .map((relationship) => relationship.childId),
  );
  return [...ids]
    .map((id) => tree.people[id])
    .filter((person): person is Person => Boolean(person));
}

export function getParents(tree: FamilyTreeData, childId: string): Person[] {
  const ids = new Set(
    Object.values(tree.parentChildRelationships)
      .filter((relationship) => relationship.childId === childId)
      .map((relationship) => relationship.parentId),
  );
  return [...ids]
    .map((id) => tree.people[id])
    .filter((person): person is Person => Boolean(person));
}

export function getPartners(tree: FamilyTreeData, personId: string): Person[] {
  const ids = new Set<string>();
  Object.values(tree.partnerRelationships).forEach((relationship) => {
    if (relationship.person1Id === personId) ids.add(relationship.person2Id);
    if (relationship.person2Id === personId) ids.add(relationship.person1Id);
  });
  return [...ids]
    .map((id) => tree.people[id])
    .filter((person): person is Person => Boolean(person));
}

function traverseRelations(
  tree: FamilyTreeData,
  personId: string,
  direction: 'ancestors' | 'descendants',
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const relation of Object.values(tree.parentChildRelationships)) {
    const source = direction === 'descendants' ? relation.parentId : relation.childId;
    const target = direction === 'descendants' ? relation.childId : relation.parentId;
    const neighbors = adjacency.get(source) ?? [];
    neighbors.push(target);
    adjacency.set(source, neighbors);
  }
  const visited = new Set([personId]);
  const queue = [personId];
  for (let index = 0; index < queue.length; index += 1) {
    for (const id of adjacency.get(queue[index]!) ?? []) {
      if (!visited.has(id)) {
        visited.add(id);
        queue.push(id);
      }
    }
  }
  visited.delete(personId);
  return visited;
}

export function getDescendantIds(tree: FamilyTreeData, personId: string): Set<string> {
  return traverseRelations(tree, personId, 'descendants');
}

export function getAncestorIds(tree: FamilyTreeData, personId: string): Set<string> {
  return traverseRelations(tree, personId, 'ancestors');
}

export function wouldCreateCycle(tree: FamilyTreeData, parentId: string, childId: string): boolean {
  if (parentId === childId) return true;
  return getDescendantIds(tree, childId).has(parentId);
}

export function addParentChildRelationship(
  tree: FamilyTreeData,
  parentId: string,
  childId: string,
  type: ParentChildType = 'biological',
  customLabel?: string,
): FamilyTreeData {
  if (!PARENT_CHILD_TYPES.has(type))
    throw new FamilyDomainError('Parent-child relationship type is invalid.');
  validateRelationshipLabel(type, customLabel);
  requirePerson(tree, parentId);
  requirePerson(tree, childId);
  if (parentId === childId) throw new FamilyDomainError('A person cannot be their own parent.');
  if (wouldCreateCycle(tree, parentId, childId)) {
    throw new FamilyDomainError('This relationship would create a circular ancestry path.');
  }
  const duplicate = Object.values(tree.parentChildRelationships).some(
    (relationship) => relationship.parentId === parentId && relationship.childId === childId,
  );
  if (duplicate) throw new FamilyDomainError('This parent-child relationship already exists.');

  const relationship: ParentChildRelationship = {
    id: createId('parentChild'),
    parentId,
    childId,
    type,
    customLabel: customLabel?.trim() || undefined,
    createdAt: now(),
  };
  return touch({
    ...tree,
    parentChildRelationships: {
      ...tree.parentChildRelationships,
      [relationship.id]: relationship,
    },
  });
}

export function addRelative(
  tree: FamilyTreeData,
  anchorId: string,
  kind: 'child' | 'parent' | 'partner',
  input: PersonInput,
  options?: {
    partnerType?: PartnerType;
    parentChildType?: ParentChildType;
    secondParentId?: string;
    customLabel?: string;
  },
): { tree: FamilyTreeData; person: Person } {
  if (!['child', 'parent', 'partner'].includes(kind))
    throw new FamilyDomainError('Relative kind is invalid.');
  requirePerson(tree, anchorId);
  const created = addPerson(tree, input);
  let next = created.tree;

  if (kind === 'partner') {
    next = addPartnerRelationship(
      next,
      anchorId,
      created.person.id,
      options?.partnerType ?? 'partners',
      options?.customLabel,
    );
  } else if (kind === 'child') {
    next = addParentChildRelationship(
      next,
      anchorId,
      created.person.id,
      options?.parentChildType ?? 'biological',
      options?.customLabel,
    );
    if (options?.secondParentId && options.secondParentId !== anchorId) {
      next = addParentChildRelationship(
        next,
        options.secondParentId,
        created.person.id,
        options?.parentChildType ?? 'biological',
        options?.customLabel,
      );
    }
  } else {
    next = addParentChildRelationship(
      next,
      created.person.id,
      anchorId,
      options?.parentChildType ?? 'biological',
      options?.customLabel,
    );
  }

  return { tree: next, person: created.person };
}

export function deletePerson(tree: FamilyTreeData, personId: string): FamilyTreeData {
  requirePerson(tree, personId);
  const people = { ...tree.people };
  delete people[personId];

  const partnerRelationships = Object.fromEntries(
    Object.entries(tree.partnerRelationships).filter(
      ([, relationship]) =>
        relationship.person1Id !== personId && relationship.person2Id !== personId,
    ),
  );
  const parentChildRelationships = Object.fromEntries(
    Object.entries(tree.parentChildRelationships).filter(
      ([, relationship]) => relationship.parentId !== personId && relationship.childId !== personId,
    ),
  );

  return touch({ ...tree, people, partnerRelationships, parentChildRelationships });
}

export function countDirectChildren(tree: FamilyTreeData, personId: string): number {
  return getChildren(tree, personId).length;
}

export function hasDescendants(tree: FamilyTreeData, personId: string): boolean {
  return getDescendantIds(tree, personId).size > 0;
}

function validateRelationshipLabel(type: string, label?: string): void {
  if ((label?.trim().length ?? 0) > 200)
    throw new FamilyDomainError('Relationship label must be 200 characters or fewer.');
  if (type === 'custom' && !label?.trim())
    throw new FamilyDomainError('Describe the custom relationship.');
}

export function getVisiblePersonIds(
  tree: FamilyTreeData,
  collapsedPersonIds: string[],
): Set<string> {
  const hidden = new Set<string>();
  for (const collapsedId of collapsedPersonIds) {
    if (!tree.people[collapsedId]) continue;
    for (const descendant of getDescendantIds(tree, collapsedId)) hidden.add(descendant);
  }
  for (const collapsedId of collapsedPersonIds) hidden.delete(collapsedId);
  return new Set(Object.keys(tree.people).filter((id) => !hidden.has(id)));
}
