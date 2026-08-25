# asol

Next.js application with a shared theme system and Arabic/English i18n.

## Quick start

```bash
npm install
npm run dev
```

The development server listens on http://localhost:3001

## Commands

| Command | Description |
|--------|--------|
| `npm run dev` | Development server |
| `npm run build` | Web correctness gate + `.next` |
| `npm run build:static` | Static export (`out/`) for Capacitor/OTA |
| `npm run typecheck` | Type check |
| `npm run server:stop` | Stop the process on port 3001 |

Canonical command list: [docs/07-mobile-and-release/scripts-and-workflows.md](./docs/07-mobile-and-release/scripts-and-workflows.md)

## Documentation

Project documentation lives under [`docs/`](./docs/README.md) and is English-only.

- [i18n](./docs/05-platform-features/i18n-system.md)
- [Theme](./docs/04-ui-components/theme-system.md)
- [GitHub CI policy](./docs/07-mobile-and-release/github-ci-policy.md)
