import { validateLifeDates } from './date';
import {
  SCHEMA_VERSION,
  type FamilyTreeData,
  type Gender,
  type ParentChildType,
  type PartnerType,
  type StartingContext,
} from '../types/family';

export const GENDERS = new Set<Gender>(['male', 'female', 'other', 'unspecified']);
export const PARTNER_TYPES = new Set<PartnerType>([
  'spouses',
  'partners',
  'co-parents',
  'divorced',
  'separated',
  'widowed',
  'unspecified',
  'custom',
]);
export const PARENT_CHILD_TYPES = new Set<ParentChildType>([
  'biological',
  'adopted',
  'step',
  'foster',
  'custom',
]);
export const STARTING_CONTEXTS = new Set<StartingContext>([
  'parents',
  'grandparents',
  'great-grandparents',
  'great-great-grandparents',
  'custom',
  'unspecified',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown, max = Number.POSITIVE_INFINITY): value is string {
  return typeof value === 'string' && value.length <= max;
}

function optionalString(value: unknown, max: number): boolean {
  return value === undefined || isString(value, max);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: FamilyTreeData;
}

export function validateFamilyTree(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Backup data must be an object.'] };

  if (input.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`Unsupported schema version. Expected ${SCHEMA_VERSION}.`);
  }
  if (!isString(input.treeId, 200) || !input.treeId) errors.push('Tree ID is missing or invalid.');
  if (!STARTING_CONTEXTS.has(input.startingContext as StartingContext)) {
    errors.push('Starting generation metadata is invalid.');
  }
  if (!optionalString(input.startingContextCustom, 500)) {
    errors.push('Custom starting generation metadata is too long.');
  }
  if (!validTimestamp(input.createdAt) || !validTimestamp(input.updatedAt)) {
    errors.push('Tree timestamps are invalid.');
  }
  if (!isRecord(input.people)) errors.push('People collection is invalid.');
  if (!isRecord(input.partnerRelationships))
    errors.push('Partner relationships collection is invalid.');
  if (!isRecord(input.parentChildRelationships)) {
    errors.push('Parent-child relationships collection is invalid.');
  }
  if (errors.length > 0) return { ok: false, errors };

  const people = input.people as Record<string, unknown>;
  const partnerRelationships = input.partnerRelationships as Record<string, unknown>;
  const parentChildRelationships = input.parentChildRelationships as Record<string, unknown>;

  for (const collection of [people, partnerRelationships, parentChildRelationships]) {
    for (const key of Object.keys(collection)) {
      if (!key || ['__proto__', 'prototype', 'constructor'].includes(key)) {
        errors.push('Record IDs must be nonempty and cannot use reserved object keys.');
      }
    }
  }

  for (const [key, raw] of Object.entries(people)) {
    if (!isRecord(raw)) {
      errors.push(`Person ${key} is invalid.`);
      continue;
    }
    if (raw.id !== key || !isString(raw.id, 200)) errors.push(`Person ${key} has an invalid ID.`);
    if (!isString(raw.name, 200) || !raw.name.trim())
      errors.push(`Person ${key} needs a valid name.`);
    if (!GENDERS.has(raw.gender as Gender))
      errors.push(`Person ${key} has an invalid gender value.`);
    if (!optionalString(raw.birthDate, 10)) {
      errors.push(`Person ${key} has an invalid birth date.`);
    }
    if (!optionalString(raw.deathDate, 10)) {
      errors.push(`Person ${key} has an invalid death date.`);
    }
    if (optionalString(raw.birthDate, 10) && optionalString(raw.deathDate, 10)) {
      const issue = validateLifeDates(
        raw.birthDate as string | undefined,
        raw.deathDate as string | undefined,
      );
      if (issue) errors.push(`Person ${key}: ${issue}`);
    }
    if (!optionalString(raw.notes, 5_000))
      errors.push(`Person ${key} has notes that are too long.`);
    if (!validTimestamp(raw.createdAt) || !validTimestamp(raw.updatedAt)) {
      errors.push(`Person ${key} has invalid timestamps.`);
    }
  }

  const partnerPairs = new Set<string>();
  for (const [key, raw] of Object.entries(partnerRelationships)) {
    if (!isRecord(raw)) {
      errors.push(`Partner relationship ${key} is invalid.`);
      continue;
    }
    if (raw.id !== key || !isString(raw.id, 200))
      errors.push(`Partner relationship ${key} has an invalid ID.`);
    if (!isString(raw.person1Id, 200) || !isString(raw.person2Id, 200)) {
      errors.push(`Partner relationship ${key} has invalid person references.`);
      continue;
    }
    if (!Object.hasOwn(people, raw.person1Id) || !Object.hasOwn(people, raw.person2Id)) {
      errors.push(`Partner relationship ${key} references a missing person.`);
    }
    if (raw.person1Id === raw.person2Id)
      errors.push(`Partner relationship ${key} is self-referential.`);
    if (!PARTNER_TYPES.has(raw.type as PartnerType))
      errors.push(`Partner relationship ${key} has an invalid type.`);
    if (!optionalString(raw.customLabel, 200))
      errors.push(`Partner relationship ${key} has an invalid custom label.`);
    if (!validTimestamp(raw.createdAt))
      errors.push(`Partner relationship ${key} has an invalid timestamp.`);
    const pair = JSON.stringify([raw.person1Id, raw.person2Id].sort());
    if (partnerPairs.has(pair)) errors.push(`Duplicate partner relationship detected for ${pair}.`);
    partnerPairs.add(pair);
  }

  const parentChildPairs = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const [key, raw] of Object.entries(parentChildRelationships)) {
    if (!isRecord(raw)) {
      errors.push(`Parent-child relationship ${key} is invalid.`);
      continue;
    }
    if (raw.id !== key || !isString(raw.id, 200))
      errors.push(`Parent-child relationship ${key} has an invalid ID.`);
    if (!isString(raw.parentId, 200) || !isString(raw.childId, 200)) {
      errors.push(`Parent-child relationship ${key} has invalid person references.`);
      continue;
    }
    if (!Object.hasOwn(people, raw.parentId) || !Object.hasOwn(people, raw.childId)) {
      errors.push(`Parent-child relationship ${key} references a missing person.`);
    }
    if (raw.parentId === raw.childId)
      errors.push(`Parent-child relationship ${key} is self-referential.`);
    if (!PARENT_CHILD_TYPES.has(raw.type as ParentChildType)) {
      errors.push(`Parent-child relationship ${key} has an invalid type.`);
    }
    if (!optionalString(raw.customLabel, 200))
      errors.push(`Parent-child relationship ${key} has an invalid custom label.`);
    if (!validTimestamp(raw.createdAt))
      errors.push(`Parent-child relationship ${key} has an invalid timestamp.`);
    const pair = JSON.stringify([raw.parentId, raw.childId]);
    if (parentChildPairs.has(pair))
      errors.push(`Duplicate parent-child relationship detected for ${pair}.`);
    parentChildPairs.add(pair);
    const children = adjacency.get(raw.parentId) ?? [];
    children.push(raw.childId);
    adjacency.set(raw.parentId, children);
  }

  if (hasCycle(Object.keys(people), adjacency)) {
    errors.push('Circular ancestry was detected. The backup cannot be imported safely.');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, errors: [], data: input as unknown as FamilyTreeData };
}

function hasCycle(personIds: string[], adjacency: Map<string, string[]>): boolean {
  const incoming = new Map(personIds.map((id) => [id, 0]));
  for (const children of adjacency.values()) {
    for (const child of children) incoming.set(child, (incoming.get(child) ?? 0) + 1);
  }
  const queue = [...incoming.keys()].filter((id) => incoming.get(id) === 0);
  for (let index = 0; index < queue.length; index += 1) {
    for (const child of adjacency.get(queue[index]!) ?? []) {
      const count = incoming.get(child)! - 1;
      incoming.set(child, count);
      if (count === 0) queue.push(child);
    }
  }
  return queue.length !== incoming.size;
}
