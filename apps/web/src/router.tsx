import type { AppConfig } from '@matrix-web/config'
import { createBrowserRouter, createHashRouter, Navigate } from 'react-router'
import { AuthGuard } from './components/auth-guard'
import { ChatLayout } from './pages/chat/chat-layout'
import { ForgotPasswordPage } from './pages/login/forgot-password-page'
import { LoginPage } from './pages/login/login-page'
import { RegisterPage } from './pages/register/register-page'

const routes = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <ChatLayout />
      </AuthGuard>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]

export function createRouter(config: AppConfig) {
  const createFn = config.routerMode === 'hash' ? createHashRouter : createBrowserRouter
  return createFn(routes, { basename: config.basePath })
}
