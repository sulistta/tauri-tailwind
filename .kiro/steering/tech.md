# Tech Stack

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with Shadcn UI components
- **State Management**: React Context API (WhatsAppContext)
- **UI Components**: Radix UI primitives + Lucide icons
- **Validation**: Zod schemas
- **Error Handling**: react-error-boundary
- **Theming**: next-themes for dark/light mode

## Backend

- **Framework**: Tauri 2 (Rust)
- **Runtime**: Tokio async runtime
- **Serialization**: serde + serde_json
- **WhatsApp Client**: Node.js subprocess (whatsapp-web.js)
- **Plugins**: shell, process, dialog, fs

## Development Tools

- **Package Manager**: Bun (preferred) or npm/pnpm
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier (4 spaces, single quotes, no semicolons)
- **Git Hooks**: Husky + lint-staged (auto-format on commit)
- **TypeScript**: Strict mode enabled

## Common Commands

### Development

```bash
bun install              # Install dependencies
bun dev                  # Start Vite dev server only
bun tauri dev            # Start full Tauri app with hot reload
```

### Building

```bash
bun build                # Build frontend only
bun tauri build          # Build production app for current platform
bun tauri build --debug  # Build with debug symbols
```

### Code Quality

```bash
bun lint                 # Run ESLint
bun format               # Format code with Prettier
```

### Pre-build

```bash
node scripts/pre-build.js  # Runs automatically before tauri build
```

## Configuration Files

- `vite.config.ts` - Vite bundler config (port 1420, WASM support)
- `tsconfig.json` - TypeScript config (strict mode, path aliases)
- `eslint.config.js` - ESLint flat config
- `prettier.config.js` - Code formatting rules
- `components.json` - Shadcn UI component config
- `src-tauri/tauri.conf.json` - Tauri app configuration
- `src-tauri/Cargo.toml` - Rust dependencies

## Path Aliases

- `@/*` maps to `./src/*` for cleaner imports
