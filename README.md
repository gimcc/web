# Matrix Web

Browser-based chat client built on the [Matrix](https://matrix.org/) protocol.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5000
```

External access: https://gim.apfu.w.ee/

## Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | React 19.2 |
| Matrix SDK | matrix-js-sdk 41.1 |
| Build | Vite 8 |
| Language | TypeScript 5.9 strict |
| Package Manager | pnpm workspaces |
| Router | React Router 7 (hash / history) |
| Client State | Zustand 5.0 |
| Server State | TanStack Query 5.90 |
| UI Components | shadcn/ui (Base UI) |
| CSS | Tailwind CSS 4.2 |
| Virtual Scroll | TanStack Virtual 3.13 |
| Testing | Vitest 4.1 + Playwright 1.58 + MSW 2.12 |
| E2EE | matrix-sdk-crypto-wasm (Rust/WASM) |

## Monorepo Structure

```
matrix-web/
├── apps/
│   └── web/                  # Main React chat client
├── packages/
│   ├── ui/                   # shadcn/ui custom components
│   ├── matrix-client/        # matrix-js-sdk wrapper & state
│   ├── types/                # Shared TypeScript types
│   └── config/               # Base configs (tsconfig, eslint, etc.)
└── docs/                     # Documentation
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System overview, data flow, module responsibilities |
| [Implementation Plan (PLAN-001)](docs/plan/PLAN-001.md) | Full technical plan (15 chapters) |
| [Task List](docs/task/index.md) | All tasks by implementation stage |
| [Changelog](docs/changelog.md) | Decision and progress log |

### Module Docs

| Module | Doc |
|--------|-----|
| `apps/web` | [docs/modules/web.md](docs/modules/web.md) |
| `packages/ui` | [docs/modules/ui.md](docs/modules/ui.md) |
| `packages/matrix-client` | [docs/modules/matrix-client.md](docs/modules/matrix-client.md) |
| `packages/types` | [docs/modules/types.md](docs/modules/types.md) |
| `packages/config` | [docs/modules/config.md](docs/modules/config.md) |

## Implementation Stages

| Stage | Content |
|-------|---------|
| 1 | Monorepo scaffold, dev tooling, mock system, Storybook |
| 2 | Authentication, Matrix client connection |
| 3 | Room list, timeline, messaging (text, media, commands) |
| 4 | E2EE setup, key management UI |
| 4.5 | Lock screen, local DB encryption, duress password |
| 5 | Reactions, threads, voice messages, typing indicators |
| 6 | PWA, offline support, push notifications |

## License

Private
