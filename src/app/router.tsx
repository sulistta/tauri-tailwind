import { createBrowserRouter, RouterProvider } from 'react-router'

const createAppRouter = () =>
    createBrowserRouter([
        {
            path: '/',
            lazy: () => import('@/app/routes/home')
        },
        {
            path: '/projects/:projectId',
            lazy: () => import('@/app/routes/project-details')
        },
        {
            path: '*',
            lazy: () => import('@/app/routes/not-found')
        }
    ])

export default function AppRouter() {
    return <RouterProvider router={createAppRouter()} />
}
