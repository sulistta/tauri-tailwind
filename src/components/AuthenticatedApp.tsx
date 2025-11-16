import { useState } from 'react'
import TabNavigation from '@/components/layout/TabNavigation'
import TabContent from '@/components/layout/TabContent'
import type { TabId } from '@/types/navigation'

export default function AuthenticatedApp() {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard')

    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab)
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <TabNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            <main className="flex-1 overflow-y-auto">
                <TabContent activeTab={activeTab} />
            </main>
        </div>
    )
}
