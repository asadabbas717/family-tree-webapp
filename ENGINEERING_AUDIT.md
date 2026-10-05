# Engineering Audit

Audit date: 2026-10-05. Scope: tracked application, tests, build/tool configuration, dependency lockfile, README, local repository status/history, and browser workflows. Baseline: commit `b9b3a64` plus the existing user-edited README. Those pre-existing edits were preserved. The repository has one initial commit; no history was rewritten or deployment performed. The user subsequently authorized committing and pushing the audit changes.

## Executive Summary

The original application was a useful portfolio-scale local family tree editor, with a sensible normalized model and small module boundaries. It already prevented ancestry cycles, performed non-cascading deletion, preserved corrupt stored JSON and had 19 meaningful unit tests. However, storage reads could crash startup, stale tabs could overwrite/delete newer data, import references could resolve inherited object properties, and successful mutations could produce values inconsistent with the import schema. Documentation claimed deploy readiness without CI or browser regression coverage.

Incremental improvements retain the React/TypeScript stack, v1 data format and local-only product scope. There are now 45 tests, explicit storage failure/conflict behavior, safer import validation, better mutation boundaries, fewer redundant layout computations, accurate engineering documentation and a CI quality gate. This is **portfolio quality with stronger engineering controls**, not a certified production release. Scores are judgment calls relative to this app's scope, not measurements or a security certification.

## Original Score

| Category                  |  Score |
| ------------------------- | -----: |
| Architecture              |   8/10 |
| Code Quality              |   7/10 |
| SOLID / Design            |   8/10 |
| Domain Modeling           |   7/10 |
| Security                  |   6/10 |
| Reliability               |   5/10 |
| Testing                   |   4/10 |
| Database/Persistence      |   7/10 |
| Performance               |   5/10 |
| Configuration             |   7/10 |
| Dependencies              |   6/10 |
| Logging/Observability     |   5/10 |
| UI/UX Robustness          |   6/10 |
| Accessibility             |   6/10 |
| Documentation             |   5/10 |
| Developer Experience      |   6/10 |
| CI/CD                     |   0/10 |
| Deployment/Release        |   5/10 |
| Repository Hygiene        |   7/10 |
| Overall (unweighted mean) | 5.8/10 |

Persistence scores apply to local snapshot storage, not an SQL database. Authentication, server API contracts, ORM/migrations, payments, synchronization and server deployment are N/A. Concurrency is assessed under reliability/persistence; Git practices are assessed under hygiene. No artificial interfaces or layered services are needed to earn credit for design.

## Major Problems Found

| Priority | Finding                                                                  | Evidence / disposition                                                                                                                                                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Stale tabs could overwrite newer family data or reset it                 | Separate repositories reading the same storage reproduced both failures. Writes/reset now compare against the last observed snapshot. Residual simultaneous race remains documented.                                                                                                                                         |
| P1       | Blocked localStorage access crashed provider startup                     | Repository read regression reproduced an uncaught exception. Both the property getter and reads now execute inside error handling; onboarding warns about memory-only operation.                                                                                                                                             |
| P1       | Import validation treated inherited object properties as existing people | `people['toString']` was truthy despite no person record. Own-property references and reserved-key rejection now protect the boundary. This was an integrity issue, not evidence of executable prototype pollution.                                                                                                          |
| P1       | Vulnerable transitive build dependency                                   | npm audit found high-severity recursion/DoS advisories in development-only brace-expansion 5.0.9. Patched compatibly to 5.0.12, with no major upgrades.                                                                                                                                                                      |
| P2       | Deep ancestry used recursive cycle validation                            | Valid deep chains could exhaust stack. Iterative topological validation now tests a 12,000-person chain and a closing cycle.                                                                                                                                                                                                 |
| P2       | Mutation/import rule drift                                               | Custom labels and starting-context text could exceed wire-schema limits; enum values were only statically constrained. Mutation functions now enforce enums and metadata limits. Imported legacy blank custom labels remain accepted for compatibility.                                                                      |
| P2       | Partial date inconsistency                                               | A full birth date and death year in the same year were rejected despite uncertain chronology. Both boundaries now use shared interval-aware chronology rules; year zero/invalid age inputs are rejected.                                                                                                                     |
| P2       | Errors inside React state updater functions were not catchable by forms  | Person edits/deletions now compute against the current snapshot synchronously. Successive batched actions share the latest tree and failures reach the caller. Provider behavior still lacks automated component interaction coverage.                                                                                       |
| P2       | Async file selection lacked read-error/race handling                     | Failed reads now produce feedback, superseded reads are ignored, and closing/reopening discards pending confirmation state. The active relationship type alone determines whether a custom label is required. Large exports can now be read after explicit size-warning confirmation, instead of being impossible to import. |
| P2       | Search declared incomplete listbox semantics                             | Results now use a labelled group of native buttons, with ordinary keyboard focus rather than unsupported option semantics. Backup input now has a label. Full accessibility audit remains outstanding.                                                                                                                       |
| P2       | Expensive graph recomputation on selection                               | Dagre layout is memoized separately from selected-person decoration. Traversals build adjacency instead of scanning every relationship per visited person. Large-tree layout remains unbenchmarked.                                                                                                                          |
| P2       | Documentation and verification drift                                     | Missing screenshot paths, obsolete module name, machine-specific setup and deploy-ready claims were corrected. Baseline format check failed on 21 files; formatting was normalized for an enforceable CI gate.                                                                                                               |

