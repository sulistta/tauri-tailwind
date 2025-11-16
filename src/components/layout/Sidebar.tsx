import { Link, useLocation } from 'react-router'
import {
    Home,
    Zap,
    Users,
    UserPlus,
    FileText,
    Settings as SettingsIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/automations', label: 'Automação', icon: Zap },
    { path: '/extract-users', label: 'Extrair Membros', icon: Users },
    { path: '/add-to-group', label: 'Adicionar ao Grupo', icon: UserPlus },
    { path: '/logs', label: 'Logs', icon: FileText },
    { path: '/settings', label: 'Configurações', icon: SettingsIcon }
]

export default function Sidebar() {
    const location = useLocation()

    return (
        <aside className="flex h-screen w-64 flex-col border-r bg-gray-50 shadow-sm">
            <div className="border-b p-6 bg-white">
                <h1 className="text-xl font-bold text-gray-900 transition-colors">
                    WhatsApp Automation
                </h1>
            </div>

            <nav className="flex-1 space-y-1 p-4">
                {menuItems.map((item, index) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out',
                                'hover:scale-[1.02] hover:shadow-sm',
                                isActive
                                    ? 'bg-blue-100 text-blue-900 shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            )}
                            style={{
                                animationDelay: `${index * 50}ms`
                            }}
                        >
                            <Icon
                                className={cn(
                                    'h-5 w-5 transition-transform duration-200',
                                    isActive && 'scale-110'
                                )}
                            />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t p-4 bg-white">
                <div className="text-xs text-gray-500 text-center">v1.0.0</div>
            </div>
        </aside>
    )
}
