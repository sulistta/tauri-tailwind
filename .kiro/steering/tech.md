# Technology Stack

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with Shadcn UI components
- **State Management**: React Context API
- **UI Components**: Radix UI primitives + Lucide icons
- **Path Aliases**: `@/*` maps to `./src/*`

## Backend

- **Framework**: Tauri 2 (Rust)
- **Runtime**: Tokio async runtime
- **Plugins**: shell, process, dialog, fs
- **Edition**: Rust 2021

## WhatsApp Integration

- **Library**: @whiskeysockets/baileys (Node.js subprocess)
- **Authentication**: Multi-file auth state in `src-tauri/whatsapp-node/auth_info/`
- **Module System**: CommonJS (Node.js client)
- **Operations**: Modular handlers in `src-tauri/whatsapp-node/operations/`

## Code Quality Tools

- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier (4 spaces, single quotes, no semicolons, no trailing commas)
- **Pre-commit**: Husky + lint-staged (auto-format on commit)

## Common Commands

```bash
# Development
bun tauri dev              # Start full dev environment (frontend + Tauri + WhatsApp client)
bun dev                    # Frontend only (UI development)

# Building
bun tauri build            # Production build for current platform
bun tauri build --debug    # Build with debug symbols

# Code Quality
bun lint                   # Run ESLint
bun format                 # Format code with Prettier

# Dependencies
bun install                # Install frontend dependencies
cd src-tauri/whatsapp-node && bun install  # Install WhatsApp client dependencies
```

## Prerequisites

- Node.js 18+
- Bun (recommended) or npm/pnpm
- Rust 1.70+
- Tauri prerequisites (platform-specific)

## Build Output

Production builds are located in `src-tauri/target/release/bundle/`
