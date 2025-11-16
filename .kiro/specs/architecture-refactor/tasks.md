# Implementation Plan

- [x]   1. Create shared types and configuration
    - Create `src/types/navigation.ts` with TabId type and TabConfig interface
    - Define TAB_CONFIG array with all tab configurations
    - _Requirements: 2.1, 2.2, 4.2_

- [x]   2. Create LoadingScreen component
    - Create `src/components/shared/LoadingScreen.tsx` component
    - Implement loading spinner with customizable message prop
    - Add fade-in animation for smooth appearance
    - _Requirements: 1.2, 1.3_

- [ ]   3. Enhance WhatsAppContext with session initialization
    - [x] 3.1 Add new state properties to WhatsAppContext
        - Add `isInitialized` boolean state
        - Add `initializing` to WhatsAppStatus type
        - Update WhatsAppContextType interface
        - _Requirements: 1.1, 3.1, 3.3_

    - [ ] 3.2 Implement checkSession method in useWhatsApp hook
        - Add `checkSession()` function that calls Tauri backend
        - Handle session check success (set status to 'connected')
        - Handle session check failure (set status to 'disconnected')

        - Set `isInitialized` to true after check completes

        - _Requirements: 1.1, 1.4, 3.1_

    - [ ] 3.3 Add automatic session check on mount
        - Call `checkSession()` in useEffect on component mount
        - Set status to 'initializing' before check

        - Handle errors gracefully (treat as no session)
        - _Requirements: 1.1, 3.1_

- [x]   4. Create TabNavigation component
    - [ ] 4.1 Create `src/components/layout/TabNavigation.tsx`
        - Accept `activeTab` and `onTabChange` props
        - Render tab buttons using TAB_CONFIG
        - Implement active tab highlighting
        - Add hover and transition effects
        - _Requirements: 2.1, 2.2, 2.5, 4.2_

    - [x] 4.2 Implement click handlers
        - Call `onTabChange` with clicked tab ID
        - Prevent default button behavior
        - Add keyboard navigation support (Arrow keys)

        - _Requirements: 2.2, 3.2_

- [ ]   5. Create TabContent component
    - Create `src/components/layout/TabContent.tsx`
    - Accept `activeTab` prop
    - Implement conditional rendering for each tab

    - Render Dashboard, Automations, ExtractUsers, AddToGroup, Logs, and Settings based on activeTab
    - Wrap content in consistent layout container
    - _Requirements: 2.2, 2.3, 2.4, 4.2_

- [ ]   6. Create AuthenticatedApp component
    - [ ] 6.1 Create `src/components/AuthenticatedApp.tsx`
        - Create component with activeTab state management
        - Initialize activeTab to 'dashboard'
        - Implement tab change handler
        - _Requirements: 2.1, 2.2, 4.3_
    - [ ] 6.2 Compose layout with TabNavigation and TabContent
        - Render TabNavigation with activeTab and onTabChange props
        - Render TabContent with activeTab prop
        - Apply flex layout for sidebar + main content
        - Maintain existing visual styling
        - _Requirements: 2.2, 2.4, 4.2_

- [x]   7. Create AppShell component
    - [x] 7.1 Create `src/components/AppShell.tsx`
        - Consume WhatsAppContext
        - Implement initialization loading state
        - Implement routing logic based on authentication status
        - _Requirements: 1.2, 1.3, 1.4, 1.5, 4.3_

    - [ ] 7.2 Implement session expiration handling
        - Listen for status changes from 'connected' to 'disconnected'
        - Show toast notification on session expiration
        - Automatically redirect to ConnectPage

        - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]   8. Update Connect page
    - Remove navigation logic from `src/pages/Connect.tsx`
    - Remove useNavigate hook and redirect useEffect
    - Let AppShell handle routing after connection
    - Keep QR code display and connection UI

    - _Requirements: 1.5, 4.2_

- [ ]   9. Update App component to use new architecture
    - Modify `src/app/index.tsx` to use AppShell instead of AppRouter

    - Remove AppRouter import
    - Ensure WhatsAppProvider wraps AppShell
    - _Requirements: 4.1, 4.2, 4.3_

- [ ]   10. Remove React Router dependencies
    - [ ] 10.1 Delete router and route files
        - Delete `src/app/router.tsx`

        - Delete all files in `src/app/routes/` directory
        - Delete `src/components/layout/Sidebar.tsx`
        - Delete `src/components/layout/Layout.tsx`
        - _Requirements: 4.1, 4.4_

    - [ ] 10.2 Remove React Router imports from all files
        - Remove imports from any remaining files that reference react-router
        - Update any components using Link, useNavigate, or useLocation
        - _Requirements: 4.1, 4.4_
    - [ ] 10.3 Uninstall React Router package
        - Remove react-router from package.json dependencies
        - Run package manager to update lock file
        - _Requirements: 4.1_

- [ ]   11. Add Tauri backend session check command
    - Add `check_session` command in Rust backend
    - Implement logic to verify if WhatsApp session exists
    - Return session status and phone number if available
    - Handle errors and return appropriate response
    - _Requirements: 1.1, 3.1_

- [ ]   12. Update page components to remove navigation dependencies
    - Review Dashboard, Automations, ExtractUsers, AddToGroup, Logs, Settings pages
    - Remove any direct navigation logic or router dependencies
    - Ensure components work as standalone views
    - _Requirements: 4.2, 4.4_

- [ ]\* 13. Add error boundaries for tab content
    - Create ErrorBoundary component for tab content
    - Wrap each tab in TabContent with ErrorBoundary
    - Display user-friendly error message on component failure
    - Provide reset/retry functionality
    - _Requirements: 2.4_

- [ ]\* 14. Implement accessibility features
    - Add ARIA attributes to TabNavigation (role="tablist", role="tab")
    - Implement keyboard navigation (Tab, Arrow keys, Enter)
    - Add aria-selected attribute to active tab
    - Ensure focus management during tab switches
    - Test with screen reader
    - _Requirements: 2.2, 2.5_

- [ ]\* 15. Add performance optimizations
    - Wrap tab components with React.memo() to prevent unnecessary re-renders
    - Implement useCallback for tab change handler
    - Consider lazy loading for tab components if bundle size is large
    - _Requirements: 2.2, 3.2_
