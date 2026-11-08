# Copilot instructions for Atelier Lecture

## Project overview

This repository is a pnpm workspace monorepo with two runtime apps:

- `apps/tablet`: Vite + React + TypeScript client used by students and also for the adult/teacher web interface.
- `apps/server`: Express + TypeScript backend that serves the tablet app, exposes the class API, and stores data in SQLite.

The architecture is intentionally split between local device state and server-side canonical state:

- The tablet keeps local progress and session data in Dexie (`apps/tablet/src/db/db.ts`) and syncs it with the server through fetch calls to `/api/students` and `/api/sync`.
- The server owns teacher auth/session state and serves the built tablet bundle from `../tablet/dist` when running in production.

Primary entry points:

- `apps/tablet/src/App.tsx` for routing and initial bootstrapping
- `apps/server/src/index.ts` for Express configuration, middleware registration, HTTPS/HTTP startup, and static serving

## Build, lint, and validation commands

From the repository root:

- Install dependencies: `pnpm install`
- Start the tablet app in development: `pnpm --filter tablet run dev`
- Start the server in development: `pnpm --filter server run dev`
- Build the tablet app: `pnpm --filter tablet run build`
- Build the server: `pnpm --filter server run build`
- Build both apps: `pnpm run build:all`
- Lint the tablet app: `pnpm --filter tablet run lint`
- Start the production server: `pnpm start`
- Force-regenerate the self-signed certificate (the server already creates/renews it at startup when missing, near expiry or when a local IPv4 is missing from it): `pnpm cert`
- Back up the SQLite database (consistent copy, keeps the last 30): `pnpm backup` (after build) or `pnpm --filter server run backup:dev`
- Build the Windows release ZIP (run on Windows x64): `pnpm release`

There is no dedicated automated test runner configured in this workspace. The package manifests do not define a `test` script, so build and lint are the project’s current validation commands; if new tests are introduced, prefer the repo’s existing Vite/TypeScript setup rather than introducing a different stack without reason.

## High-level architecture

### Frontend (tablet app)

The tablet app is a Vite React app with route-based screens under `apps/tablet/src/pages` and gameplay logic under `apps/tablet/src/games`.

Key patterns in the tablet app:

- routes are declared in `apps/tablet/src/App.tsx`
- local persistence is Dexie-based and schema definitions live in `apps/tablet/src/db/db.ts`
- fetch wrappers and API boundaries live in `apps/tablet/src/services/*`
- game sessions are represented by `students`, `sessions`, `sessionActivities`, `results`, and queued sync entries

### Backend (server app)

The server is a TypeScript Express app with a small modular structure:

- `src/index.ts` wires middleware, API route groups, static file serving, and local HTTP/HTTPS startup
- `src/routes/*` defines the teacher auth, student, and sync endpoints
- `src/middleware/*` guards routes and validates the teacher/student context
- `src/data/*` stores the SQLite-backed records and teacher session state

The server also exposes a teacher login flow via cookie-based sessions (`teacherSession`), while keeping `/api/*` routes separate from the served tablet UI.

### Data and sync flow

The repository follows a clear split between local tablet storage and server-backed state:

- The tablet stores student progress and session results in Dexie and maintains a `syncQueue` for pending upload.
- The server owns authoritative class data and teacher authentication flow.
- Client bootstrapping loads students from the server before rendering the app (`apps/tablet/src/App.tsx`).

When changing cross-app behavior, keep the tablet fetch contracts and server route payloads aligned. The same data model is intentionally represented on both sides, but the source of truth remains on the server.

## Key conventions specific to this repository

- Use the root workspace scripts instead of calling nested package managers directly when the change is shared across apps.
- Server TypeScript files use ESM modules and NodeNext resolution; imports often include explicit `.js` extensions even though the source files are TypeScript.
- React screens live under `apps/tablet/src/pages`, and gameplay logic stays under `apps/tablet/src/games` instead of being mixed into route components.
- The tablet database schema is centralized in `apps/tablet/src/db/db.ts`; if you add or change a table, update the Dexie schema and any related types together.
- Teacher authentication is cookie-based and is handled in `apps/server/src/routes/teacherAuth.ts` together with session middleware.
- The server’s startup logic (`apps/server/src/index.ts`) creates the self-signed certificate in `apps/server/certs/` on its own (`src/tls/certificate.ts`); it only falls back to HTTP, with a warning, if the certificate cannot be created.
- Runtime data and generated output are separated from source logic: local runtime DBs and built `dist/` output should not be treated as the primary implementation surface unless the task explicitly targets them.

## Working expectations

- Prefer surgical, app-aware changes that respect the server-plus-tablet split rather than introducing a new persistence or routing layer.
- Keep teacher and student flows consistent with the existing route structure and auth model.
- If a task spans both apps, update both the client contract and the server API contract together.
- Preserve the current local classroom assumptions: the app is designed to run on tablets connected to the server PC and to expose local network addresses.

## Repository-specific notes

- The project is for a classroom reading and phonics training tool aimed at CP/CE1 learners, with adaptive activities and teacher-managed sessions.
- The README describes rhythmic, phonological, graphophonological, and reading-comprehension exercises, so keep pedagogical flows and session logic aligned with those existing game types when editing the student experience.
- Relevant local class setup is handled by `src/tls/certificate.ts` (`pnpm cert` forces regeneration) and the startup logs in `apps/server/src/index.ts`; do not remove those assumptions unless the task explicitly changes the deployment model.
