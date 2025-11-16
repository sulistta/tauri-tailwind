# Build Instructions - WhatsApp Automation

This document provides instructions for building the WhatsApp Automation application for production.

## Prerequisites

### All Platforms

- Node.js 18+ (required for whatsapp-web.js)
- Bun (package manager)
- Rust 1.70+ (for Tauri)

### Platform-Specific Requirements

#### Windows

- Visual Studio Build Tools 2019 or later
- WiX Toolset v3.11+ (for MSI installer)

#### macOS

- Xcode Command Line Tools
- macOS 10.13+ for building

#### Linux

- Dependencies for AppImage:
    ```bash
    sudo apt-get update
    sudo apt-get install -y libwebkit2gtk-4.1-dev \
      build-essential \
      curl \
      wget \
      file \
      libssl-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev
    ```

## Build Process

### 1. Install Dependencies

```bash
# Install frontend dependencies
bun install

# Install whatsapp-node dependencies
cd src-tauri/whatsapp-node
npm install
cd ../..
```

### 2. Build for Production

```bash
# Build for current platform
bun tauri build

# Build with debug symbols (for troubleshooting)
bun tauri build --debug
```

### 3. Build Output Locations

#### Windows (MSI)

- `src-tauri/target/release/bundle/msi/WhatsApp Automation_1.0.0_x64_en-US.msi`

#### macOS (DMG)

- `src-tauri/target/release/bundle/dmg/WhatsApp Automation_1.0.0_x64.dmg`

#### Linux (AppImage)

- `src-tauri/target/release/bundle/appimage/whatsapp-automation_1.0.0_amd64.AppImage`

## Configuration Details

### Bundle Resources

The following resources are bundled with the application:

- `whatsapp-node/` - Node.js WhatsApp client and dependencies
- Application icons for all platforms
- Frontend assets (compiled React app)

### File System Permissions

The application has access to:

- `$APPDATA/whatsapp-automation/` - For session storage and logs
- `$RESOURCE/whatsapp-node/` - For Node.js client files

### Content Security Policy

The CSP allows:

- Self-hosted resources
- Data URIs for images (QR codes)
- Blob URLs for file downloads
- HTTPS and WSS connections (for WhatsApp Web)
- Inline styles (for dynamic UI)
- WASM execution (for performance-critical operations)

## Testing the Build

### Before Release

1. **Test Installation**
    - Install the built package on a clean system
    - Verify all dependencies are bundled correctly
    - Check that Node.js process starts successfully

2. **Test Core Functionality**
    - WhatsApp connection and QR code display
    - Session persistence across restarts
    - Group extraction and member listing
    - Bulk user addition
    - Automation creation and execution

3. **Test File Permissions**
    - Verify session data is saved correctly
    - Check log file creation
    - Test export functionality (JSON/CSV)

4. **Performance Testing**
    - Test with large groups (500+ members)
    - Test bulk operations (100+ users)
    - Monitor memory usage during long operations

### Platform-Specific Testing

#### Windows

- Test on Windows 10 and Windows 11
- Verify MSI installation and uninstallation
- Check Start Menu shortcuts
- Test with Windows Defender enabled

#### macOS

- Test on macOS 11+ (Big Sur and later)
- Verify DMG mounting and installation
- Check code signing (if applicable)
- Test with Gatekeeper enabled

#### Linux

- Test on Ubuntu 20.04+, Fedora, and Arch
- Verify AppImage execution permissions
- Test desktop integration
- Check system tray functionality

## Troubleshooting

### Build Fails with "Node.js not found"

Ensure Node.js is installed and in PATH. The application requires Node.js at runtime.

### WhatsApp Client Fails to Start

Check that `whatsapp-node/node_modules` is properly bundled. Run `npm install` in the whatsapp-node directory before building.

### Session Data Not Persisting

Verify file system permissions in `capabilities/migrated.json` include app data access.

### Large Bundle Size

The bundle includes Chromium (via Puppeteer) for WhatsApp Web. This is expected and necessary for functionality.

## Release Checklist

- [ ] Update version in `package.json`
- [ ] Update version in `src-tauri/Cargo.toml`
- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Test build on all target platforms
- [ ] Verify all features work in production build
- [ ] Update CHANGELOG.md
- [ ] Create release notes
- [ ] Tag release in git
- [ ] Upload installers to release page

## Code Signing (Optional)

### Windows

Use `signtool` with a valid code signing certificate:

```bash
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com "WhatsApp Automation.msi"
```

### macOS

Use `codesign` with Apple Developer certificate:

```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" "WhatsApp Automation.app"
```

### Linux

AppImage signing is optional but recommended for distribution.

## Distribution

### Windows

- Distribute MSI installer
- Consider Microsoft Store submission

### macOS

- Distribute DMG file
- Consider Mac App Store submission (requires additional configuration)

### Linux

- Distribute AppImage
- Consider Snap/Flatpak packages for wider distribution

## Support

For build issues, check:

- Tauri documentation: https://tauri.app/
- Project issues: https://github.com/yourusername/whatsapp-automation/issues
