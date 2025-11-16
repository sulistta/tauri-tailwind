# Project Structure

## Architecture Pattern

Based on [bulletproof-react](https://github.com/alan2207/bulletproof-react) feature-based architecture.

## Directory Layout

```
src/
├── app/              # Application layer (routes, providers, global config)
├── components/       # Shared UI components (pure, reusable)
├── config/           # Global configuration and env variables
├── contexts/         # React context providers
├── features/         # Feature-based modules (see below)
├── hooks/            # Shared custom hooks
├── lib/              # Preconfigured libraries and utilities
├── pages/            # Page components (route handlers)
├── types/            # Shared TypeScript types
└── main.tsx          # Application entry point

src-tauri/
├── src/              # Rust backend code
├── whatsapp-node/    # Node.js WhatsApp client (subprocess)
├── capabilities/     # Tauri permission definitions
├── icons/            # Application icons
└── tauri.conf.json   # Tauri configuration
```

## Feature Module Structure

Each feature in `src/features/` follows this pattern:

```
features/awesome-feature/
├── api/          # API calls and hooks for this feature
├── assets/       # Feature-specific assets
├── components/   # Feature-scoped components
├── hooks/        # Feature-scoped hooks
├── types/        # Feature-specific types
└── utils/        # Feature-specific utilities
```

## Component Organization

- **src/components/**: Pure UI components (buttons, inputs, layouts) - no business logic
- **src/features/\*/components/**: Feature-specific components with business logic
- **src/pages/**: Minimal page components that compose features and shared components

## Key Conventions

1. **Route Logic**: Keep routes in `src/app/` or `src/pages/` minimal - delegate to features
2. **Feature Composition**: Pages use features to build functionality
3. **Pure Components**: Shared components in `src/components/` should be pure UI (like shadcn/ui)
4. **Scoping**: Keep feature-specific code within feature directories
5. **Imports**: Use `@/` path alias for all imports from `src/`

## Tauri Backend

- **Commands**: Rust functions exposed to frontend via `#[tauri::command]`
- **Events**: Bidirectional communication between Rust and frontend
- **Plugins**: Tauri plugins for shell, dialog, fs, process access
- **WhatsApp Integration**: Node.js subprocess managed by Rust backend

## Configuration Files

- `components.json`: shadcn/ui component configuration
- `tsconfig.json`: TypeScript with strict mode, path aliases
- `vite.config.ts`: Vite with Tauri-specific settings
- `eslint.config.js`: ESLint 9 flat config
- `prettier.config.js`: 4 spaces, single quotes, no semicolons
