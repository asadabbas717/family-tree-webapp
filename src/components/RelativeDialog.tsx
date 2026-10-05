import { useMemo, useState, type FormEvent } from 'react';
import { getPartners, validatePersonInput } from '../lib/family';
import { useFamily } from '../store/family-context';
import type { ParentChildType, PartnerType, Person } from '../types/family';
import { Modal } from './Modal';
import { PersonFields } from './PersonFields';
import { EMPTY_PERSON_DRAFT, type PersonDraft } from './personDraft';

interface RelativeDialogProps {
  anchorId: string | null;
  initialKind?: 'child' | 'parent' | 'partner';
  onClose: () => void;
}

export function RelativeDialog({ anchorId, initialKind = 'child', onClose }: RelativeDialogProps) {
  const { data } = useFamily();
  const anchor = anchorId ? data?.people[anchorId] : undefined;

  if (!anchorId || !anchor || !data) return null;

  return (
    <RelativeDialogForm
      key={`${anchorId}:${initialKind}`}
      anchor={anchor}
      anchorId={anchorId}
      initialKind={initialKind}
      onClose={onClose}
    />
  );
}

function RelativeDialogForm({
  anchor,
  anchorId,
  initialKind,
  onClose,
}: {
  anchor: Person;
  anchorId: string;
  initialKind: 'child' | 'parent' | 'partner';
  onClose: () => void;
}) {
  const { data, createRelative } = useFamily();
  const partners = useMemo(() => (data ? getPartners(data, anchorId) : []), [data, anchorId]);
  const [kind, setKind] = useState<'child' | 'parent' | 'partner'>(initialKind);
  const [draft, setDraft] = useState<PersonDraft>(() => ({ ...EMPTY_PERSON_DRAFT }));
  const [partnerType, setPartnerType] = useState<PartnerType>('spouses');
  const [parentChildType, setParentChildType] = useState<ParentChildType>('biological');
  const [secondParentId, setSecondParentId] = useState(() => partners[0]?.id ?? '');
  const [customLabel, setCustomLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validatePersonInput(draft);
    if (validation) {
      setError(validation);
      return;
    }
    if (
      (kind === 'partner' ? partnerType === 'custom' : parentChildType === 'custom') &&
      !customLabel.trim()
    ) {
      setError('Describe the custom relationship.');
      return;
    }
    try {
      createRelative(anchorId, kind, draft, {
        partnerType,
        parentChildType,
        secondParentId: kind === 'child' ? secondParentId || undefined : undefined,
        customLabel,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'This relationship could not be added.');
    }
  };

  return (
    <Modal
      open
      title={`Add relative to ${anchor.name}`}
      description="Only the relationship you add will be created. Other branches remain untouched."
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}

        <label className="field">
          <span>Relationship</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="child">Add child</option>
            <option value="partner">Add spouse / partner</option>
            <option value="parent">Add parent</option>
          </select>
        </label>

        <PersonFields
          value={draft}
          onChange={setDraft}
          nameLabel="Relative's full name"
          autofocus
        />

        {kind === 'partner' ? (
          <label className="field">
            <span>Partner relationship</span>
            <select
              value={partnerType}
              onChange={(event) => setPartnerType(event.target.value as PartnerType)}
            >
              <option value="spouses">Spouses</option>
              <option value="partners">Partners</option>
              <option value="co-parents">Co-parents</option>
              <option value="divorced">Divorced</option>
              <option value="separated">Separated</option>
              <option value="widowed">Widowed</option>
              <option value="unspecified">Unspecified</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Parent-child relationship</span>
            <select
              value={parentChildType}
              onChange={(event) => setParentChildType(event.target.value as ParentChildType)}
            >
              <option value="biological">Biological / standard</option>
              <option value="adopted">Adopted</option>
              <option value="step">Stepchild</option>
              <option value="foster">Foster</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        )}

        {kind === 'child' && partners.length > 0 ? (
          <label className="field">
            <span>Also add as parent</span>
            <select
              value={secondParentId}
              onChange={(event) => setSecondParentId(event.target.value)}
            >
              <option value="">Only {anchor.name}</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
            <small>If this child belongs to a couple, choose the other parent here.</small>
          </label>
        ) : null}

        {(partnerType === 'custom' && kind === 'partner') ||
        (parentChildType === 'custom' && kind !== 'partner') ? (
          <label className="field">
            <span>Custom relationship</span>
            <input
              maxLength={200}
              value={customLabel}
              onChange={(event) => setCustomLabel(event.target.value)}
            />
          </label>
        ) : null}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Add relative
          </button>
        </div>
      </form>
    </Modal>
  );
}