No P0 exposed credential, server authorization failure or verified remote-code vulnerability was found. This is bounded inspection, not proof of absence.

### Signals of uncontrolled generation / architectural drift

The strongest signals were documentation claims unsupported by verification, screenshot references without tracked screenshots, a context filename different from implementation, optional format checks that already failed, machine-specific onboarding commands, and duplication of rules across UI/domain/import paths. These observations do not establish how the code was authored. Existing repository and layout abstractions solve actual problems and were kept. There was no justification for rewriting working domain modules or adding generic service/interface boilerplate.

## Changes Implemented

- `storage.ts`: unavailable load result, lazy browser storage access, stale-snapshot write/reset detection, quota-safe snapshot tracking and optional UI cleanup handling.
- `FamilyProvider.tsx`: current-snapshot mutation boundary, synchronous error propagation, memory-only startup warning and validation on imported tree replacement.
- `validation.ts`, `date.ts`, `family.ts`: own-property references, reserved IDs, unambiguous serialized pair keys, iterative cycle detection, shared validation limits, partial-date chronology and indexed traversal.
- `graph.ts`, `FamilyTreeCanvas.tsx`: unambiguous layout-unit/group keys and separation of layout from selection decoration.
- `DataDialog`, `RecoveryScreen`, `PersonEditor`, `DeletePersonDialog`, `Onboarding`, `RelativeDialog`, `Toolbar`, `App`: failure feedback, confirmed recovery reset, import-request lifetime handling, domain-error catches and corrected accessibility semantics.
- Added `repository.test.ts` and `validation.test.ts`; expanded behavioral protection without a coverage target.
- `package-lock.json`: brace-expansion patch only. `package.json`: Node requirement and combined `check` command. `.github/workflows/quality.yml`: clean install, quality checks and high-severity audit with read-only repository permissions.
- README and four focused engineering documents added/updated. `docs/screenshots/audit-tree.png` is synthetic browser-test evidence.
- Existing formatting violations normalized. Other component/CSS/tsconfig diffs are largely formatting, not redesign.

## Architecture

```text
React UI -> FamilyProvider -> immutable family operations -> shared validation/date/types
                   |
                   +-> LocalFamilyRepository -> localStorage snapshot

Family records -> graph projection / Dagre -> React Flow canvas
Backup file -> JSON parser -> unknown-data validation -> explicit replacement
```

There is no network data integration, backend or ORM. Persisted family data remains independent from layout, theme and selection. The current v1 schema does not need a migration. The storage adapter is useful for tests and failure containment; it is not a claim that a cloud repository would require no architectural work. See [current decisions](docs/architecture.md).

## Critical Workflows

