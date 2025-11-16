# Project Structure

## Architecture Pattern

Based on bulletproof-react by @alan2207 - feature-based organization with clear separation of concerns.

## Frontend Structure (`src/`)

```
src/
├── app/                    # Application layer
│   ├── routes/            # Route definitions
│   ├── index.tsx          # Main app component
│   └── provider.tsx       # Global providers wrapper
├── components/            # Shared UI components
│   ├── ui/               # Shadcn UI primitives (auto-generated)
│   ├── layout/           # Layout components
│   └── whatsapp/         # WhatsApp-specific components
├── features/             # Feature-based modules (self-contained)
├── pages/                # Page components
├── hooks/                # Custom React hooks
├── contexts/             # React contexts for state management
├── lib/                  # Reusable libraries and utilities
├── types/                # TypeScript type definitions
└── main.tsx              # Entry point
```

## Backend Structure (`src-tauri/`)

```
src-tauri/
├── src/                  # Rust source code
│   ├── main.rs          # Entry point with Tauri setup
│   ├── commands.rs      # Tauri command handlers (frontend API)
│   ├── whatsapp/        # WhatsApp client management
│   ├── automation/      # Automation logic
│   ├── logging/         # Logging system
│   └── connection/      # Connection state management
├── whatsapp-node/       # Node.js WhatsApp client (Baileys)
│   ├── index.js         # Main Baileys client implementation
│   ├── operations/      # WhatsApp operation handlers
│   │   ├── getGroups.js
│   │   ├── extractMembers.js
│   │   └── addToGroup.js
│   ├── auth_info/       # Session storage (auto-generated, gitignored)
│   └── package.json     # Node dependencies
├── capabilities/        # Tauri security capabilities
├── icons/              # Application icons
├── target/             # Rust build output (gitignored)
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

## Key Conventions

- **Feature modules**: Self-contained with components, hooks, and types
- **Shadcn UI**: Components in `src/components/ui/` are auto-generated, modify with care
- **Path aliases**: Use `@/` prefix for imports from `src/`
- **Tauri commands**: Defined in Rust (`commands.rs`), invoked from frontend via `@tauri-apps/api`
- **WhatsApp operations**: Modular Node.js handlers in `src-tauri/whatsapp-node/operations/`
- **Session data**: Stored in `src-tauri/whatsapp-node/auth_info/` (never commit)

## Communication Flow

1. Frontend (React) → Tauri commands (Rust) → Node.js subprocess (Baileys)
2. Node.js events → Tauri event system → Frontend listeners
3. State management via ConnectionManager (Rust) and React Context (Frontend)

## Configuration Files

- `vite.config.ts`: Vite configuration with Tauri integration
- `tauri.conf.json`: Tauri app configuration
- `tsconfig.json`: TypeScript configuration with path aliases
- `eslint.config.js`: ESLint flat config
- `prettier.config.js`: Prettier formatting rules
- `components.json`: Shadcn UI configuration
