import { useCallback, useEffect, useState } from 'react';
import { DataDialog } from './components/DataDialog';
import { DeletePersonDialog } from './components/DeletePersonDialog';
import { DetailsPanel } from './components/DetailsPanel';
import { FamilyTreeCanvas } from './components/FamilyTreeCanvas';
import { Onboarding } from './components/Onboarding';
import { PersonEditor } from './components/PersonEditor';
import { RecoveryScreen } from './components/RecoveryScreen';
import { RelativeDialog } from './components/RelativeDialog';
import { Toolbar } from './components/Toolbar';
import { THEME_STORAGE_KEY } from './lib/storage';
import { useFamily } from './store/family-context';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const { data, loadIssue, storageError } = useFamily();
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [dataOpen, setDataOpen] = useState(false);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);
  const [relativeDialog, setRelativeDialog] = useState<{
    anchorId: string;
    kind: 'child' | 'parent' | 'partner';
  } | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme persistence is optional; the app remains usable without it.
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'dark' ? '#171613' : '#f7f2ea');
  }, [theme]);

  const openRelative = useCallback(
    (anchorId: string, kind: 'child' | 'parent' | 'partner' = 'child') => {
      setRelativeDialog({ anchorId, kind });
    },
    [],
  );

  if (loadIssue) return <RecoveryScreen />;
  if (!data) return <Onboarding />;

  return (
    <div className="app-shell">
      <Toolbar
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        onOpenData={() => setDataOpen(true)}
      />

      {storageError ? (
        <div className="storage-warning" role="alert">
          Browser storage could not save the latest change. Export a backup now. {storageError}
        </div>
      ) : null}

      <main className="workspace">
        <FamilyTreeCanvas
          onAddRelative={(personId) => openRelative(personId, 'child')}
          onEdit={setEditPersonId}
        />
        <DetailsPanel
          onEdit={setEditPersonId}
          onAddRelative={openRelative}
          onDelete={setDeletePersonId}
        />
      </main>

      <div className="privacy-pill">
        Your family tree is stored locally in this browser unless you explicitly export it.
      </div>

      {dataOpen ? <DataDialog open onClose={() => setDataOpen(false)} /> : null}
      <PersonEditor personId={editPersonId} onClose={() => setEditPersonId(null)} />
      <RelativeDialog
        anchorId={relativeDialog?.anchorId ?? null}
        initialKind={relativeDialog?.kind ?? 'child'}
        onClose={() => setRelativeDialog(null)}
      />
      <DeletePersonDialog personId={deletePersonId} onClose={() => setDeletePersonId(null)} />
    </div>
  );
}