| Workflow                                     | Protection and verification                                                                                                                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-run two-person creation                | Domain validation; browser created a synthetic tree successfully.                                                                                                                                                                                                                                       |
| Add child with two parents                   | Immutable atomic domain operation; test verifies failed second-parent lookup leaves the original untouched. Browser confirmed both parent names.                                                                                                                                                        |
| Add partner/parent and prevent invalid links | Existing domain tests protect duplicates, self-parenting and ancestry cycles; custom-label regressions added.                                                                                                                                                                                           |
| Edit a person                                | Invalid date leaves original record intact in tests; browser rejected February 30 and saved February 29.                                                                                                                                                                                                |
| Delete person                                | Existing test verifies descendant retention and relationship cleanup; UI retains explicit confirmation and now displays errors. No browser deletion performed.                                                                                                                                          |
| Collapse and search hidden members           | Existing visibility test, layout endpoint test; browser verified hidden child then search expansion/focus.                                                                                                                                                                                              |
| Reload persisted tree                        | Serialization/repository tests; browser refresh retained three people.                                                                                                                                                                                                                                  |
| Backup export/import                         | Existing round-trip, malformed JSON, missing-reference and cycle tests plus boundary regressions. The browser-tool download wait timed out. The user subsequently confirmed successful backup creation and restoration on 2026-10-05; this is manual user verification, not automated browser coverage. |
| Corrupt saved-data recovery/reset            | Raw-value preservation test; reset now confirms and reports failure. Stale reset test preserves newer saved data.                                                                                                                                                                                       |
| Blocked/quota storage                        | Repository fake reproduces blocked reads and failed writes, verifies previous snapshot and safe retry. Browser storage-failure simulation not executed.                                                                                                                                                 |
| Multi-tab editing/reset                      | Shared-storage repository tests reproduce stale writes/reset. Browser simultaneous-tab behavior not executed; detection is not atomic locking.                                                                                                                                                          |

## Testing Strategy

Meaningful behavior is protected using Vitest and real domain/parser/layout functions. Repository integration tests use a minimal in-memory StorageLike implementation for deterministic failure injection. Browser checks were performed against `http://127.0.0.1:5173` using synthetic names. Unit tests cannot substitute for UI interaction, real browser file access, accessibility, deployment or cross-tab timing verification.

Baseline: 4 test files / 19 passing tests, lint and production build passed, formatting failed on 21 files. Storage regressions were run before the fix: three tests failed, reproducing blocked read, stale write and stale reset; quota retention already passed. Current suite: 6 files / 45 passing tests. `npm run check` passed formatting, lint, all tests and TypeScript/production build. A clean lockfile installation and final rechecks are recorded in the verification section below.

Intentionally absent: server/database/API tests (there is no such system), snapshot tests for incidental layout pixels, tests that merely mirror implementation, automated React/provider/E2E/a11y coverage and performance benchmarks. Those last four are real outstanding assurance gaps. See [testing guide](docs/testing.md).

## Security Review

