# Repository Guidelines

## Project Structure & Module Organization
- App (Vite + React + TS): `src/` (components, pages, lib, services, contexts, layouts, styles, workflows).
- API server (Hono + TS): `server/src/` (routes, middleware, types). Entrypoint: `server/src/index.ts`.
- Docs: `docs/` (Architecture, API, Deployment, Developer Setup). Static entry: `index.html`.
- Config: `vite.config.ts`, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`.

## Build, Test, and Development Commands
- Frontend dev: `npm run dev` (serves on Vite, e.g., http://localhost:5173).
- Frontend build: `npm run build` (outputs to `dist/`).
- Server dev: `cd server && npm run dev` (Hono server on `PORT` env, defaults 4000).
- Server build/start: `cd server && npm run build && npm start`.
- Type-check: `cd server && npm run typecheck` or `npx tsc --noEmit` at repo root.

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
- Environment: do not commit secrets. Use `.env` files (ignored). Server CORS/ports configured in `server/src/index.ts`.
- Validate inputs (Zod) on server routes; handle errors via centralized `app.onError`.
