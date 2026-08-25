import { useEffect, useMemo, useRef, useState } from 'react';
import { useFamily } from '../store/family-context';

interface ToolbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenData: () => void;
}

export function Toolbar({ theme, onToggleTheme, onOpenData }: ToolbarProps) {
  const { data, focusPerson } = useFamily();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!data || !query.trim()) return [];
    const normalized = query.trim().toLocaleLowerCase();
    return Object.values(data.people)
      .filter((person) => person.name.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [data, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const count = data ? Object.keys(data.people).length : 0;

  return (
    <header className="app-toolbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">FT</div>
        <div>
          <strong>Family Tree</strong>
          <span>{count} {count === 1 ? 'person' : 'people'} · local only</span>
        </div>
      </div>

      <div className="search-wrap">
        <label className="sr-only" htmlFor="family-search">Search family members</label>
        <input
          id="family-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search family…"
          autoComplete="off"
        />
        {query.trim() ? (
          <div className="search-results" role="listbox" aria-label="Family search results">
            {results.length ? results.map((person) => (
              <button
                key={person.id}
                type="button"
                role="option"
                onClick={() => {
                  focusPerson(person.id);
                  setQuery('');
                }}
              >
                <strong>{person.name}</strong>
                <span>{person.birthDate ?? 'Birth unknown'}</span>
              </button>
            )) : <p>No family member found.</p>}
          </div>
        ) : null}
      </div>

      <nav className="toolbar-actions" aria-label="Application actions">
        <button className="toolbar-button" type="button" onClick={onOpenData}>
          <span className="desktop-label">Backup & data</span><span className="mobile-label">Data</span>
        </button>
        <button className="toolbar-button" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </nav>
    </header>
  );
}
