import { Navigate, useParams } from 'react-router-dom'
import { Card, CardContent, Spinner } from '@/components/ui'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import { ADMIN_PAGE_SCROLL_LAYOUT_CLASS, ModulePlaceholderPage } from './module-page-shared'

export function ModuleRoutePage() {
  const { moduleSlug } = useParams()
  const { getVisibleModuleBySlug, permissionStatus, status } = useAdminMenu()

  if (!moduleSlug) {
    return <Navigate to="/404" replace />
  }

  if (getVisibleModuleBySlug(moduleSlug)) {
    return <ModulePlaceholderPage moduleSlug={moduleSlug} />
  }

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
            <span>正在加载菜单路由...</span>
          </CardContent>
        </Card>
      </section>
    )
  }

  return <Navigate to="/404" replace />
}
