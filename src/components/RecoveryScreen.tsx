import { downloadTextFile } from '../lib/backup';
import { useFamily } from '../store/family-context';
import { useState } from 'react';

export function RecoveryScreen() {
  const { loadIssue, recoverReset } = useFamily();
  const [error, setError] = useState<string | null>(null);
  if (!loadIssue) return null;

  return (
    <main className="recovery-shell">
      <section className="recovery-card">
        <span className="eyebrow">Saved data needs attention</span>
        <h1>Your stored family tree could not be loaded safely.</h1>
        <p>
          The app did not overwrite the saved value. You can download the raw saved data for
          recovery, or reset local storage and start again.
        </p>
        <div className="form-error" role="alert">
          {loadIssue.error}
        </div>
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="recovery-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              downloadTextFile(
                loadIssue.raw,
                `family-tree-corrupt-recovery-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            Download raw saved data
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => {
              if (
                !window.confirm(
                  'Delete the saved tree? Download the raw data first if you need to recover it.',
                )
              )
                return;
              try {
                recoverReset();
              } catch (caught) {
                setError(caught instanceof Error ? caught.message : 'Reset failed.');
              }
            }}
          >
            Reset local tree
          </button>
        </div>
      </section>
    </main>
  );
}
