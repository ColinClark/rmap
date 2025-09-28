# Repository Guidelines

## Project Structure & Module Organization (Monorepo)
- **Main App** (Vite + React + TS): `apps/web/src/` (components, pages, lib, services, contexts, layouts, styles, workflows).
- **Admin Portal** (Vite + React + TS): `apps/admin/src/` (admin-specific components and pages).
- **API Server** (Hono + TS): `server/src/` (routes, middleware, types). Entrypoint: `server/src/index.ts`.
- **Shared Packages**: `packages/types/` (shared TypeScript types), `packages/ui/` (shared components).
- **Docs**: `docs/` (Architecture, API, Deployment, Developer Setup).
- **Config**: Root `turbo.json`, individual `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`.

## Build, Test, and Development Commands (Monorepo)
- **All services**: `npm run dev` (starts web, admin, and server).
- **Web app**: `npm run dev:web` (http://localhost:3000).
- **Admin portal**: `npm run dev:admin` (http://localhost:3001).
- **Server**: `cd server && npm run dev` (Hono server on port 4000).
- **Build all**: `npm run build` (builds all apps and packages).
- **Type-check**: `npm run typecheck` (checks all packages).

## Coding Style & Naming Conventions
- TypeScript, ES modules, 2-space indentation.
- React components: PascalCase files in `src/components` (e.g., `UserCard.tsx`).
- Hooks: `useX` naming (e.g., `useAudience.ts`). Utility modules: lower-kebab or camelCase (`lib/formatters.ts`).
- Styling: Tailwind CSS utility-first classes in `.tsx` and `src/index.css`.
- Avoid default exports for shared components/utilities; prefer named exports.

## Testing Guidelines
- No test runner is configured yet. If adding tests:
  - Unit tests: Vitest under `src/__tests__` with `*.test.ts(x)`.
  - API tests: supertest against `server` routes.
  - Keep tests deterministic; mock network/IO.

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (feat, fix, chore, docs, refactor, test). Example: `feat(audience): add segment builder UI`.
- PRs: clear summary, linked issue(s), screenshots for UI, API changes noted (endpoints, payloads), deployment notes if needed.
- Keep PRs focused and under ~300 lines where practical; update relevant docs in `docs/`.

## Security & Configuration Tips
- **Environment**: Use `.env` files (never commit secrets). Required: `MONGODB_URI`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `STATISTA_API_KEY`.
- **Database**: MongoDB Atlas with tenant isolation via document filtering.
- **Validation**: Use Zod on server routes; handle errors via centralized `app.onError`.
- **Multi-tenancy**: All API routes require tenant context via middleware.
