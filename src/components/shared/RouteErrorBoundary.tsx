import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logError } from '@/lib/error-handler'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

/**
 * Route-level error boundary for catching component errors
 */
export class RouteErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Route error boundary caught error:', error, errorInfo)
        logError(error, 'Route error boundary')

        this.setState({
            error,
            errorInfo
        })
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                    <Card className="max-w-2xl w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                                <CardTitle className="text-2xl">
                                    Something went wrong
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-gray-600">
                                An unexpected error occurred in this page. You
                                can try refreshing the page or return to the
                                home page.
                            </p>

                            {this.state.error && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                                    <p className="font-semibold text-red-900 mb-2">
                                        Error Message:
                                    </p>
                                    <pre className="text-sm text-red-800 whitespace-pre-wrap break-words">
                                        {this.state.error.message}
                                    </pre>
                                </div>
                            )}

                            {this.state.errorInfo && (
                                <details className="bg-gray-100 border border-gray-300 rounded-md p-4">
                                    <summary className="font-semibold text-gray-900 cursor-pointer">
                                        Stack Trace
                                    </summary>
                                    <pre className="text-xs text-gray-700 mt-2 whitespace-pre-wrap break-words overflow-auto max-h-64">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={this.handleReset}
                                    className="flex-1"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={this.handleGoHome}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <Home className="h-4 w-4 mr-2" />
                                    Go Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}
