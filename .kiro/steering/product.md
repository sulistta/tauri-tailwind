# Product Overview

WhatsApp Automation is a desktop application for managing WhatsApp groups and automating operations. Built with Tauri for cross-platform support (Windows, macOS, Linux).

## Core Features

- **WhatsApp Connection**: Connect to WhatsApp Web via QR code authentication with session persistence
- **Group Management**: Extract group information and member lists
- **Bulk Operations**: Add multiple users to groups efficiently
- **Custom Automations**: Create and execute automated WhatsApp workflows
- **Session Management**: Persistent sessions across app restarts
- **Logging**: Comprehensive activity logging for debugging and monitoring

## Target Platforms

- Windows (MSI installer)
- macOS (DMG)
- Linux (AppImage)

## Key Technologies

- Frontend: React + TypeScript + Vite
- Backend: Rust + Tauri
- WhatsApp Integration: Node.js client (whatsapp-web.js via Puppeteer)
- UI: Shadcn UI + Tailwind CSS