No raw HTML rendering, external fetches, auth credentials, SQL, subprocess execution or cloud secrets exist in the application code inspected. Family data/backups remain plaintext. New validation protects map lookups and avoids recursive-stack rejection of deep chains. Native-dialog and destructive-action behavior is clearer. Existing static CSP/header policy was retained; its deployed behavior was not verified. Cloudflare interprets `_headers` as hosting configuration ([official documentation](https://developers.cloudflare.com/pages/configuration/headers/)); other hosts must configure equivalent headers.

The initial npm audit network call failed; a permitted registry-backed retry found one vulnerable development dependency. The compatible patch reported zero vulnerabilities. This is time-specific advisory evidence, not a guarantee against future vulnerabilities. No secrets were printed, invented or committed. History was inspected only at the single initial-commit level, not with a comprehensive historical secret scanner.

## Data Integrity

Every domain mutation returns a new tree; failures do not partially commit a two-parent child operation. Deletion removes referencing links but keeps descendants. Validation checks imported/saved IDs, relationships, enums, dates, timestamps and ancestry cycles before exposing data. Empty and reserved record keys are newly invalid; valid legacy v1 data keeps its wire shape. Pair/group keys serialize arrays instead of concatenating ambiguous delimiters.

Family snapshots use one localStorage key. Quota/storage errors retain in-memory edits for export and the previously saved snapshot where the failed operation did not change storage. Corrupt saved values are not autosaved over. Detected stale writers/resetters cannot replace a changed snapshot. The read/check/write sequence is not atomic across tabs; this release deliberately recommends one editing tab. Effects save after React updates, so abrupt page termination before an effect can lose the latest edit. No transaction, synchronization or backup guarantee is claimed.

## Remaining Technical Debt

- Automated UI/provider/E2E tests for import/reset, file-read races and batched mutations.
- Full keyboard, screen-reader and contrast verification; mobile portrait/landscape testing.
- Profile large family graphs and descendant-count computations; move expensive work off the UI thread only if measurements justify it.
- Existing-person linking and relationship metadata editing remain absent, as already disclosed by the product.
- Optional error diagnostics lack structured remote monitoring; local-only scope makes telemetry a separate privacy decision.

## Remaining Risks

- Plaintext, origin-specific localStorage and backups; clearing browser data/device loss can erase the only copy.
- Snapshot conflict checks cannot prevent a truly simultaneous cross-tab check/write race or automatically merge changes.
- Large imports now require confirmation above 2 MB but have no fixed maximum. Reading, validation and layout can exhaust memory or block the UI for extreme files; no large-file browser benchmark or automated confirmation-path test has been run.
- Imported unknown extra fields are preserved; they are not executed/rendered. Huge/deep graphs may remain expensive to render despite stack-safe validation.
- Deployed HTTPS/CSP/header enforcement, clean-host portability, CI service execution are not established by local tests. Backup creation/restoration has manual user confirmation; automated browser coverage remains absent.
- Source maps are publicly built for diagnostics; no secrets belong in frontend code.
- Age calculations based on partial years are approximate and use the user's local date for living age.

## Final Score

| Category                  |  Score |
| ------------------------- | -----: |
| Architecture              |   8/10 |
| Code Quality              |   8/10 |
| SOLID / Design            |   8/10 |
| Domain Modeling           |   8/10 |
| Security                  |   8/10 |
| Reliability               |   7/10 |
| Testing                   |   7/10 |
| Database/Persistence      |   8/10 |
| Performance               |   7/10 |
| Configuration             |   8/10 |
| Dependencies              |   8/10 |
| Logging/Observability     |   5/10 |
| UI/UX Robustness          |   7/10 |
| Accessibility             |   6/10 |
| Documentation             |   8/10 |
| Developer Experience      |   8/10 |
| CI/CD                     |   8/10 |
| Deployment/Release        |   7/10 |
| Repository Hygiene        |   8/10 |
| Overall (unweighted mean) | 7.5/10 |

The increase reflects implemented controls and verified behavior, not a 10/10 claim. Classification: **Portfolio quality**. Production assurance is limited by browser automation/accessibility gaps, non-atomic persistence and unverified deployment. The application remains suitable for local personal use with regular backups and one editing tab.

## Recommended Next Steps

1. Add an automated browser/provider suite for import/reset, blocked storage, batching and competing tabs; validate downloads and real file reads.
2. Establish measured file/layout capacity and add an automated regression covering the new large-backup confirmation and restore path.
3. Complete accessibility/mobile and deployed-header checks before a public release.
4. If multi-tab editing is required, introduce actual serialization/transaction coordination with recovery tests; do not present snapshot comparison as locking.

## Intentionally Not Changed

No framework switch, backend/account system, cloud sync, photos, microservices, generic service layers or schema migration was added: those would fabricate requirements and expand privacy/deployment scope. Existing v1 formats and sensible boundaries were retained. Source maps and the local render-error console diagnostic remain useful. Direct dependencies were not upgraded speculatively. No real family data was modified, Git history was not rewritten, and no deployment was performed.

## Final Verification

- Clean `npm ci` completed: 199 packages installed; registry audit reported zero vulnerabilities.
- Final `npm run check` after the clean install and all code changes passed: Prettier, ESLint, 45 tests in 6 files, TypeScript and Vite production build. Output: approximately 464 kB JavaScript / 147 kB gzip and 33 kB CSS / 6.7 kB gzip; this is a build observation, not a load-time benchmark.
- `npm ls --depth=0` matched pinned direct dependencies.
- `git diff --check` passed; no TODO/FIXME/HACK/XXX markers or credentials were found in inspected application/configuration sources. The retained console.error is deliberate local render diagnostics.
- Browser verified creation, two-parent child addition, reload, collapse, hidden search/focus and invalid/valid editing. Export download invocation timed out in browser automation. The user subsequently confirmed successful backup creation and restoration on 2026-10-05. No browser reset, mobile/a11y or deployment assertion is made.
- CI YAML was created but has not executed on GitHub. Local checks ran on Windows with Node 26.7.0/npm 12.0.2, not the CI Node 24/Linux image.
