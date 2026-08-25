import { Handle, Position, type NodeProps } from '@xyflow/react';
import { displayAge, displayLifeSpan } from '../lib/date';
import { useFamily } from '../store/family-context';
import type { PersonFlowNode } from '../lib/graph';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { data: tree, selectPerson, toggleCollapsed } = useFamily();
  const person = tree?.people[data.personId];
  if (!person) return null;
  const age = displayAge(person.birthDate, person.deathDate);

  return (
    <article
      className={`person-node ${data.selected ? 'is-selected' : ''}`}
      aria-label={`${person.name}, family member`}
      onDoubleClick={() => selectPerson(person.id, true)}
    >
      <Handle id="parent-target" type="target" position={Position.Top} className="family-handle" />
      <Handle id="partner-left" type="target" position={Position.Left} className="family-handle" />

      <button className="person-node-main" type="button" onClick={() => selectPerson(person.id)}>
        <span className={`avatar avatar-${person.gender}`}>{initials(person.name)}</span>
        <span className="person-node-copy">
          <strong title={person.name}>{person.name}</strong>
          {age ? <span className="person-age">{age}</span> : null}
          <span className="person-years">{displayLifeSpan(person.birthDate, person.deathDate)}</span>
          <small>{data.childCount} {data.childCount === 1 ? 'child' : 'children'}</small>
        </span>
      </button>

      <div className="person-node-actions">
        <button type="button" onClick={() => data.onAddRelative?.(person.id)} aria-label={`Add a relative to ${person.name}`}>
          + Add relative
        </button>
        <button type="button" onClick={() => data.onEdit?.(person.id)} aria-label={`Edit ${person.name}`}>
          Edit
        </button>
        <button type="button" onClick={() => selectPerson(person.id)} aria-label={`Open details for ${person.name}`}>
          Details
        </button>
        {data.descendantCount > 0 ? (
          <button
            type="button"
            onClick={() => toggleCollapsed(person.id)}
            aria-expanded={!data.collapsed}
            aria-label={`${data.collapsed ? 'Expand' : 'Collapse'} descendants of ${person.name}`}
          >
            {data.collapsed ? `Expand (${data.descendantCount})` : 'Collapse'}
          </button>
        ) : (
          <span className="node-action-placeholder">No branch yet</span>
        )}
      </div>

      <Handle id="partner-right" type="source" position={Position.Right} className="family-handle" />
      <Handle id="child-source" type="source" position={Position.Bottom} className="family-handle" />
    </article>
  );
}
