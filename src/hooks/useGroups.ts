import { useState, useCallback } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { GroupInfo, Participant } from '@/types/whatsapp'
import {
    invokeWithRetry,
    parseTauriError,
    showErrorToast,
    showSuccessToast,
    logError
} from '@/lib/error-handler'

interface GroupsResponse {
    groups: GroupInfo[]
}

interface MembersResponse {
    members: Participant[]
}

export function useGroups() {
    const [groups, setGroups] = useState<GroupInfo[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchGroups = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            // Setup listener for groups response
            const unlisten = await listen<GroupsResponse>(
                'groups_response',
                (event) => {
                    setGroups(event.payload.groups)
                    setLoading(false)
                }
            )

            // Invoke the command with retry logic
            await invokeWithRetry('get_groups', undefined, {
                maxAttempts: 2,
                initialDelay: 1000,
                onRetry: (attempt) => {
                    console.log(`Retrying get_groups (attempt ${attempt})`)
                }
            })

            // Cleanup listener after a timeout if no response
            setTimeout(() => {
                unlisten()
                setLoading(false)
            }, 10000)
        } catch (err) {
            const error = parseTauriError(err)
            console.error('Failed to fetch groups:', error)
            setError(error.message)
            setLoading(false)
            logError(error, 'Fetch groups')
            showErrorToast(error, 'Failed to Load Groups')
        }
    }, [])

    const extractMembers = useCallback(
        async (groupId: string): Promise<Participant[]> => {
            return new Promise(async (resolve, reject) => {
                try {
                    // Setup listener for members response
                    const unlisten = await listen<MembersResponse>(
                        'members_response',
                        (event) => {
                            unlisten()
                            showSuccessToast(
                                `Extracted ${event.payload.members.length} members`
                            )
                            resolve(event.payload.members)
                        }
                    )

                    // Invoke the command with retry logic
                    await invokeWithRetry(
                        'extract_group_members',
                        { groupId },
                        {
                            maxAttempts: 2,
                            initialDelay: 1000,
                            onRetry: (attempt) => {
                                console.log(
                                    `Retrying extract_group_members (attempt ${attempt})`
                                )
                            }
                        }
                    )

                    // Timeout after 10 seconds
                    setTimeout(() => {
                        unlisten()
                        const timeoutError = new Error(
                            'Timeout waiting for members response'
                        )
                        logError(timeoutError, 'Extract members timeout')
                        reject(timeoutError)
                    }, 10000)
                } catch (err) {
                    const error = parseTauriError(err)
                    console.error('Failed to extract members:', error)
                    logError(error, 'Extract members')
                    showErrorToast(error, 'Failed to Extract Members')
                    reject(error)
                }
            })
        },
        []
    )

    return {
        groups,
        loading,
        error,
        fetchGroups,
        extractMembers
    }
}
