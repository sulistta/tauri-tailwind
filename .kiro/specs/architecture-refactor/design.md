# Design Document

## Overview

This design document outlines the architectural refactor of the WhatsApp Automation application to replace React Router with a tab-based navigation system, implement proper session initialization, and optimize authentication state management. The refactor aims to simplify the codebase, improve performance, and provide a better user experience by eliminating unnecessary re-authentication checks during navigation.

## Architecture

### Current Architecture Issues

1. **React Router Overhead**: Using React Router for a single-window desktop app adds unnecessary complexity
2. **Multiple Authentication Checks**: Each route change potentially triggers authentication verification
3. **No Centralized Session Initialization**: Session checking happens reactively rather than proactively on startup
4. **Component Remounting**: Route changes cause components to unmount/remount, losing state

### New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App Entry                            │
│                      (main.tsx)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    App Component                             │
│                  (app/index.tsx)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           WhatsAppProvider (Context)                 │   │
│  │  - Manages authentication state globally             │   │
│  │  - Performs session check on mount                   │   │
│  │  - Provides status, connect, disconnect methods      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  AppShell Component                          │
│               (components/AppShell.tsx)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Session Initialization Logic                      │     │
│  │  - Shows loading on startup                        │     │
│  │  - Checks for existing session                     │     │
│  │  - Routes to Connect or Dashboard                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  IF authenticated:                                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │         AuthenticatedApp                           │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  TabNavigation (Sidebar with tabs)           │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  │  ┌──────────────────────────────────────────────┐  │     │
│  │  │  TabContent (Conditional rendering)          │  │     │
│  │  │  - Dashboard                                 │  │     │
│  │  │  - Automations                               │  │     │
│  │  │  - Extract Users                             │  │     │
│  │  │  - Add to Group                              │  │     │
│  │  │  - Logs                                      │  │     │
│  │  │  - Settings                                  │  │     │
│  │  └──────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ELSE:                                                       │
│  ┌────────────────────────────────────────────────────┐     │
│  │         ConnectPage                                │     │
│  │  - QR Code display                                 │     │
│  │  - Connection button                               │     │
│  │  - Auto-redirect on success                        │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced WhatsAppContext

**Location**: `src/contexts/WhatsAppContext.tsx`

**Responsibilities**:

- Manage global authentication state
- Perform session check on initialization
- Provide authentication methods (connect, disconnect)
- Handle session expiration events
- Emit state changes to all consumers

**Interface**:

```typescript
interface WhatsAppContextType {
    // State
    status: WhatsAppStatus // 'disconnected' | 'connecting' | 'connected' | 'initializing'
    qrCode: string | null
    phoneNumber: string | null
    error: string | null
    isRecovering: boolean
    isInitialized: boolean // NEW: Indicates if initial session check is complete

    // Methods
    connect: () => Promise<void>
    disconnect: () => Promise<void>
    checkSession: () => Promise<boolean> // NEW: Check for existing session
}
```

**Key Changes**:

- Add `isInitialized` flag to track if initial session check is complete
- Add `initializing` status to WhatsAppStatus type
- Add `checkSession()` method to verify existing sessions
- Automatically call `checkSession()` on context mount

### 2. AppShell Component

**Location**: `src/components/AppShell.tsx`

**Responsibilities**:

- Handle application initialization flow
- Display loading state during session check
- Route between Connect and Authenticated views
- Handle session expiration redirects

**Props**: None (consumes WhatsAppContext)

**Rendering Logic**:

```typescript
if (!isInitialized) {
  return <LoadingScreen message="Verificando sessão..." />
}

if (status === 'connected') {
  return <AuthenticatedApp />
}

return <ConnectPage />
```

### 3. AuthenticatedApp Component

**Location**: `src/components/AuthenticatedApp.tsx`

**Responsibilities**:

- Manage tab-based navigation state
- Render sidebar with tab navigation
- Conditionally render active tab content
- Preserve component state across tab switches

**State**:

```typescript
interface AuthenticatedAppState {
    activeTab: TabId
}

type TabId =
    | 'dashboard'
    | 'automations'
    | 'extract-users'
    | 'add-to-group'
    | 'logs'
    | 'settings'
```

**Structure**:

```tsx
<div className="flex h-screen">
    <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    <main className="flex-1">
        <TabContent activeTab={activeTab} />
    </main>
</div>
```

### 4. TabNavigation Component

**Location**: `src/components/layout/TabNavigation.tsx`

