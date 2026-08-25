# Family Tree Web App

A deploy-ready, local-first interactive family tree for recording only the branches a user chooses to create. The application starts with any two people, supports multiple spouse/partner relationships, validates ancestry links, and keeps family information in the current browser unless the user explicitly exports a JSON backup.

## Screenshots

> Add screenshots after the first local/deployed visual review.

- Desktop tree canvas — `docs/screenshots/desktop-tree.png`
- Mobile family details — `docs/screenshots/mobile-details.png`
- First-run setup — `docs/screenshots/onboarding.png`

## Features

- First-run setup for any two starting people
- Optional context: parents, grandparents, great-grandparents, great-great-grandparents, custom, or unspecified
- Normalized person, partner, and parent-child records
- Multiple spouses/partners without duplicating a person
- Add child, parent, spouse, or partner only when needed
- Biological, adopted, step, foster, and custom parent-child relationship types
- Branch collapse/expand without deleting data
- Hidden-descendant counts on collapsed branches
- Automatic Dagre graph layout
- Mouse, trackpad, and touch pan/zoom via React Flow
- Zoom in/out, fit tree, and center selected person
- Name search that expands required ancestor branches and focuses the result
- Person editing and safe non-cascading deletion
- Light and dark themes
- Versioned local browser persistence with corruption recovery
- JSON backup export/import with validation before replacement
- Strong reset confirmation by typing `DELETE`
- Responsive desktop, tablet, portrait-phone, and landscape-phone layouts
- Semantic labels, native dialogs, visible focus states, reduced-motion support, and practical keyboard support
- No account, backend, cloud database, API key, analytics, or tracking
- Cloudflare Pages-ready static output and security headers

## Tech Stack

- React 19
- TypeScript 6.0 (latest line officially supported by the current typescript-eslint toolchain)
- Vite 8
- `@xyflow/react` 12 for interactive graph rendering
- `@dagrejs/dagre` 3 for automatic positioning
- React Context + focused domain functions for state changes
- Browser `localStorage` for Version 1 persistence
- Vitest for non-visual domain/import/storage tests
- ESLint + Prettier
- Plain responsive CSS to avoid an unnecessary styling framework dependency

React Flow was selected because it is actively maintained and provides mature pan, zoom, touch, accessibility hooks, minimap, and efficient node rendering. Dagre is used only for client-side automatic positioning. The family model itself does not depend on either library.

## Architecture

The application separates family data from presentation state.

### Domain data

```text
Person
  id
  name
  gender
  birthDate/deathDate
  notes

PartnerRelationship
  id
  person1Id
  person2Id
  type

ParentChildRelationship
  id
  parentId
  childId
  type
```

Complete people are not nested inside one another. This keeps multiple parents, multiple partners, shared references, deletion cleanup, and future database migration manageable.

### Integrity rules

Domain and import validation prevent:

- self-parenting
- parent-child ancestry cycles
- self-partnering
- duplicate parent-child records
- duplicate partner pairs
- orphan relationship references
- invalid or duplicate record IDs in imported data
- malformed birth/death values
- death dates before birth dates

Deleting a person removes only that person and relationships that refer to them. Descendants and other valid people remain in the tree.

### Persistence

`src/lib/storage.ts` provides a small repository abstraction around local storage. UI components do not write directly to storage. This makes a future Supabase/Firebase/API repository possible without rewriting every component.

Storage keys:

```text
family-tree-webapp:data:v1
family-tree-webapp:ui:v1
family-tree-webapp:theme
```

If saved family JSON is corrupt, the app does not silently overwrite it. A recovery screen lets the user download the raw value before resetting.

## Project Structure

```text
Family_Tree_WebApp/
├── public/
│   └── _headers
├── src/
│   ├── components/
│   │   ├── DataDialog.tsx
│   │   ├── DeletePersonDialog.tsx
│   │   ├── DetailsPanel.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FamilyTreeCanvas.tsx
│   │   ├── Modal.tsx
│   │   ├── Onboarding.tsx
│   │   ├── PersonEditor.tsx
│   │   ├── PersonFields.tsx
│   │   ├── PersonNode.tsx
│   │   ├── RecoveryScreen.tsx
│   │   ├── RelativeDialog.tsx
│   │   └── Toolbar.tsx
│   ├── lib/
│   │   ├── __tests__/
│   │   ├── backup.ts
│   │   ├── date.ts
│   │   ├── family.ts
│   │   ├── graph.ts
│   │   ├── id.ts
│   │   ├── storage.ts
│   │   └── validation.ts
│   ├── store/
│   │   └── FamilyContext.tsx
│   ├── types/
│   │   └── family.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```

## Prerequisites — Windows 11 + Git Bash

Check your environment from the real project directory:

```bash
cd /c/Users/Waheed/Desktop/Web/Family_Tree_WebApp
pwd
ls -la
git status
node --version
npm --version
```

