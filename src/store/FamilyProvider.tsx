import { useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import {
  addRelative,
  createInitialTree,
  deletePerson,
  getAncestorIds,
  updatePerson,
} from '../lib/family';
import { getBrowserRepository, type LoadResult } from '../lib/storage';
import { validateFamilyTree } from '../lib/validation';
import type { CreateTreeInput, FamilyTreeData, PersonInput } from '../types/family';
import { FamilyContext, type AddRelativeOptions, type FamilyContextValue } from './family-context';

export function FamilyProvider({ children }: { children: ReactNode }) {
  const repository = useMemo(() => getBrowserRepository(), []);
  const initialLoad = useMemo<LoadResult>(
    () => repository?.load() ?? { status: 'empty' },
    [repository],
  );
  const initialUi = useMemo(
    () => repository?.loadUiState() ?? { collapsedPersonIds: [] },
    [repository],
  );

  const [data, setData] = useState<FamilyTreeData | null>(
    initialLoad.status === 'ok' ? initialLoad.data : null,
  );
  const [loadIssue, setLoadIssue] = useState<Extract<LoadResult, { status: 'corrupt' }> | null>(
    initialLoad.status === 'corrupt' ? initialLoad : null,
  );
  const [storageError, setStorageError] = useState<string | null>(
    initialLoad.status === 'unavailable' ? initialLoad.error : null,
  );
  const currentData = useRef(data);
  const commit = useCallback((next: FamilyTreeData | null) => {
    currentData.current = next;
    setData(next);
  }, []);
  const [collapsedPersonIds, setCollapsedPersonIds] = useState<string[]>(
    initialUi.collapsedPersonIds,
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    if (!repository || !data || loadIssue) return;

    let cancelled = false;
    let nextError: string | null = null;

    try {
      repository.save(data);
    } catch (error) {
      nextError =
        error instanceof Error ? error.message : 'Browser storage could not save your family tree.';
    }

    queueMicrotask(() => {
      if (!cancelled) setStorageError(nextError);
    });

    return () => {
      cancelled = true;
    };
  }, [data, loadIssue, repository]);

  useEffect(() => {
    if (!repository || loadIssue) return;
    try {
      repository.saveUiState({ collapsedPersonIds });
    } catch {
      // Presentation state is non-critical. Family data persistence is handled separately.
    }
  }, [collapsedPersonIds, loadIssue, repository]);

  const createTree = useCallback(
    (input: CreateTreeInput) => {
      const tree = createInitialTree(input);
      commit(tree);
      setLoadIssue(null);
      setCollapsedPersonIds([]);
      setSelectedPersonId(Object.keys(tree.people)[0] ?? null);
    },
    [commit],
  );

  const editPerson = useCallback(
    (personId: string, input: PersonInput) => {
      if (!currentData.current) throw new Error('Create a family tree first.');
      commit(updatePerson(currentData.current, personId, input));
    },
    [commit],
  );

  const createRelative = useCallback(
    (
      anchorId: string,
      kind: 'child' | 'parent' | 'partner',
      input: PersonInput,
      options?: AddRelativeOptions,
    ) => {
      if (!currentData.current) throw new Error('Create a family tree first.');
      const result = addRelative(currentData.current, anchorId, kind, input, options);
      commit(result.tree);
      setCollapsedPersonIds((current) => current.filter((id) => id !== anchorId));
      setSelectedPersonId(result.person.id);
      setFocusRequest((value) => value + 1);
      return result.person.id;
    },
    [commit],
  );

  const removePerson = useCallback(
    (personId: string) => {
      if (!currentData.current) throw new Error('Create a family tree first.');
      commit(deletePerson(currentData.current, personId));
      setCollapsedPersonIds((current) => current.filter((id) => id !== personId));
      setSelectedPersonId((current) => (current === personId ? null : current));
    },
    [commit],
  );

  const replaceTree = useCallback(
    (tree: FamilyTreeData) => {
      const result = validateFamilyTree(tree);
      if (!result.ok) throw new Error(result.errors.slice(0, 5).join(' '));
      commit(tree);
      setLoadIssue(null);
      setCollapsedPersonIds([]);
      setSelectedPersonId(null);
    },
    [commit],
  );

  const resetTree = useCallback(() => {
    repository?.clear();
    commit(null);
    setLoadIssue(null);
    setCollapsedPersonIds([]);
    setSelectedPersonId(null);
    setStorageError(null);
  }, [repository, commit]);

  const recoverReset = useCallback(() => {
    repository?.clear();
    setLoadIssue(null);
    commit(null);
    setCollapsedPersonIds([]);
    setSelectedPersonId(null);
  }, [repository, commit]);

  const toggleCollapsed = useCallback((personId: string) => {
    setCollapsedPersonIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    );
  }, []);

  const selectPerson = useCallback((personId: string | null, focus = false) => {
    setSelectedPersonId(personId);
    if (personId && focus) setFocusRequest((value) => value + 1);
  }, []);

  const focusPerson = useCallback(
    (personId: string) => {
      if (!data?.people[personId]) return;
      const ancestors = getAncestorIds(data, personId);
      ancestors.add(personId);
      setCollapsedPersonIds((current) => current.filter((id) => !ancestors.has(id)));
      setSelectedPersonId(personId);
      setFocusRequest((value) => value + 1);
    },
    [data],
  );

  const value = useMemo<FamilyContextValue>(
    () => ({
      data,
      loadIssue,
      storageError,
      collapsedPersonIds,
      selectedPersonId,
      focusRequest,
      createTree,
      editPerson,
      createRelative,
      removePerson,
      replaceTree,
      resetTree,
      recoverReset,
      toggleCollapsed,
      selectPerson,
      focusPerson,
    }),
    [
      data,
      loadIssue,
      storageError,
      collapsedPersonIds,
      selectedPersonId,
      focusRequest,
      createTree,
      editPerson,
      createRelative,
      removePerson,
      replaceTree,
      resetTree,
      recoverReset,
      toggleCollapsed,
      selectPerson,
      focusPerson,
    ],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
