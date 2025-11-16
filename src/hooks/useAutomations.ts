import { useState, useCallback, useEffect } from 'react'
import type { Automation } from '@/types/automation'
import {
    invokeWithRetry,
    parseTauriError,
    showErrorToast,
    showSuccessToast,
    logError
} from '@/lib/error-handler'

export function useAutomations() {
    const [automations, setAutomations] = useState<Automation[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchAutomations = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const result = await invokeWithRetry<Automation[]>(
                'get_automations',
                undefined,
                {
                    maxAttempts: 2,
                    initialDelay: 1000
                }
            )
            setAutomations(result)
        } catch (err) {
            const error = parseTauriError(err)
            console.error('Failed to fetch automations:', error)
            setError(error.message)
            logError(error, 'Fetch automations')
            showErrorToast(error, 'Failed to Load Automations')
        } finally {
            setLoading(false)
        }
    }, [])

    const createAutomation = useCallback(
        async (automation: Omit<Automation, 'id' | 'createdAt'>) => {
            setError(null)

            try {
                const id = await invokeWithRetry<string>(
                    'create_automation',
                    { automation },
                    {
                        maxAttempts: 2,
                        initialDelay: 1000
                    }
                )
                await fetchAutomations()
                showSuccessToast('Automation created successfully')
                return id
            } catch (err) {
                const error = parseTauriError(err)
                console.error('Failed to create automation:', error)
                setError(error.message)
                logError(error, 'Create automation')
                showErrorToast(error, 'Failed to Create Automation')
                throw error
            }
        },
        [fetchAutomations]
    )

    const deleteAutomation = useCallback(
        async (id: string) => {
            setError(null)

            try {
                await invokeWithRetry(
                    'delete_automation',
                    { id },
                    { maxAttempts: 2 }
                )
                await fetchAutomations()
                showSuccessToast('Automation deleted successfully')
            } catch (err) {
                const error = parseTauriError(err)
                console.error('Failed to delete automation:', error)
                setError(error.message)
                logError(error, 'Delete automation')
                showErrorToast(error, 'Failed to Delete Automation')
                throw error
            }
        },
        [fetchAutomations]
    )

    const toggleAutomation = useCallback(
        async (id: string) => {
            setError(null)

            try {
                await invokeWithRetry(
                    'toggle_automation',
                    { id },
                    { maxAttempts: 2 }
                )
                await fetchAutomations()
                showSuccessToast('Automation toggled successfully')
            } catch (err) {
                const error = parseTauriError(err)
                console.error('Failed to toggle automation:', error)
                setError(error.message)
                logError(error, 'Toggle automation')
                showErrorToast(error, 'Failed to Toggle Automation')
                throw error
            }
        },
        [fetchAutomations]
    )

    // Load automations on mount
    useEffect(() => {
        fetchAutomations()
    }, [fetchAutomations])

    return {
        automations,
        loading,
        error,
        fetchAutomations,
        createAutomation,
        deleteAutomation,
        toggleAutomation
    }
}
