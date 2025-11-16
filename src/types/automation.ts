export interface MessageFilter {
    contains?: string
    from?: string
    groupId?: string
}

export type AutomationTrigger =
    | { type: 'on_message'; filter?: MessageFilter }
    | { type: 'on_group_join'; groupId?: string }
    | { type: 'on_app_start' }

export type AutomationAction =
    | { type: 'send_message'; to: string; message: string; delay?: number }
    | { type: 'extract_info'; groupId: string }
    | { type: 'add_to_group'; groupId: string; numbers: string[] }
    | { type: 'save_to_list'; listName: string; data: any }

export interface Automation {
    id: string
    name: string
    enabled: boolean
    trigger: AutomationTrigger
    actions: AutomationAction[]
    createdAt: string
}
