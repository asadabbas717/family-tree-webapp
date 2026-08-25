import { useState, type FormEvent } from 'react';
import { validatePersonInput } from '../lib/family';
import { useFamily } from '../store/family-context';
import type { Person } from '../types/family';
import { Modal } from './Modal';
import { PersonFields } from './PersonFields';
import type { PersonDraft } from './personDraft';

interface PersonEditorProps {
  personId: string | null;
  onClose: () => void;
}

export function PersonEditor({ personId, onClose }: PersonEditorProps) {
  const { data } = useFamily();
  const person = personId ? data?.people[personId] : undefined;

  if (!personId || !person) return null;

  return <PersonEditorForm key={personId} person={person} onClose={onClose} />;
}

function PersonEditorForm({ person, onClose }: { person: Person; onClose: () => void }) {
  const { editPerson } = useFamily();
  const [draft, setDraft] = useState<PersonDraft>(() => ({
    name: person.name,
    gender: person.gender,
    birthDate: person.birthDate ?? '',
    deathDate: person.deathDate ?? '',
    notes: person.notes ?? '',
  }));
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validatePersonInput(draft);
    if (validation) {
      setError(validation);
      return;
    }
    editPerson(person.id, draft);
    onClose();
  };

  return (
    <Modal open title="Edit family member" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <PersonFields value={draft} onChange={setDraft} autofocus />
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit">Save changes</button>
        </div>
      </form>
    </Modal>
  );
}
