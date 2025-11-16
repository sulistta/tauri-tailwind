# Production Build Configuration

This document describes the production build configuration for WhatsApp Automation.

## Configuration Overview

### Application Metadata

- **Product Name**: WhatsApp Automation
- **Version**: 1.0.0
- **Identifier**: com.whatsapp.automation
- **Binary Name**: whatsapp-automation

### Bundle Targets

The application is configured to build for:

- **Windows**: MSI installer
- **macOS**: DMG disk image
- **Linux**: AppImage

### Bundled Resources

The following resources are included in the production bundle:

1. **whatsapp-node/** - Complete Node.js WhatsApp client
    - index.js - Main client entry point
    - operations/ - WhatsApp operations (getGroups, extractMembers, addToGroup)
    - package.json - Node.js dependencies
    - node_modules/ - Installed dependencies (whatsapp-web.js, qrcode, puppeteer)

2. **Application Icons** - Multi-platform icon set
    - Windows: icon.ico
    - macOS: icon.icns
    - Linux: PNG icons (32x32, 128x128, 256x256)

3. **Frontend Assets** - Compiled React application
    - HTML, CSS, JavaScript bundles
    - Static assets and images

## File System Permissions

The application has the following file system access:

### Read/Write Access

- `$APPDATA/whatsapp-automation/**` - Application data directory
    - Session storage (WhatsApp authentication)
    - Automation configurations
    - Log files
    - User preferences

### Read-Only Access

- `$RESOURCE/whatsapp-node/**` - Bundled Node.js client files

### Allowed Operations

- Read files and directories
- Write files and directories
- Create directories
- Remove files
- Check file existence
- Recursive read/write in app data directory

## Shell Permissions

The application can execute Node.js processes with the following configuration:

- **Command**: `node` (system Node.js installation)
- **Arguments**: Allowed (for passing script paths and parameters)
- **Sidecar**: Not used (relies on system Node.js)

### Security Restrictions

- `shell:allow-open` is **disabled** (prevents opening arbitrary URLs/files)
- Only Node.js execution is permitted
- All shell commands are scoped and validated

## Content Security Policy (CSP)

The application uses a strict CSP to enhance security:

```
default-src 'self';
img-src 'self' data: blob: https:;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
connect-src 'self' https: wss:;
script-src 'self' 'wasm-unsafe-eval'
```

### Policy Breakdown

- **default-src 'self'**: Only load resources from the application itself
- **img-src**: Allow images from self, data URIs (QR codes), blobs (exports), and HTTPS
- **style-src**: Allow self-hosted and inline styles (required for dynamic UI)
- **font-src**: Allow self-hosted fonts and data URIs
- **connect-src**: Allow HTTPS and WebSocket connections (for WhatsApp Web)
- **script-src**: Allow self-hosted scripts and WASM (for performance)

## Window Configuration

### Main Window

- **Title**: WhatsApp Automation
- **Default Size**: 1200x800 pixels
- **Minimum Size**: 800x600 pixels
- **Resizable**: Yes
- **Fullscreen**: No
- **HTTPS Scheme**: Enabled (for security)

## Build Process

### Pre-Build Steps

1. **Dependency Installation**
    - Frontend dependencies installed via Bun
    - whatsapp-node dependencies installed via npm
    - Pre-build script verifies all critical dependencies

2. **Frontend Compilation**
    - TypeScript compilation
    - Vite build with optimization
    - Asset bundling and minification

3. **Backend Compilation**
    - Rust compilation with release optimizations
    - Tauri plugin integration
    - Binary stripping for smaller size

### Build Commands

```bash
# Standard production build
bun tauri:build

# Debug build (with symbols)
bun tauri:build:debug

# Manual build (without pre-build script)
bun tauri build
```

## Platform-Specific Configuration

### Windows (MSI)

- **Language**: en-US
- **Installer Type**: WiX-based MSI
- **Installation Path**: `C:\Program Files\WhatsApp Automation\`
- **Start Menu**: Shortcut created automatically
- **Uninstaller**: Included in MSI

### macOS (DMG)

- **Format**: UDIF disk image
- **Installation**: Drag-and-drop to Applications
- **Minimum OS**: macOS 10.13 (High Sierra)
- **Architecture**: Universal binary (Intel + Apple Silicon)

### Linux (AppImage)

- **Format**: Self-contained AppImage
- **Media Framework**: Bundled (for audio/video support)
- **Desktop Integration**: Automatic on first run
- **Minimum Requirements**: glibc 2.27+

## Runtime Requirements

### All Platforms

- **Node.js**: 18.x or later (must be installed on user's system)
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Disk Space**: 500MB for application + 200MB for session data
- **Internet**: Required for WhatsApp Web connection

### Platform-Specific

#### Windows

- Windows 10 version 1809 or later
- WebView2 Runtime (installed automatically if missing)

#### macOS

- macOS 10.13 or later
- Xcode Command Line Tools (for some dependencies)

#### Linux

- GTK 3.24+
- WebKitGTK 2.40+
- libayatana-appindicator3 (for system tray)

## Security Considerations

### Session Data Protection

- WhatsApp session data is stored in the application data directory
- File permissions restrict access to the current user
- Session data is never transmitted over the network
- Automatic cleanup on uninstall (platform-dependent)

### Network Security

- All WhatsApp Web connections use WSS (WebSocket Secure)
- No external API calls except to WhatsApp servers
- CSP prevents loading of external scripts
- HTTPS scheme enforced for all web content

### Code Integrity

- Application binary is signed (if configured)
- Resources are bundled and verified at runtime
- No dynamic code loading from external sources
- All dependencies are pinned to specific versions

## Troubleshooting Production Builds

### Build Fails

1. **Check Node.js Installation**

    ```bash
    node --version  # Should be 18.x or later
    ```

2. **Verify Dependencies**

    ```bash
    cd src-tauri/whatsapp-node
    npm install
    ```

3. **Clean Build**
    ```bash
    cd src-tauri
    cargo clean
    cd ..
    bun tauri:build
    ```

### Runtime Issues

1. **WhatsApp Client Fails to Start**
    - Verify Node.js is in system PATH
    - Check whatsapp-node files are bundled correctly
    - Review application logs in `$APPDATA/whatsapp-automation/logs/`

2. **Session Not Persisting**
    - Check file system permissions
    - Verify `$APPDATA` directory is writable
    - Review capabilities configuration

3. **Performance Issues**
    - Increase system memory allocation
    - Close other Chromium-based applications
    - Check for antivirus interference

## Maintenance

### Version Updates

When updating the version:

1. Update `package.json` version
2. Update `src-tauri/Cargo.toml` version
3. Update `src-tauri/tauri.conf.json` version
4. Update CHANGELOG.md
5. Create git tag: `git tag v1.0.0`

### Dependency Updates

- Frontend dependencies: `bun update`
- Backend dependencies: `cargo update`
- whatsapp-node dependencies: `cd src-tauri/whatsapp-node && npm update`

### Security Patches

- Monitor Tauri security advisories
- Update whatsapp-web.js regularly
- Review and update CSP as needed
- Test thoroughly after security updates

## Distribution

### Recommended Distribution Channels

1. **GitHub Releases** - Primary distribution method
2. **Official Website** - Direct downloads
3. **Package Managers** - Consider Chocolatey (Windows), Homebrew (macOS), Snap/Flatpak (Linux)

### Release Checklist

- [ ] All tests passing
- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] Build tested on all platforms
- [ ] Code signed (if applicable)
- [ ] Release notes prepared
- [ ] Documentation updated
- [ ] GitHub release created
- [ ] Installers uploaded
- [ ] Announcement prepared

## Support

For production build issues:

- Check BUILD.md for detailed build instructions
- Review Tauri documentation: https://tauri.app/
- Open an issue: https://github.com/yourusername/whatsapp-automation/issues
