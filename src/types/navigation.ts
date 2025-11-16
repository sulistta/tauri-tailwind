import type { LucideIcon } from 'lucide-react'
import {
    Home,
    Zap,
    Users,
    UserPlus,
    FileText,
    Settings as SettingsIcon
} from 'lucide-react'
import Dashboard from '@/pages/Dashboard'
import Automations from '@/pages/Automations'
import ExtractUsers from '@/pages/ExtractUsers'
import AddToGroup from '@/pages/AddToGroup'
import Logs from '@/pages/Logs'
import Settings from '@/pages/Settings'

export type TabId =
    | 'dashboard'
    | 'automations'
    | 'extract-users'
    | 'add-to-group'
    | 'logs'
    | 'settings'

export interface TabConfig {
    id: TabId
    label: string
    icon: LucideIcon
    component: React.ComponentType
}

export const TAB_CONFIG: TabConfig[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        component: Dashboard
    },
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
    {
        id: 'logs',
        label: 'Logs',
        icon: FileText,
        component: Logs
    },
    {
        id: 'settings',
        label: 'Configurações',
        icon: SettingsIcon,
        component: Settings
    }
]
