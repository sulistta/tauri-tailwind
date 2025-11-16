import type { TabId } from '@/types/navigation'
import Dashboard from '@/pages/Dashboard'
import Automations from '@/pages/Automations'
import ExtractUsers from '@/pages/ExtractUsers'
import AddToGroup from '@/pages/AddToGroup'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'

interface TabContentProps {
    activeTab: TabId
}

export default function TabContent({ activeTab }: TabContentProps) {
    return (
        <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6">
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'automations' && <Automations />}
                {activeTab === 'extract-users' && <ExtractUsers />}
                {activeTab === 'add-to-group' && <AddToGroup />}
                {activeTab === 'logs' && <Logs />}
                {activeTab === 'settings' && <Settings />}
            </div>
        </div>
    )
}
