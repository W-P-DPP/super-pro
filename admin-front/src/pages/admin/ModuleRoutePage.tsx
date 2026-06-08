import { Navigate, useParams } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import {
  ADMIN_PAGE_SCROLL_LAYOUT_CLASS,
  ADMIN_PAGE_STATUS_SECTION_CLASS,
  ModulePlaceholderPage,
} from './module-page-shared'

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
        <div
          className={`${ADMIN_PAGE_STATUS_SECTION_CLASS} flex h-40 items-center justify-center gap-3 text-sm text-muted-foreground`}
        >
          <Spinner className="size-4" />
          <span>姝ｅ湪鍔犺浇鑿滃崟璺敱...</span>
        </div>
      </section>
    )
  }

  return <Navigate to="/404" replace />
}