**Responsibilities**:

- Display navigation tabs (sidebar)
- Highlight active tab
- Trigger tab change events

**Props**:

```typescript
interface TabNavigationProps {
    activeTab: TabId
    onTabChange: (tab: TabId) => void
}
```

**Implementation Notes**:

- Refactor existing Sidebar component
- Replace `<Link>` with `<button>` elements
- Use `onClick` handlers instead of routing
- Maintain visual design and animations

### 5. TabContent Component

**Location**: `src/components/layout/TabContent.tsx`

**Responsibilities**:

- Conditionally render the active tab's content
- Keep all tab components mounted but hidden (optional optimization)
- Provide consistent layout wrapper

**Props**:

```typescript
interface TabContentProps {
    activeTab: TabId
}
```

**Implementation Strategy**:

**Option A - Conditional Rendering** (Simpler, recommended):

```tsx
{
    activeTab === 'dashboard' && <Dashboard />
}
{
    activeTab === 'automations' && <Automations />
}
{
    activeTab === 'extract-users' && <ExtractUsers />
}
// ... etc
```

**Option B - Keep Mounted** (Better state preservation):

```tsx
<div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
  <Dashboard />
</div>
<div style={{ display: activeTab === 'automations' ? 'block' : 'none' }}>
  <Automations />
</div>
// ... etc
```

We'll use **Option A** initially for simplicity, with Option B available if state preservation becomes critical.

### 6. LoadingScreen Component

**Location**: `src/components/shared/LoadingScreen.tsx`

**Responsibilities**:

- Display loading indicator during initialization
- Show customizable message
- Provide consistent loading UX

**Props**:

```typescript
interface LoadingScreenProps {
    message?: string
}
```

## Data Models

### WhatsAppStatus Type Extension

```typescript
// Before
type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected'

// After
type WhatsAppStatus =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'initializing'
```

### Tab Configuration

```typescript
interface TabConfig {
    id: TabId
    label: string
    icon: LucideIcon
    component: React.ComponentType
}

const TAB_CONFIG: TabConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, component: Dashboard },
    {
        id: 'automations',
        label: 'Automação',
        icon: Zap,
        component: Automations
    },
    {
        id: 'extract-users',
        label: 'Extrair Membros',
        icon: Users,
        component: ExtractUsers
    },
    {
        id: 'add-to-group',
        label: 'Adicionar ao Grupo',
        icon: UserPlus,
        component: AddToGroup
    },
    { id: 'logs', label: 'Logs', icon: FileText, component: Logs },
    {
        id: 'settings',
        label: 'Configurações',
        icon: Settings,
        component: SettingsPage
    }
]
```

## Session Management Flow

### Application Startup Flow

```
1. App mounts
   ↓
2. WhatsAppProvider initializes
   ↓
3. Set status = 'initializing'
   ↓
4. Call checkSession() via Tauri command
   ↓
5a. Session exists              5b. No session
    ↓                               ↓
    Set status = 'connected'        Set status = 'disconnected'
    Set phoneNumber                 ↓
    ↓                               Set isInitialized = true
    Set isInitialized = true        ↓
    ↓                               AppShell renders ConnectPage
    AppShell renders AuthenticatedApp
```

### Tab Navigation Flow

```
1. User clicks tab button
   ↓
2. onTabChange(newTabId) called
   ↓
3. setActiveTab(newTabId) updates state
   ↓
4. TabContent re-renders with new activeTab
   ↓
5. New tab content displays
   (NO authentication check performed)
```

### Session Expiration Flow

```
1. Backend detects session expiration
   ↓
2. Emit 'whatsapp_disconnected' event
   ↓
3. WhatsAppContext listener updates status = 'disconnected'
   ↓
4. AppShell detects status change
   ↓
5. AppShell unmounts AuthenticatedApp
   ↓
6. AppShell renders ConnectPage
   ↓
7. Show toast notification: "Sessão expirada. Por favor, reconecte."
```

## Error Handling

### Session Check Errors

- If `checkSession()` fails, treat as no session exists
- Log error for debugging
- Set `status = 'disconnected'` and `isInitialized = true`
- Display ConnectPage normally

### Connection Errors

- Handled by existing error handling in useWhatsApp hook
- Display error messages on ConnectPage
- Allow retry via connect button

### Runtime Errors

- Tab switching errors: Log and show error boundary
- Component render errors: Use React Error Boundaries per tab
- State management errors: Reset to safe state (disconnect)

