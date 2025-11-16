import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TAB_CONFIG, type TabId } from '@/types/navigation'

interface TabNavigationProps {
    activeTab: TabId
    onTabChange: (tab: TabId) => void
}

export default function TabNavigation({
    activeTab,
    onTabChange
}: TabNavigationProps) {
    const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map())

    // Keyboard navigation handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

            e.preventDefault()

            const currentIndex = TAB_CONFIG.findIndex(
                (tab) => tab.id === activeTab
            )
            let nextIndex: number

            if (e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % TAB_CONFIG.length
            } else {
                nextIndex =
                    (currentIndex - 1 + TAB_CONFIG.length) % TAB_CONFIG.length
            }

            const nextTab = TAB_CONFIG[nextIndex]
            onTabChange(nextTab.id)

            // Focus the next tab button
            const nextButton = tabRefs.current.get(nextTab.id)
            nextButton?.focus()
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeTab, onTabChange])

    const handleTabClick = (tabId: TabId) => {
        onTabChange(tabId)
    }

    return (
        <aside className="flex h-full w-64 flex-col border-r bg-gray-50 shadow-sm flex-shrink-0">
            <div className="border-b p-6 bg-white">
                <h1 className="text-xl font-bold text-gray-900 transition-colors">
                    WhatsApp Automation
                </h1>
            </div>

            <nav className="flex-1 space-y-1 p-4" role="tablist">
                {TAB_CONFIG.map((tab, index) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                if (el) {
                                    tabRefs.current.set(tab.id, el)
                                } else {
                                    tabRefs.current.delete(tab.id)
                                }
                            }}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`tabpanel-${tab.id}`}
                            tabIndex={isActive ? 0 : -1}
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out',
                                'hover:scale-[1.02] hover:shadow-sm',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
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
                            <span>{tab.label}</span>
                        </button>
                    )
                })}
            </nav>

            <div className="border-t p-4 bg-white">
                <div className="text-xs text-gray-500 text-center">v1.0.0</div>
            </div>
        </aside>
    )
}
