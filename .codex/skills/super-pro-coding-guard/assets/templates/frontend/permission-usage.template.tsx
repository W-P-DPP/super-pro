import { ADMIN_CONSOLE_PERMISSION_CODES } from '@super-pro/shared-types'
import { toast } from '@/components/ui'
import { RequestError, shouldRedirectToLoginForRequestError } from '@/api/request'
import { useAdminMenu } from '@/contexts/admin-menu-context'

export function use__Resource__Permissions() {
  const { canAccessModule, hasPermission } = useAdminMenu()

  return {
    canAccessPage: canAccessModule('__module-slug__'),
    canRead: hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.__PERMISSION_READ__),
    canCreate: hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.__PERMISSION_CREATE__),
    canUpdate: hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.__PERMISSION_UPDATE__),
    canDelete: hasPermission(ADMIN_CONSOLE_PERMISSION_CODES.__PERMISSION_DELETE__),
  }
}

export function handleProtectedActionError(error: unknown, fallbackMessage: string) {
  if (shouldRedirectToLoginForRequestError(error)) {
    return
  }

  if (error instanceof RequestError && error.status === 403) {
    toast.error(error.message || '当前用户没有权限执行该操作。')
    return
  }

  toast.error(error instanceof Error ? error.message : fallbackMessage)
}
