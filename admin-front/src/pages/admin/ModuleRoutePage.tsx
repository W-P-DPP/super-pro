import { Navigate, useParams } from 'react-router-dom'
import { Card, CardContent, Spinner } from '@/components/ui'
import { ModulePlaceholderPage } from './module-page-shared'
import { useAdminMenu } from '@/contexts/admin-menu-context'

export function ModuleRoutePage() {
  const { moduleSlug } = useParams()
  const { getModuleBySlug, status } = useAdminMenu()

  if (!moduleSlug) {
    return <Navigate to="/404" replace />
  }

  if (getModuleBySlug(moduleSlug)) {
    return <ModulePlaceholderPage moduleSlug={moduleSlug} />
  }

  if (status === 'idle' || status === 'loading') {
    return (
      <section className="mx-auto flex w-full max-w-[var(--app-shell-page-width)] px-4 py-4 md:px-6 md:py-6">
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
