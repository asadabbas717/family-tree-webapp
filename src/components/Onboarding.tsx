import { useState, type FormEvent } from 'react';
import { useFamily } from '../store/family-context';
import { validatePersonInput } from '../lib/family';
import { PersonFields } from './PersonFields';
import { EMPTY_PERSON_DRAFT, type PersonDraft } from './personDraft';
import type { PartnerType, StartingContext } from '../types/family';

export function Onboarding() {
  const { createTree } = useFamily();
  const [person1, setPerson1] = useState<PersonDraft>({ ...EMPTY_PERSON_DRAFT });
  const [person2, setPerson2] = useState<PersonDraft>({ ...EMPTY_PERSON_DRAFT });
  const [relationshipType, setRelationshipType] = useState<PartnerType>('spouses');
  const [relationshipCustomLabel, setRelationshipCustomLabel] = useState('');
  const [startingContext, setStartingContext] = useState<StartingContext>('grandparents');
  const [startingContextCustom, setStartingContextCustom] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const firstError = validatePersonInput(person1);
    const secondError = validatePersonInput(person2);
    if (firstError || secondError) {
      setError(firstError ? `First person: ${firstError}` : `Second person: ${secondError}`);
      return;
    }
    if (relationshipType === 'custom' && !relationshipCustomLabel.trim()) {
      setError('Describe the custom relationship between the starting people.');
      return;
    }
    if (startingContext === 'custom' && !startingContextCustom.trim()) {
      setError('Describe who the starting people are relative to you, or choose Prefer not to specify.');
      return;
    }
    createTree({
      person1,
      person2,
      relationshipType,
      relationshipCustomLabel,
      startingContext,
      startingContextCustom,
    });
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          <span className="eyebrow">Private by default · stored in this browser</span>
          <h1 id="welcome-title">Start your family tree anywhere.</h1>
          <p>
            Begin with any two people—parents, grandparents, older generations, or another pair. Add only the branches you want to record.
          </p>
        </div>

        <form onSubmit={submit} noValidate>
          {error ? <div className="form-error" role="alert">{error}</div> : null}

          <div className="starter-grid">
            <fieldset className="starter-person">
              <legend>Starting person 1</legend>
              <PersonFields value={person1} onChange={setPerson1} autofocus />
            </fieldset>
            <fieldset className="starter-person">
              <legend>Starting person 2</legend>
              <PersonFields value={person2} onChange={setPerson2} />
            </fieldset>
          </div>

          <div className="setup-meta-grid">
            <label className="field">
              <span>Relationship between them</span>
              <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value as PartnerType)}>
                <option value="spouses">Spouses</option>
                <option value="partners">Partners</option>
                <option value="co-parents">Co-parents</option>
                <option value="unspecified">Custom / unspecified</option>
                <option value="custom">Describe it myself</option>
              </select>
            </label>
            {relationshipType === 'custom' ? (
              <label className="field">
                <span>Custom relationship</span>
                <input maxLength={200} value={relationshipCustomLabel} onChange={(event) => setRelationshipCustomLabel(event.target.value)} />
              </label>
            ) : null}

            <label className="field">
              <span>Who are these people relative to you? <em>Optional</em></span>
              <select value={startingContext} onChange={(event) => setStartingContext(event.target.value as StartingContext)}>
                <option value="parents">My parents</option>
                <option value="grandparents">My grandparents</option>
                <option value="great-grandparents">My great-grandparents</option>
                <option value="great-great-grandparents">My great-great-grandparents</option>
                <option value="custom">Other / custom</option>
                <option value="unspecified">Prefer not to specify</option>
              </select>
            </label>
            {startingContext === 'custom' ? (
              <label className="field">
                <span>Custom context</span>
                <input maxLength={500} value={startingContextCustom} onChange={(event) => setStartingContextCustom(event.target.value)} />
              </label>
            ) : null}
          </div>

          <div className="onboarding-footer">
            <p>Your tree stays on this device unless you export a backup. Clearing site data can remove it.</p>
            <button className="primary-button" type="submit">Create family tree</button>
          </div>
        </form>
      </section>
    </main>
  );
}
