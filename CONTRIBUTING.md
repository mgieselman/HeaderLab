# Contributing to HeaderLab

Thanks for your interest in contributing! HeaderLab is a TypeScript email header analyzer that runs as a standalone web app and as a Microsoft Outlook add-in.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Create a feature branch:
   ```bash
   git checkout -b my-feature
   ```

## Development Workflow

### Run the dev server
```bash
npm run dev      # http://localhost:44336
```

### Run tests
```bash
npm test                  # lint + all tests
npm run test:watch        # Vitest in watch mode
npx vitest run src/Scripts/path/to/file.test.ts  # single file
```

### Type-check
```bash
npx tsc --noEmit
```

### Lint
```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
```

### Production build
```bash
npm run build       # output to Pages/
npm run size        # verify bundle size budgets
```

## Before Submitting a PR

- All tests pass (`npm test`)
- TypeScript compiles with no errors (`npx tsc --noEmit`)
- Lint passes (`npm run lint`)
- Bundle size budgets pass (`npm run size`)
- New code has corresponding tests in a colocated `*.test.ts` file

## Pull Request Process

1. Open a PR against `main`
2. CI will run lint, type-check, tests, build, and size checks automatically
3. All checks must pass
4. Squash merge is preferred for clean history

## What Makes a Good PR

- **Small and focused** — one feature or fix per PR
- **Tested** — new code has tests, edge cases covered
- **Documented** — update README if adding configuration options or changing behavior
- **No secrets** — never commit API keys, client IDs, or connection strings

## Code Style

- 4-space indentation, double quotes, semicolons
- Windows line endings (CRLF) — enforced by ESLint
- camelCase for variables/methods, PascalCase for types/classes/enums
- One class per file
- Strict TypeScript — no `any`, all strict checks enabled
- Import order: builtins → external → internal → sibling/parent (enforced by ESLint)

## Reporting Issues

- Use GitHub Issues
- Include: what you expected, what happened, steps to reproduce
- For parsing issues, include a sanitized sample header if possible

## Reporting Security Vulnerabilities

See [SECURITY.md](SECURITY.md) — please do not open a public issue for security vulnerabilities.
