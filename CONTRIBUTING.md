# Contributing to FinOpenPOS

Thanks for your interest in contributing! This guide explains how to get involved.

## Environment Setup

```bash
git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS
cd FinOpenPOS
bun install
bun dev
```

PGlite runs in-process inside Bun — no need to install PostgreSQL for development.

## Monorepo Structure

```
apps/
  web/         → Main Next.js application (POS)
  docs/        → Documentation site (Fumadocs)
packages/
  fiscal/      → Fiscal engine (NF-e/NFC-e)
  ui/          → Shared UI components
  db/          → Database schema (Drizzle + PGlite/Supabase)
```

## Contribution Flow

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feat/my-feature`
3. **Make your changes**
4. **Run tests**: `bun test`
5. **Commit** using [conventional commits](https://www.conventionalcommits.org/)
6. **Push** and open a **Pull Request**

## Conventional Commits

| Type | Description |
|------|-------------|
| `feat(scope)` | New feature |
| `fix(scope)` | Bug fix |
| `docs(scope)` | Documentation |
| `style(scope)` | Formatting |
| `refactor(scope)` | Refactoring |
| `test(scope)` | Tests |
| `chore(scope)` | Maintenance |

## Questions?

Open an [issue](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/issues) or start a [discussion](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/discussions).
