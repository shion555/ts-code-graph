# Repository Guidelines

## Project Structure & Module Organization
- Source files live in `src/`, with `src/cli.ts` exposing the CLI entrypoint, analyzers under `src/parser/`, persistence helpers in `src/db/`, and shared helpers inside `src/utils/` and `src/types.ts`.
- Tests mirror the source layout inside `test/` (for example, parser specs sit in `test/parse/`); fixtures used by Vitest stay under `test/fixtures/`.
- Build artifacts are emitted to `dist/` by `tsc -p tsconfig.build.json`, while coverage snapshots land in `coverage/`; keep these folders out of manual edits.

## Build, Test, and Development Commands
- `npm run dev` starts the CLI with `tsx` for local iteration against sample projects.
- `npm run build` compiles TypeScript to ESM JavaScript in `dist/`, the same bundle published to npm.
- `npm test` runs the Vitest suite once; pair it with `npm run test:coverage` in CI to refresh coverage data.
- `npm run lint`, `npm run lint:fix`, `npm run format`, and `npm run format:check` wrap ESLint and Prettier over `src/` and `test/`.
- `npm run mcp` bootstraps the MCP server defined in `src/mcp/server.ts` for tool integrations.

## Coding Style & Naming Conventions
- TypeScript sources use ES modules, `strict` typing, and Prettier defaults (2-space indent, single quotes, trailing commas where valid). Run `npm run format` before committing.
- ESLint (config in `eslint.config.js`) enforces import ordering, unused symbol checks, and `typescript-eslint` best practices—treat warnings as errors.
- Prefer descriptive camelCase for functions/variables and PascalCase for types, classes, and exported analyzers (e.g., `CallGraphBuilder` in `src/parser/core`).
- CLI commands and file names should be kebab-case (`ts-code-graph`, `call-graph.ts`) to match existing artifacts.

## Testing Guidelines
- Write Vitest specs with `.test.ts` suffix and colocate them under `test/<area>/` to shadow the related source path.
- Use descriptive `describe` blocks such as `describe('parser/buildNodeIndex', ...)` so failure output immediately indicates scope.
- When touching database or CLI flows, include regression fixtures under `test/fixtures/` to assert expected SQLite rows or CLI JSON output.
- Pull requests should show a clean `npm run test` report locally; add `npm run test:coverage` when altering parser logic to keep call graph calculations guarded.

## Commit & Pull Request Guidelines
- Commitlint enforces Conventional Commits (see `commitlint.config.js`); follow patterns like `feat: add symbol resolver` or `fix: handle re-export loop`. Avoid capitalized scopes and keep subjects under ~70 chars.
- Each PR should include: purpose summary, testing notes (`npm test`, `npm run lint`), linked issue numbers (e.g., `Closes #45`), and screenshots or sample JSON when the CLI output format changes.
- Rebase onto the latest `main`, ensure `dist/` is regenerated only for release branches, and request reviews for parser, DB, and CLI changes from subject-matter maintainers.

## Communication
Please use Japanese exclusively when communicating with me.

## Most Important Points
- This project aims to keep additions and changes as simple and minimal as possible.
- Always adhere to the DRY principle and SOLID principles.
