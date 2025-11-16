import './global.css'

import AppProvider from '@/app/provider'
import AppShell from '@/components/AppShell'

function App() {
    return (
        <AppProvider>
            <AppShell />
        </AppProvider>
    )
}

export default App
