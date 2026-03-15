import { Badge } from '@/components/ui/badge'
import type { ProjectStatus } from '@/types/projects'

const statusConfig: Record<
    ProjectStatus,
    {
        label: string
        variant: 'default' | 'secondary' | 'destructive' | 'outline'
    }
> = {
    idle: {
        label: 'Idle',
        variant: 'outline'
    },
    processing: {
        label: 'Processando',
        variant: 'secondary'
    },
    success: {
        label: 'Pronto',
        variant: 'default'
    },
    error: {
        label: 'Erro',
        variant: 'destructive'
    }
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
    const config = statusConfig[status]

    return <Badge variant={config.variant}>{config.label}</Badge>
}
