# Architecture and current decisions

This is a static, single-user family record editor. There is no server, authentication, external API, database, or synchronization service.

```text
main -> ErrorBoundary -> FamilyProvider -> App -> UI components
                           |                  |
                           v                  v
                  family operations       graph layout -> Dagre / React Flow
                           |
                           v
                    dates / validation / types

FamilyProvider -> LocalFamilyRepository -> browser localStorage
DataDialog -> backup parser -> validation -> FamilyProvider.replaceTree
```

`types/family.ts` defines the v1 normalized wire model. `lib/family.ts` performs immutable domain changes, including cycle prevention and non-cascading deletion. `lib/validation.ts` checks unknown persisted/imported input; shared enum sets align mutation and import rules. `lib/graph.ts` projects records into layout nodes/edges; no layout coordinates enter persisted family data. Presentation state uses separate keys. React escapes names, notes and relationship labels as text.

## Current engineering decisions (2026-10-05)

1. **Keep the normalized v1 schema.** People and links remain separate maps. A nested family structure would duplicate shared parents/partners. No migration is required; existing valid backups remain readable. Reserved object keys and empty record IDs are now rejected deliberately.
2. **Keep localStorage for this release.** Small, synchronous snapshot persistence is adequate for the existing local scope. IndexedDB would offer transactions and larger capacity but adds asynchronous migration/recovery work. Trade-off: no atomic multi-tab writes, encryption, cloud backup or offline asset caching. Raw corrupt data is preserved until explicit reset.
3. **Compare saved snapshots before writes/reset.** A repository remembers its last read/successful write. A mismatch raises a visible conflict rather than overwriting a detected external change. This is optimistic detection, not locking; simultaneous read/write windows remain possible. Use one editing tab. Unknown storage contents after blocked initial reads cannot be overwritten.
4. **Apply mutations synchronously before React state updates.** A ref holds the current tree for successive event actions. Domain errors reach the caller's form catch, and batched actions operate on the latest snapshot. Effects handle persistence independently, retaining unsaved memory on failure. No new state management dependency was needed.
5. **Iterative import cycle validation and indexed traversal.** Topological cycle detection avoids stack exhaustion in deep trees; ancestry queries build adjacency once per traversal. Selection updates decorate an existing layout instead of rerunning Dagre. Layout still computes descendant counts per node; very large trees need measured profiling and possibly workers.
6. **Partial dates represent intervals.** A death year equal to the full birth date's year is accepted because the order is unknown. Definitely earlier death dates are rejected. Partial-date age displays remain approximate.

Partner-connected components share a layout unit. Complex partnerships can produce crossing lines or same-rank ancestry links; rendering does not redefine domain relationships. Relationship type metadata on parent-child links is preserved in data but is not displayed on every graph edge.
