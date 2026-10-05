# Testing

Install with `npm ci`; run `npm run check`. This runs formatting, ESLint, Vitest, and a production build with TypeScript checking. `npm test` runs the suite once; `npm run test:watch` supports iteration. CI also runs `npm audit --audit-level=high` against the complete dependency tree.

The tests exercise real domain functions and JSON/storage adapters. Memory storage fakes model blocked access, quota failures and multiple repository instances sharing one saved value. Tests protect relationship uniqueness, circular ancestry prevention, atomic two-parent creation, deletion cleanup, collapsed visibility, editing validation, backup round trips/corruption, reserved keys, inherited references, delimiter-containing IDs, deep ancestry and partial dates. Layout tests require finite positions and valid visible edge endpoints. They do not pin incidental pixel coordinates or chase coverage percentages.

## Manual browser release checks

Use a disposable test origin, never reset real family data for QA:

1. Create a two-person tree; refresh and verify persistence.
2. Add a child with both parents, another partner and a parent; check details.
3. Edit names/dates/notes; reject invalid dates and preserve the original.
4. Collapse a branch; search for a hidden member and verify expansion/focus.
5. Delete a person; retain descendants and remove their direct links.
6. Export a backup, import it and explicitly confirm replacement; reject malformed JSON and missing references.
7. Reset only after exporting; verify DELETE confirmation and corrupt-data recovery confirmation.
8. With two tabs, change saved data in one and edit/reset in the stale one; verify warning and export/reload recovery.
9. Test blocked storage, quota exhaustion and file-read failures.
10. Check native-dialog focus/Escape, all actions with keyboard, mobile portrait/landscape, contrast and a screen reader.

There is no committed browser E2E suite, React provider interaction harness, automated accessibility scan or performance benchmark. Domain/storage tests do not establish browser accessibility or deployment correctness. The audit records which browser checks were actually executed. A future browser suite should cover these failure paths before higher-assurance release claims.

## Manual verification recorded

On 2026-10-05, the user confirmed that a backup was created and restored successfully. This verifies that manual round trip for the tested backup; file size and browser were not reported. It does not establish automated browser coverage or large-file restore behavior.
