# WhatsApp Automation

A powerful desktop application for managing WhatsApp groups and automating operations. Built with Tauri for cross-platform support (Windows, macOS, Linux).

![Demo Screenshot](./assets/demo.png)

## Features

- **WhatsApp Connection**: Connect to WhatsApp using QR code authentication with persistent sessions
- **Group Management**: Extract group information and member lists efficiently
- **Bulk Operations**: Add multiple users to groups with configurable delays
- **Session Persistence**: Automatic session restoration across app restarts
- **Multi-Device Support**: Works alongside other WhatsApp devices without disconnecting them
- **Lightweight & Fast**: Uses Baileys for direct WhatsApp protocol connection (no browser required)
- **Error Recovery**: Automatic reconnection with exponential backoff
- **Activity Logging**: Comprehensive logging for debugging and monitoring

## Technology Stack

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 with Shadcn UI components
- **State Management**: React Context API
- **UI Components**: Radix UI primitives + Lucide icons

### Backend

- **Framework**: Tauri 2 (Rust)
- **Runtime**: Tokio async runtime
- **WhatsApp Client**: Baileys (@whiskeysockets/baileys) via Node.js subprocess
- **Plugins**: shell, process, dialog, fs

### WhatsApp Integration

- **Library**: [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - Direct WebSocket connection to WhatsApp
- **Authentication**: Multi-file auth state with automatic credential management
- **Session Storage**: Secure local storage in `auth_info` directory
- **Performance**: ~50-100MB memory usage (vs ~300-500MB with browser-based solutions)

## Architecture

The architecture is based on practices suggested by [@alan2207](https://github.com/alan2207) in his [bulletproof-react](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md).

In addition, this project configures [ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [Husky](https://typicode.github.io/husky/) and [Lint-staged](https://github.com/lint-staged/lint-staged) for pre-commits.

## Getting Started

### Prerequisites

1. **Tauri Prerequisites**: Ensure you have the [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) installed
2. **Node.js**: Version 18 or higher (required for Baileys)
3. **Bun**: Recommended package manager (or use npm/pnpm)
4. **Rust**: Version 1.70+ (for Tauri)

### Installation

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd whatsapp-automation
    ```

2. **Install dependencies**

    ```bash
    bun install
    ```

3. **Install Node.js dependencies for WhatsApp client**
    ```bash
    cd src-tauri/whatsapp-node
    bun install
    cd ../..
    ```

### Development

**Start the development server:**

```bash
bun tauri dev
```

This will:

- Start the Vite dev server for the frontend
- Build and run the Tauri application
- Launch the WhatsApp Node.js client

**Frontend only (for UI development):**

```bash
bun dev
```

### Building for Production

**Build for your current platform:**

```bash
bun tauri build
```

**Build with debug symbols:**

```bash
bun tauri build --debug
```

The built application will be in `src-tauri/target/release/bundle/`

### First-Time Setup

1. **Launch the application**
2. **Connect to WhatsApp**:
    - Click "Connect" on the welcome screen
    - A QR code will be displayed
    - Open WhatsApp on your phone
    - Go to Settings → Linked Devices → Link a Device
    - Scan the QR code
3. **Session Persistence**: Your session will be saved automatically. On subsequent launches, you'll be connected automatically without scanning a QR code.

### Session Management

- **Session Storage**: Authentication credentials are stored in `src-tauri/whatsapp-node/auth_info/`
- **Session Files**:
    - `creds.json` - Authentication credentials
    - `app-state-sync-key-*.json` - Multi-device sync keys
- **Logout**: Use the logout button in the app to clear your session
- **Manual Session Reset**: Delete the `auth_info` directory to force re-authentication

## Project Structure

### Frontend (`src/`)

```
src/
├── app/                    # Application layer
│   ├── routes/            # Route definitions
│   ├── index.tsx          # Main app component
│   └── provider.tsx       # Global providers wrapper
├── components/            # Shared UI components
│   ├── ui/               # Shadcn UI primitives
│   ├── layout/           # Layout components
│   └── whatsapp/         # WhatsApp-specific components
├── features/             # Feature-based modules
├── pages/                # Page components
├── hooks/                # Custom React hooks
├── contexts/             # React contexts
├── lib/                  # Reusable libraries
└── types/                # TypeScript types
```

### Backend (`src-tauri/`)

```
src-tauri/
├── src/                  # Rust source code
│   ├── main.rs          # Entry point
│   ├── commands.rs      # Tauri command handlers
│   └── connection/      # Connection management
├── whatsapp-node/       # Node.js WhatsApp client
│   ├── index.js         # Baileys client implementation
│   ├── operations/      # WhatsApp operations
│   │   ├── getGroups.js
│   │   ├── extractMembers.js
│   │   └── addToGroup.js
│   ├── auth_info/       # Session storage (auto-generated)
│   └── package.json     # Node dependencies
├── capabilities/        # Tauri security capabilities
├── icons/              # App icons
└── tauri.conf.json     # Tauri configuration
```

## Development Tools

### Code Quality

- **ESLint 9**: Flat config for consistent code style
- **Prettier**: Automatic code formatting (4 spaces, single quotes)
- **Husky + Lint-staged**: Pre-commit hooks for auto-formatting

### Commands

```bash
bun lint                 # Run ESLint
bun format               # Format code with Prettier
bun tauri dev            # Start development server
bun tauri build          # Build production app
```

## Performance

Baileys provides significant performance improvements over browser-based solutions:

| Metric       | Browser-Based            | Baileys                  | Improvement           |
| ------------ | ------------------------ | ------------------------ | --------------------- |
| Memory Usage | ~300-500 MB              | ~50-100 MB               | 70-80% reduction      |
| Startup Time | 10-15 seconds            | 2-5 seconds              | 60-75% faster         |
| CPU Usage    | High (browser rendering) | Minimal (WebSocket only) | Significant reduction |
| Dependencies | Chrome/Chromium required | None                     | No browser needed     |

## Migration from whatsapp-web.js

If you're upgrading from a previous version that used whatsapp-web.js:

1. **Session Format Changed**: The old `session/` directory is no longer used
2. **New Session Location**: Sessions are now stored in `auth_info/`
3. **Re-authentication Required**: You'll need to scan a QR code once after upgrading
4. **No Browser Dependency**: Chrome/Chromium is no longer required
5. **Better Performance**: Expect faster startup and lower memory usage

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions.

## Troubleshooting

### QR Code Not Appearing

- Check that the Node.js process is running
- Verify `src-tauri/whatsapp-node/node_modules` exists
- Check console for error messages

### Connection Fails

- Ensure you have a stable internet connection
- Verify WhatsApp Web is not blocked by your firewall
- Try restarting the application

### Session Issues

- Delete the `auth_info` directory and re-authenticate
- Ensure you have write permissions in the application directory
- Check that no other WhatsApp Web clients are using the same session

### Build Issues

- Ensure all prerequisites are installed
- Run `bun install` in both root and `src-tauri/whatsapp-node`
- Check that Node.js version is 18 or higher

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Architecture based on [bulletproof-react](https://github.com/alan2207/bulletproof-react) by [@alan2207](https://github.com/alan2207)
- WhatsApp integration powered by [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
- Built with [Tauri](https://tauri.app), [React](https://reactjs.org), and [Shadcn UI](https://ui.shadcn.com)

## Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Check existing documentation in the `docs/` folder
- Review the [MANUAL_TESTING_GUIDE.md](MANUAL_TESTING_GUIDE.md) for testing procedures
