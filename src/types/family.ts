export const SCHEMA_VERSION = 1 as const;

export type Gender = 'male' | 'female' | 'other' | 'unspecified';
export type PartnerType =
  | 'spouses'
  | 'partners'
  | 'co-parents'
  | 'divorced'
  | 'separated'
  | 'widowed'
  | 'unspecified'
  | 'custom';
export type ParentChildType = 'biological' | 'adopted' | 'step' | 'foster' | 'custom';
export type StartingContext =
  | 'parents'
  | 'grandparents'
  | 'great-grandparents'
  | 'great-great-grandparents'
  | 'custom'
  | 'unspecified';

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerRelationship {
  id: string;
  person1Id: string;
  person2Id: string;
  type: PartnerType;
  customLabel?: string;
  createdAt: string;
}

export interface ParentChildRelationship {
  id: string;
  parentId: string;
  childId: string;
  type: ParentChildType;
  customLabel?: string;
  createdAt: string;
}

export interface FamilyTreeData {
  schemaVersion: typeof SCHEMA_VERSION;
  treeId: string;
  startingContext: StartingContext;
  startingContextCustom?: string;
  people: Record<string, Person>;
  partnerRelationships: Record<string, PartnerRelationship>;
  parentChildRelationships: Record<string, ParentChildRelationship>;
  createdAt: string;
  updatedAt: string;
}

export interface PersonInput {
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  notes?: string;
}

export interface CreateTreeInput {
  person1: PersonInput;
  person2: PersonInput;
  relationshipType: PartnerType;
  relationshipCustomLabel?: string;
  startingContext: StartingContext;
  startingContextCustom?: string;
}

export interface BackupEnvelope {
  format: 'family-tree-webapp-backup';
  version: 1;
  exportedAt: string;
  data: FamilyTreeData;
}

export interface UiState {
  collapsedPersonIds: string[];
}
