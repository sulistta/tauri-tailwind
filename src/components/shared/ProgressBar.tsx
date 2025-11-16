interface ProgressBarProps {
    current: number
    total: number
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0

    return (
        <div className="w-full space-y-2 animate-fade-in">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out relative"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-600 transition-all">
                    {current} / {total}
                </span>
                <span className="font-semibold text-blue-600 transition-all">
                    {percentage}%
                </span>
            </div>
        </div>
    )
}
