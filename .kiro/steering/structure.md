# Project Structure

## Architecture Pattern

Based on [bulletproof-react](https://github.com/alan2207/bulletproof-react) feature-based architecture.

## Frontend Structure (`src/`)

```
src/
├── app/                    # Application layer
│   ├── routes/            # Route definitions
│   ├── index.tsx          # Main app component
│   ├── provider.tsx       # Global providers wrapper
│   └── global.css         # Global styles
│
├── components/            # Shared UI components
│   ├── ui/               # Shadcn UI primitives (Button, Dialog, etc.)
│   ├── layout/           # Layout components (Header, Sidebar, etc.)
│   ├── shared/           # Reusable components across features
│   ├── whatsapp/         # WhatsApp-specific components
│   ├── automation/       # Automation-specific components
│   ├── AppShell.tsx      # Main app shell
│   └── AuthenticatedApp.tsx  # Authenticated app wrapper
│
├── features/             # Feature-based modules
│   ├── [feature-name]/
│   │   ├── api/         # API calls for this feature
│   │   ├── components/  # Feature-specific components
│   │   ├── hooks/       # Feature-specific hooks
│   │   ├── types/       # Feature-specific types
│   │   └── utils/       # Feature-specific utilities
│   ├── navigation/      # Navigation feature
│   ├── errors/          # Error handling feature
│   └── built-with/      # About/credits feature
│
├── pages/                # Page components (route targets)
│   ├── Connect.tsx      # WhatsApp connection page
│   ├── Dashboard.tsx    # Main dashboard
│   ├── ExtractUsers.tsx # User extraction page
│   ├── AddToGroup.tsx   # Bulk add page
│   ├── Automations.tsx  # Automation management
│   ├── Logs.tsx         # Activity logs
│   └── Settings.tsx     # App settings
│
├── hooks/                # Shared custom hooks
│   ├── useWhatsApp.ts   # WhatsApp connection hook
│   ├── useGroups.ts     # Group management hook
│   ├── useAutomations.ts # Automation hook
│   ├── useLogs.ts       # Logging hook
│   ├── useSettings.ts   # Settings hook
│   └── useConnectionRecovery.ts # Connection recovery
│
├── contexts/             # React contexts
│   └── WhatsAppContext.tsx  # Global WhatsApp state
│
├── lib/                  # Reusable libraries
│   ├── utils/           # Utility functions
│   ├── error-handler.ts # Error handling utilities
│   └── ERROR_HANDLING.md # Error handling docs
│
├── types/                # Shared TypeScript types
│   ├── whatsapp.ts      # WhatsApp-related types
│   ├── automation.ts    # Automation types
│   └── navigation.ts    # Navigation types
│
├── config/               # Configuration
│   └── env.ts           # Environment variables
│
└── main.tsx             # App entry point
```

## Backend Structure (`src-tauri/`)

```
src-tauri/
├── src/
│   ├── main.rs          # Entry point, command registration
│   ├── lib.rs           # Library root
│   ├── commands.rs      # Tauri command handlers
│   ├── connection/      # Connection management module
│   ├── logging/         # Logging module
│   └── [other modules]
│
├── whatsapp-node/       # Node.js WhatsApp client
│   ├── index.js         # Node.js entry point
│   ├── package.json     # Node dependencies
│   └── node_modules/    # Node dependencies (bundled)
│
├── capabilities/        # Tauri security capabilities
├── icons/              # App icons for all platforms
├── gen/                # Generated Tauri files
├── target/             # Rust build output
├── Cargo.toml          # Rust dependencies
├── tauri.conf.json     # Tauri configuration
└── build.rs            # Build script
```

## Key Conventions

### Component Organization

- **Pages**: Minimal logic, compose features and components
- **Features**: Self-contained modules with their own components, hooks, types
- **Components**: Pure UI components, reusable across features
- **Hooks**: Encapsulate business logic and state management

### Import Patterns

- Use `@/` alias for imports from `src/`
- Example: `import { Button } from '@/components/ui/button'`

### File Naming

- Components: PascalCase (e.g., `Dashboard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useWhatsApp.ts`)
- Types: camelCase (e.g., `whatsapp.ts`)
- Utilities: kebab-case (e.g., `error-handler.ts`)

### Feature Structure

Each feature should be self-contained:

- Keep feature-specific code within the feature folder
- Export public API from feature index
- Share common code via `src/components` or `src/hooks`

### Rust Module Organization

- Each module in its own folder with `mod.rs`
- Public API exposed through module exports
- Commands registered in `main.rs`
