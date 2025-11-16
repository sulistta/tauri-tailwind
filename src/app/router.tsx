import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'

const createAppRouter = () =>
    createBrowserRouter([
        {
            path: '/',
            element: <Navigate to="/connect" replace />
        },
        {
            path: '/connect',
            lazy: () => import('@/app/routes/connect')
        },
        {
            path: '/dashboard',
            lazy: () => import('@/app/routes/dashboard')
        },
        {
            path: '/extract-users',
            lazy: () => import('@/app/routes/extract-users')
        },
        {
            path: '/add-to-group',
            lazy: () => import('@/app/routes/add-to-group')
        },
        {
            path: '/automations',
            lazy: () => import('@/app/routes/automations')
        },
        {
            path: '/logs',
            lazy: () => import('@/app/routes/logs')
        },
        {
            path: '/settings',
            lazy: () => import('@/app/routes/settings')
        },
        {
            path: '*',
            lazy: () => import('@/app/routes/not-found')
        }
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
