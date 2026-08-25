import { createContext, useContext } from 'react';
import type { LoadResult } from '../lib/storage';
import type {
  CreateTreeInput,
  FamilyTreeData,
  ParentChildType,
  PartnerType,
  PersonInput,
} from '../types/family';

export interface AddRelativeOptions {
  partnerType?: PartnerType;
  parentChildType?: ParentChildType;
  secondParentId?: string;
  customLabel?: string;
}

export interface FamilyContextValue {
  data: FamilyTreeData | null;
  loadIssue: Extract<LoadResult, { status: 'corrupt' }> | null;
  storageError: string | null;
  collapsedPersonIds: string[];
  selectedPersonId: string | null;
  focusRequest: number;
  createTree: (input: CreateTreeInput) => void;
  editPerson: (personId: string, input: PersonInput) => void;
  createRelative: (
    anchorId: string,
    kind: 'child' | 'parent' | 'partner',
    input: PersonInput,
    options?: AddRelativeOptions,
  ) => string;
  removePerson: (personId: string) => void;
  replaceTree: (tree: FamilyTreeData) => void;
  resetTree: () => void;
  recoverReset: () => void;
  toggleCollapsed: (personId: string) => void;
  selectPerson: (personId: string | null, focus?: boolean) => void;
  focusPerson: (personId: string) => void;
}

export const FamilyContext = createContext<FamilyContextValue | null>(null);

export function useFamily(): FamilyContextValue {
  const value = useContext(FamilyContext);
  if (!value) throw new Error('useFamily must be used inside FamilyProvider.');
  return value;
}
