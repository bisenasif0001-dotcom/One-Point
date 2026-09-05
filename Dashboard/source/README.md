# One Point Dashboard

This folder contains the existing React dashboard source for One Point Service OS.

The dashboard is a protected platform asset. It must be upgraded in place and must not be replaced with a separate dashboard unless the owner explicitly approves that exception.

## Governance

Dashboard work is governed by:

- The Master Blueprint.
- `../../MASTER_PROJECT_MEMORY.md`.
- `../../docs/architecture/governance.md`.
- `../../docs/architecture/blueprint-map.md`.
- The approved milestone plan for the current implementation step.

If a dashboard change conflicts with the Master Blueprint, the Blueprint wins unless the owner explicitly approves an exception.

## Build Path

The dashboard source lives in:

```text
Dashboard/source/
```

The dashboard build output is served from:

```text
Dashboard/web/
```

The root backend serves the built dashboard at:

```text
/dashboard/
```

Normal admin access should go through the root backend, not an unrelated standalone dashboard route.

## Local Commands

From this folder:

```powershell
npm install
npm run dev
npm run build
npm run lint
```

From the repository root:

```powershell
npm run dashboard:build
npm run dashboard:lint
```

## Development Rules

- Preserve the existing dashboard.
- Preserve existing panel routes and user flows unless a milestone explicitly approves changes.
- Do not move business rules into React components.
- Do not use dashboard-only state as business truth.
- Do not create a parallel admin system.
- Do not bypass backend APIs, permissions, or audit requirements.
- Keep future AI workforce surfaces connected to governed backend and AI runtime layers.

## Current Role

Today this dashboard is an existing admin/customer operations surface. Long term, it must evolve into the Enterprise Command Center described by the Master Blueprint, but only through approved milestones.
