import { getChildren, getDescendantIds, getParents, getPartners } from '../lib/family';
import { useFamily } from '../store/family-context';
import { Modal } from './Modal';

interface DeletePersonDialogProps {
  personId: string | null;
  onClose: () => void;
}

export function DeletePersonDialog({ personId, onClose }: DeletePersonDialogProps) {
  const { data, removePerson } = useFamily();
  const person = personId ? data?.people[personId] : undefined;
  if (!data || !person) return <Modal open={false} title="Delete person" onClose={onClose}>{null}</Modal>;

  const directLinks = getParents(data, person.id).length + getPartners(data, person.id).length + getChildren(data, person.id).length;
  const descendants = getDescendantIds(data, person.id).size;

  return (
    <Modal open title={`Delete ${person.name}?`} description="This cannot be undone from the app." onClose={onClose}>
      <div className="warning-box">
        <strong>Only this person will be deleted.</strong>
        <p>
          {directLinks} direct relationship link{directLinks === 1 ? '' : 's'} referring to this person will be removed. {descendants} descendant{descendants === 1 ? '' : 's'} will be kept as separate valid family records.
        </p>
      </div>
      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
        <button className="danger-button" type="button" onClick={() => { removePerson(person.id); onClose(); }}>Delete person</button>
      </div>
    </Modal>
  );
}
