import { displayAge, displayLifeSpan } from '../lib/date';
import type { PersonDraft } from './personDraft';

interface PersonFieldsProps {
  value: PersonDraft;
  onChange: (value: PersonDraft) => void;
  nameLabel?: string;
  autofocus?: boolean;
}

export function PersonFields({
  value,
  onChange,
  nameLabel = 'Full name',
  autofocus = false,
}: PersonFieldsProps) {
  const update = <K extends keyof PersonDraft>(key: K, next: PersonDraft[K]) => {
    onChange({ ...value, [key]: next });
  };
  const age = displayAge(value.birthDate, value.deathDate);
  const hasDatePreview = Boolean(value.birthDate.trim() || value.deathDate.trim());

  return (
    <div className="form-grid">
      <label className="field field-span-2">
        <span>
          {nameLabel} <b aria-hidden="true">*</b>
        </span>
        <input
          autoFocus={autofocus}
          required
          maxLength={200}
          value={value.name}
          onChange={(event) => update('name', event.target.value)}
          placeholder="e.g. Ahmed Khan"
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span>Gender</span>
        <select
          value={value.gender}
          onChange={(event) => update('gender', event.target.value as PersonDraft['gender'])}
        >
          <option value="unspecified">Unspecified</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </label>

      <div className="field-hint-card">
        <strong>Dates are optional</strong>
        <span>Enter YYYY or YYYY-MM-DD. Age and display years are calculated automatically.</span>
      </div>

      <label className="field">
        <span>Birth year or date</span>
        <input
          inputMode="numeric"
          maxLength={10}
          value={value.birthDate}
          onChange={(event) => update('birthDate', event.target.value)}
          placeholder="YYYY or YYYY-MM-DD"
        />
      </label>

      <label className="field">
        <span>Death year or date</span>
        <input
          inputMode="numeric"
          maxLength={10}
          value={value.deathDate}
          onChange={(event) => update('deathDate', event.target.value)}
          placeholder="Leave blank if living/unknown"
        />
      </label>

      {hasDatePreview ? (
        <div className="field-date-summary field-span-2" aria-live="polite">
          <span>Automatic display</span>
          <strong>
            {age ? `${age} · ` : ''}
            {displayLifeSpan(value.birthDate, value.deathDate)}
          </strong>
        </div>
      ) : null}

      <label className="field field-span-2">
        <span>Short notes</span>
        <textarea
          maxLength={5000}
          rows={3}
          value={value.notes}
          onChange={(event) => update('notes', event.target.value)}
          placeholder="Optional family context or memories"
        />
        <small>{value.notes.length}/5000</small>
      </label>
    </div>
  );
}
