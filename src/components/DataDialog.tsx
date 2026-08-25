import { useRef, useState } from 'react';
import { backupFilename, downloadTextFile, exportTree, importTree } from '../lib/backup';
import { useFamily } from '../store/family-context';
import type { FamilyTreeData } from '../types/family';
import { Modal } from './Modal';

interface DataDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DataDialog({ open, onClose }: DataDialogProps) {
  const { data, replaceTree, resetTree } = useFamily();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ data: FamilyTreeData; filename: string } | null>(null);
  const [deleteText, setDeleteText] = useState('');

  const chooseFile = async (file: File | undefined) => {
    setPendingImport(null);
    setMessage(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Backup files larger than 2 MB are not accepted in this version.');
      return;
    }
    const result = importTree(await file.text());
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setPendingImport({ data: result.data, filename: file.name });
    setMessage(`Validated ${file.name}. Confirm below to replace the current tree.`);
  };

  return (
    <Modal open={open} title="Backup & family data" description="Your tree is stored only in this browser unless you export it." onClose={onClose} wide>
      <div className="data-sections">
        <section>
          <h3>Export family tree</h3>
          <p>Download a complete JSON backup before clearing browser data, changing devices, or making major edits.</p>
          <button
            className="primary-button"
            type="button"
            disabled={!data}
            onClick={() => data && downloadTextFile(exportTree(data), backupFilename())}
          >
            Export JSON backup
          </button>
        </section>

        <section>
          <h3>Import family tree</h3>
          <p>The file is validated before anything is replaced. Invalid IDs, missing references, and ancestry cycles are rejected.</p>
          <input
            ref={fileRef}
            className="file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void chooseFile(event.target.files?.[0])}
          />
          {message ? <div className={pendingImport ? 'info-box' : 'form-error'} role="status">{message}</div> : null}
          {pendingImport ? (
            <div className="confirm-import">
              <strong>Replace the current tree with this validated backup?</strong>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  replaceTree(pendingImport.data);
                  setPendingImport(null);
                  setMessage('Backup imported successfully.');
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Replace current tree
              </button>
            </div>
          ) : null}
        </section>

        <section className="danger-zone">
          <h3>Reset family tree</h3>
          <p>This removes the family tree from this browser. Export a backup first if you may need it again.</p>
          <label className="field">
            <span>Type DELETE to confirm</span>
            <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} autoComplete="off" />
          </label>
          <button
            className="danger-button"
            type="button"
            disabled={deleteText !== 'DELETE'}
            onClick={() => {
              resetTree();
              setDeleteText('');
              onClose();
            }}
          >
            Delete / reset family tree
          </button>
        </section>
      </div>
    </Modal>
  );
}