Use Node.js 20.19+ or 22.12+ (Vite 8 requirement). Do not create a directory containing `&#x20;`, an escaped underscore, or a trailing space.

## Local Development

```bash
cd /c/Users/Waheed/Desktop/Web/Family_Tree_WebApp
npm install
npm run dev
```

Vite prints the local URL, normally similar to `http://localhost:5173/`.

## Verification

Run all quality gates before pushing or deploying:

```bash
npm run lint
npm test
npm run build
```

Optional formatting check:

```bash
npm run format:check
```

Preview the exact production build locally:

```bash
npm run preview
```

## Production Build

```bash
npm run build
```

Vite outputs static production files to:

```text
dist/
```

Do not commit `dist/` or `node_modules/`.

## Backups and Imports

### Export

Open **Backup & data** and choose **Export JSON backup**. The file name follows this format:

```text
family-tree-backup-YYYY-MM-DD.json
```

The exported file contains the complete normalized tree and schema metadata.

### Import

Choose a JSON backup from **Backup & data**. The app validates the schema, record references, duplicate relationships, dates, and ancestry cycles before offering to replace the current tree.

Invalid JSON does not replace the current data.

### Reset

Reset requires entering:

```text
DELETE
```

Export first if the tree may be needed later.

## Privacy and Storage

**Your family tree is stored locally in this browser unless you explicitly export it.**

Version 1 does not send family data to a server and does not include analytics or third-party tracking. `localStorage` is persistent browser storage, not encrypted storage. Clearing site/browser data, changing browsers, reinstalling the operating system, or losing the device can remove the tree. Export JSON backups regularly.

## GitHub Setup

First inspect the existing repository instead of blindly reinitializing it:

```bash
cd /c/Users/Waheed/Desktop/Web/Family_Tree_WebApp
git status
git remote -v
```

If it is already a repository, do **not** run `git init` again.

After verification:

```bash
git add .
git status
git commit -m "Build initial interactive family tree application"
```

If GitHub CLI is installed and authenticated and there is no conflicting remote:

```bash
gh auth status
gh repo create family-tree-webapp --public --source=. --remote=origin --push
```

Otherwise create an empty public repository named `family-tree-webapp` on GitHub, then inspect remotes again and add the correct one only if `origin` does not already exist:

```bash
git branch -M main
git remote -v
git remote add origin https://github.com/YOUR_USERNAME/family-tree-webapp.git
git push -u origin main
```

Never overwrite an existing `origin` until you have inspected where it points.

## Cloudflare Pages Deployment

Cloudflare Pages is the primary hosting target. GitHub is only the source repository.

Current Cloudflare Pages build settings for React + Vite:

```text
Framework preset: React (Vite)
Production branch: main
Build command: npm run build
Build output directory: dist
Root directory: /   (repository root)
```

No environment variables or secrets are required.

### Deploy from GitHub

1. Sign in to Cloudflare Dashboard.
2. Open **Workers & Pages**.
3. Create a **Pages** application and connect GitHub.
4. Select the `family-tree-webapp` repository.
5. Set the production branch to `main`.
6. Use the React (Vite) preset.
7. Confirm build command `npm run build`.
8. Confirm output directory `dist`.
9. Deploy.
10. Open the generated `*.pages.dev` HTTPS URL and test onboarding, adding a child, refresh persistence, export/import, and responsive layouts.

Cloudflare Pages automatically treats a site with `index.html` and no top-level `404.html` as an SPA and falls back to the root for unmatched navigation routes. This project does not currently expose URL-based client routes, so no custom routing function is needed.

Cloudflare documentation:

- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

## Deployment Verification Checklist

After the first production deploy, verify:

- HTTPS home page loads without a console error
- first-run setup creates two people
- add child works and can include a second parent
- add spouse/partner works more than once for one person
- branch collapse/expand preserves records
- search focuses a person
- edit/delete behavior is correct
- page refresh keeps local data
- exported JSON can be imported
- malformed JSON is rejected
- light/dark theme works
- phone portrait and landscape remain usable
- assets load from `dist/`

Remember that local browser data on `localhost` and data on the deployed `pages.dev` origin are separate because browser storage is origin-specific.

## Known Limitations

- Version 1 is single-device and single-browser; there is no sync or account system.
- Browser local storage is not encrypted.
- Photos are intentionally excluded from the MVP; nodes use initials.
- Dagre produces a practical automatic layout but highly complex remarriages/shared descendants can create crossing lines. The data remains correct even when a dense graph needs extra panning.
- Relationship editing currently focuses on editing people and adding relationships; existing relationship metadata is not exposed as a separate advanced editor.
- No collaborative editing or share links are included.

## Future Roadmap

1. Optional encrypted cloud backup and cross-device sync behind an account.
2. Existing-person relationship linking and a dedicated relationship editor.
3. Better dense-tree layout using relationship hubs/ELK when trees become very complex.
4. Optional photo attachments stored safely with an IndexedDB/media strategy.
5. Private invitations, collaborative editing, and role-based access.
