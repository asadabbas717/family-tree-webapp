import { downloadTextFile } from '../lib/backup';
import { useFamily } from '../store/family-context';

export function RecoveryScreen() {
  const { loadIssue, recoverReset } = useFamily();
  if (!loadIssue) return null;

  return (
    <main className="recovery-shell">
      <section className="recovery-card">
        <span className="eyebrow">Saved data needs attention</span>
        <h1>Your stored family tree could not be loaded safely.</h1>
        <p>
          The app did not overwrite the saved value. You can download the raw saved data for recovery, or reset local storage and start again.
        </p>
        <div className="form-error" role="alert">{loadIssue.error}</div>
        <div className="recovery-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => downloadTextFile(loadIssue.raw, `family-tree-corrupt-recovery-${new Date().toISOString().slice(0, 10)}.json`)}
          >
            Download raw saved data
          </button>
          <button className="danger-button" type="button" onClick={recoverReset}>Reset local tree</button>
        </div>
      </section>
    </main>
  );
}