## Testing Strategy

### Unit Tests

1. **WhatsAppContext Tests**
    - Test session check on mount
    - Test status transitions
    - Test error handling
    - Mock Tauri invoke calls

2. **AppShell Tests**
    - Test loading state display
    - Test routing logic based on status
    - Test initialization flow

3. **AuthenticatedApp Tests**
    - Test tab switching
    - Test active tab highlighting
    - Test component rendering

4. **TabNavigation Tests**
    - Test click handlers
    - Test active state styling
    - Test accessibility

### Integration Tests

1. **Full Initialization Flow**
    - Test app startup with existing session
    - Test app startup without session
    - Test session check failure handling

2. **Navigation Flow**
    - Test switching between all tabs
    - Verify no authentication re-checks
    - Verify component state preservation (if using Option B)

3. **Session Expiration**
    - Simulate session expiration event
    - Verify redirect to ConnectPage
    - Verify notification display

### Manual Testing Checklist

- [ ] Cold start with no session shows Connect page
- [ ] Cold start with valid session shows Dashboard
- [ ] QR code connection flow works
- [ ] All tabs are accessible and render correctly
- [ ] Tab switching is instant (no loading)
- [ ] Session expiration redirects to Connect
- [ ] Reconnection after expiration works
- [ ] Error states display correctly
- [ ] Loading states display correctly

## Migration Strategy

### Phase 1: Preparation

1. Create new components (AppShell, AuthenticatedApp, TabNavigation, TabContent, LoadingScreen)
2. Enhance WhatsAppContext with session checking
3. Add new Tauri command for session checking (if needed)

### Phase 2: Implementation

1. Update App component to use AppShell instead of AppRouter
2. Refactor Sidebar to TabNavigation
3. Create TabContent with conditional rendering
4. Update WhatsAppProvider to perform initial session check

### Phase 3: Cleanup

1. Remove React Router dependency
2. Delete router.tsx and route files
3. Remove unused imports
4. Update page components to remove navigation logic

### Phase 4: Testing & Refinement

1. Run test suite
2. Perform manual testing
3. Fix any issues
4. Optimize performance if needed

## Files to Create

- `src/components/AppShell.tsx`
- `src/components/AuthenticatedApp.tsx`
- `src/components/layout/TabNavigation.tsx`
- `src/components/layout/TabContent.tsx`
- `src/components/shared/LoadingScreen.tsx`
- `src/types/navigation.ts` (for TabId and TabConfig types)

## Files to Modify

- `src/app/index.tsx` - Use AppShell instead of AppRouter
- `src/contexts/WhatsAppContext.tsx` - Add session checking logic
- `src/hooks/useWhatsApp.ts` - Add checkSession method
- `src/pages/Connect.tsx` - Remove navigation logic (handled by AppShell)

## Files to Delete

- `src/app/router.tsx`
- `src/app/routes/*.tsx` (all route files)
- `src/components/layout/Sidebar.tsx` (replaced by TabNavigation)
- `src/components/layout/Layout.tsx` (no longer needed)

## Dependencies to Remove

```json
{
    "dependencies": {
        "react-router": "^7.x.x", // REMOVE
        "react-router-dom": "^6.x.x" // REMOVE (if present)
    }
}
```

## Performance Considerations

### Benefits of Tab-Based Navigation

1. **Faster Navigation**: No route matching or component lazy loading
2. **State Preservation**: Components can stay mounted (Option B)
3. **Reduced Re-renders**: Only active tab content updates
4. **Simpler Code**: Less abstraction, easier to debug

### Potential Optimizations

1. **Lazy Load Tab Content**: Use React.lazy() for tab components if bundle size is a concern
2. **Memoization**: Use React.memo() for tab components to prevent unnecessary re-renders
3. **Virtual Scrolling**: If tabs have large lists, implement virtual scrolling
4. **Preload Next Tab**: Preload likely next tab content in background

## Accessibility

- Ensure tab navigation is keyboard accessible (Tab, Arrow keys)
- Use proper ARIA attributes (role="tablist", role="tab", aria-selected)
- Maintain focus management during tab switches
- Ensure screen readers announce tab changes
- Maintain proper heading hierarchy within tabs

## Security Considerations

- Session tokens should never be exposed in frontend state
- Session validation should happen in Rust backend
- Frontend only stores session existence flag, not credentials
- Implement proper cleanup on logout/disconnect
