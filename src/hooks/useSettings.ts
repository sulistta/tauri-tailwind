import { useState, useEffect } from 'react'

export interface AppSettings {
    bulkOperationDelay: number
    automationsEnabled: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
    bulkOperationDelay: 5,
    automationsEnabled: true
}

const STORAGE_KEY = 'app_settings'

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem(STORAGE_KEY)
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings)
                setSettings({ ...DEFAULT_SETTINGS, ...parsed })
            } catch (err) {
                console.error('Failed to parse saved settings:', err)
            }
        }
    }, [])

    // Save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    }, [settings])

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings((prev) => ({ ...prev, ...updates }))
    }

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS)
    }

    return {
        settings,
        updateSettings,
        resetSettings
    }
}
