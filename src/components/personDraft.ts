import type { PersonInput } from '../types/family';

export interface PersonDraft extends PersonInput {
  birthDate: string;
  deathDate: string;
  notes: string;
}

export const EMPTY_PERSON_DRAFT: PersonDraft = {
  name: '',
  gender: 'unspecified',
  birthDate: '',
  deathDate: '',
  notes: '',
};
