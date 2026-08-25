import { getChildren, getDescendantIds, getParents, getPartners } from '../lib/family';
import { displayLifeSummary } from '../lib/date';
import { useFamily } from '../store/family-context';

interface DetailsPanelProps {
  onEdit: (personId: string) => void;
  onAddRelative: (personId: string, kind: 'child' | 'parent' | 'partner') => void;
  onDelete: (personId: string) => void;
}

export function DetailsPanel({ onEdit, onAddRelative, onDelete }: DetailsPanelProps) {
  const {
    data,
    selectedPersonId,
    selectPerson,
    collapsedPersonIds,
    toggleCollapsed,
  } = useFamily();

  if (!data || !selectedPersonId) return null;
  const person = data.people[selectedPersonId];
  if (!person) return null;
  const parents = getParents(data, person.id);
  const partners = getPartners(data, person.id);
  const children = getChildren(data, person.id);
  const descendants = getDescendantIds(data, person.id).size;
  const collapsed = collapsedPersonIds.includes(person.id);

  return (
    <aside className="details-panel" aria-label={`Details for ${person.name}`}>
      <div className="details-header">
        <div>
          <span className="eyebrow">Selected family member</span>
          <h2>{person.name}</h2>
          <p>{displayLifeSummary(person.birthDate, person.deathDate)}</p>
        </div>
        <button className="icon-button" type="button" onClick={() => selectPerson(null)} aria-label="Close details">
          ×
        </button>
      </div>

      {person.notes ? <p className="details-notes">{person.notes}</p> : <p className="muted">No notes added.</p>}

      <dl className="relationship-summary">
        <div><dt>Parents</dt><dd>{parents.length ? parents.map((item) => item.name).join(', ') : 'Not added'}</dd></div>
        <div><dt>Partners</dt><dd>{partners.length ? partners.map((item) => item.name).join(', ') : 'Not added'}</dd></div>
        <div><dt>Children</dt><dd>{children.length ? children.map((item) => item.name).join(', ') : 'Not added'}</dd></div>
      </dl>

      <div className="details-actions">
        <button className="primary-button" type="button" onClick={() => onAddRelative(person.id, 'child')}>+ Add child</button>
        <button className="secondary-button" type="button" onClick={() => onAddRelative(person.id, 'partner')}>Add spouse / partner</button>
        <button className="secondary-button" type="button" onClick={() => onAddRelative(person.id, 'parent')}>Add parent</button>
        <button className="secondary-button" type="button" onClick={() => onEdit(person.id)}>Edit person</button>
        {descendants > 0 ? (
          <button className="secondary-button" type="button" onClick={() => toggleCollapsed(person.id)} aria-expanded={!collapsed}>
            {collapsed ? `Expand ${descendants} hidden descendant${descendants === 1 ? '' : 's'}` : 'Collapse branch'}
          </button>
        ) : (
          <div className="empty-branch-note">No descendants added yet. Add a child or leave this branch as it is.</div>
        )}
        <button className="danger-button" type="button" onClick={() => onDelete(person.id)}>Delete person</button>
      </div>
    </aside>
  );
}
