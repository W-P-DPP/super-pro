import type { PropsWithChildren } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { Card, CardContent, Spinner } from './components/ui'
import { useAdminMenu } from './contexts/admin-menu-context'
import { DashboardPage } from './pages/admin/DashboardPage'
import { ModuleRoutePage } from './pages/admin/ModuleRoutePage'
import { ADMIN_PAGE_SCROLL_LAYOUT_CLASS } from './pages/admin/module-page-shared'
import { PermissionsPage } from './pages/admin/PermissionsPage'
import { ProjectsPage } from './pages/admin/ProjectsPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { RolesPage } from './pages/admin/RolesPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { UsersPage } from './pages/admin/UsersPage'
import { NotFoundPage } from './pages/NotFoundPage'

function AdminRouteGuard({
  moduleSlug,
  children,
}: PropsWithChildren<{ moduleSlug: string }>) {
  const {
    status,
    errorMessage,
    permissionStatus,
    permissionErrorMessage,
    canAccessModule,
  } = useAdminMenu()

  if (
    status === 'idle' ||
    status === 'loading' ||
    permissionStatus === 'idle' ||
    permissionStatus === 'loading'
  ) {
    return (
      <section className={ADMIN_PAGE_SCROLL_LAYOUT_CLASS}>
        <Card className="w-full border border-border/70 bg-card/95 shadow-sm">
          <CardContent className="flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            <span>正在加载后台权限...</span>
          </CardContent>
        </Card>
      </section>
    )
  }

  if (status === 'error' || permissionStatus === 'error') {
    return (
      <section className={ADMIN_PAGE_SCROLL_LAYOUT_CLASS}>
        <Card className="w-full border border-border/70 bg-card/95 shadow-sm">
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {errorMessage || permissionErrorMessage || '后台权限加载失败，请稍后重试。'}
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!canAccessModule(moduleSlug)) {
    return <Navigate to="/404" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <AdminRouteGuard moduleSlug="dashboard">
              <DashboardPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="users"
          element={
            <AdminRouteGuard moduleSlug="users">
              <UsersPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="roles"
          element={
            <AdminRouteGuard moduleSlug="roles">
              <RolesPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="permissions"
          element={
            <AdminRouteGuard moduleSlug="permissions">
              <PermissionsPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="projects"
          element={
            <AdminRouteGuard moduleSlug="projects">
              <ProjectsPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="reports"
          element={
            <AdminRouteGuard moduleSlug="reports">
              <ReportsPage />
            </AdminRouteGuard>
          }
        />
        <Route
          path="settings"
          element={
            <AdminRouteGuard moduleSlug="settings">
              <SettingsPage />
            </AdminRouteGuard>
          }
        />
        <Route path=":moduleSlug" element={<ModuleRoutePage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  )
}

export default App
