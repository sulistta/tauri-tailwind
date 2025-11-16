# Tech Stack

## Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **State Management**: React Context API
- **UI Components**: Radix UI primitives, Lucide icons
- **Notifications**: Sonner (toast notifications)
- **Validation**: Zod schemas

## Backend

- **Framework**: Tauri 2 (Rust)
- **Runtime**: Tokio async runtime
- **WhatsApp Integration**: Node.js subprocess with whatsapp-web.js
- **Serialization**: Serde for JSON handling

## Development Tools

- **Package Manager**: Bun (preferred) or npm/pnpm
- **Linting**: ESLint 9 with flat config
- **Formatting**: Prettier (4 spaces, single quotes, no semicolons)
- **Git Hooks**: Husky + lint-staged for pre-commit checks
- **TypeScript**: Strict mode enabled

## Common Commands

```bash
# Development
bun install              # Install dependencies
bun dev                  # Start Vite dev server only
bun tauri dev            # Start full Tauri app with hot reload

# Building
bun build                # Build frontend only
bun tauri build          # Build production app for current platform
bun tauri build --debug  # Build with debug symbols

# Code Quality
bun lint                 # Run ESLint
bun format               # Format code with Prettier

# WhatsApp Node Setup
cd src-tauri/whatsapp-node
npm install              # Install WhatsApp client dependencies
```

## Build Requirements

- Node.js 18+ (required for whatsapp-web.js at runtime)
- Rust 1.70+
- Platform-specific: Visual Studio Build Tools (Windows), Xcode CLI (macOS), webkit2gtk (Linux)

## Path Aliases

Use `@/` for imports from `src/` directory:

```typescript
import { Component } from '@/components/Component'
import { useHook } from '@/hooks/useHook'
```

## Vite Configuration

- Fixed port: 1420 (required by Tauri)
- WASM support enabled
- Top-level await enabled
- Worker format: ES modules
