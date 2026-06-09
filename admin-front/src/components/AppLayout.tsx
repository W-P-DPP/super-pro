import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { SuggestionCollector } from '@super-pro/shared-ui'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  BellRingIcon,
  ChevronDownIcon,
  CommandIcon,
  LogOutIcon,
  MoonStarIcon,
  PencilLineIcon,
  SearchIcon,
  SparklesIcon,
  SunMediumIcon,
  UserRoundIcon,
} from 'lucide-react'
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  Spinner,
  toast,
} from '@/components/ui'
import { getUserDetail, type UpdateUserRequestDto, updateUser, type UserResponseDto } from '@/api/modules/users'
import { submitSuggestion } from '@/api/modules/todo-suggestion'
import { useAdminMenu } from '@/contexts/admin-menu-context'
import { adminModules, getAdminModuleBySlug } from '@/data/admin-navigation'
import { clearReusableAuthSession, getReusableAuthToken } from '@/lib/auth-session'
import { getStrictMenuLoginUrl } from '@/lib/strict-menu-redirect'

const APP_SHELL_HEADER_CLASS = 'h-[var(--app-shell-header-height)] shrink-0'
const APP_SHELL_SIDEBAR_NOTICE_CLASS =
  'rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-3 text-sm text-sidebar-foreground/75'

type CurrentUserTokenPayload = {
  userId: number | null
  username: string
  role: string
}

type CurrentUserDraft = {
  nickname: string
  phone: string
}

function decodeCurrentUserToken(): CurrentUserTokenPayload | null {
  const token = getReusableAuthToken()
  if (!token) {
    return null
  }

  const tokenParts = token.split('.')
  if (tokenParts.length < 2) {
    return null
  }

  try {
    const base64Payload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
    const normalizedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=')
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as {
      userId?: unknown
      username?: unknown
      role?: unknown
    }

    return {
      userId: typeof decodedPayload.userId === 'number' ? decodedPayload.userId : null,
      username: typeof decodedPayload.username === 'string' ? decodedPayload.username : '',
      role: typeof decodedPayload.role === 'string' ? decodedPayload.role : '',
    }
  } catch {
    return null
  }
}

export function AppLayout() {
  const location = useLocation()
  const { resolvedTheme, setTheme } = useTheme()
  const {
    status: adminMenuStatus,
    errorMessage: adminMenuErrorMessage,
    permissionStatus,
    permissionErrorMessage,
    visibleNavGroups,
    visibleModules,
    getModuleBySlug,
    reload: reloadAdminMenu,
    reloadPermissions,
  } = useAdminMenu()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserResponseDto | null>(null)
  const [isCurrentUserDialogOpen, setIsCurrentUserDialogOpen] = useState(false)
  const [currentUserDraft, setCurrentUserDraft] = useState<CurrentUserDraft>({
    nickname: '',
    phone: '',
  })
  const [isSavingCurrentUser, setIsSavingCurrentUser] = useState(false)
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase())
  const closePopoverTimerRef = useRef<number | null>(null)

  const filteredGroups = useMemo(() => {
    if (!deferredSearchKeyword) {
      return visibleNavGroups
    }

    return visibleNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${item.title} ${item.shortTitle} ${item.description} ${item.group}`.toLowerCase()
          return haystack.includes(deferredSearchKeyword)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [deferredSearchKeyword, visibleNavGroups])

  const currentSlug = location.pathname.replace(/^\//, '') || 'dashboard'
  const currentModule = getModuleBySlug(currentSlug) ?? getAdminModuleBySlug(currentSlug) ?? adminModules[0]
  const themeLabel = resolvedTheme === 'dark' ? '切换浅色' : '切换深色'
  const hasSearchKeyword = deferredSearchKeyword.length > 0
  const currentUserToken = useMemo(() => decodeCurrentUserToken(), [])
  const currentUserDisplayName =
    currentUser?.nickname.trim() || currentUser?.username || currentUserToken?.username || '当前用户'
  const canSaveCurrentUser =
    Boolean(currentUserToken?.userId) && currentUserDraft.nickname.trim().length > 0

  useEffect(() => {
    setExpandedGroups((currentState) => {
      const nextState = { ...currentState }

      for (const group of visibleNavGroups) {
        if (!(group.label in nextState)) {
          nextState[group.label] = true
        }
      }

      if (currentModule?.group && !(currentModule.group in nextState)) {
        nextState[currentModule.group] = true
      }

      return nextState
    })
  }, [currentModule?.group, visibleNavGroups])

  useEffect(() => {
    async function loadCurrentUser() {
      if (!currentUserToken?.userId) {
        return
      }

      try {
        const user = await getUserDetail(currentUserToken.userId)
        setCurrentUser(user)
      } catch {
        setCurrentUser(null)
      }
    }

    void loadCurrentUser()
  }, [currentUserToken?.userId])

  useEffect(() => {
    return () => {
      if (closePopoverTimerRef.current !== null) {
        window.clearTimeout(closePopoverTimerRef.current)
      }
    }
  }, [])

  function keepUserPopoverOpen() {
    if (closePopoverTimerRef.current !== null) {
      window.clearTimeout(closePopoverTimerRef.current)
      closePopoverTimerRef.current = null
    }

    setIsUserPopoverOpen(true)
  }

  function scheduleUserPopoverClose() {
    if (closePopoverTimerRef.current !== null) {
      window.clearTimeout(closePopoverTimerRef.current)
    }

    closePopoverTimerRef.current = window.setTimeout(() => {
      setIsUserPopoverOpen(false)
      closePopoverTimerRef.current = null
    }, 120)
  }

  function handleOpenCurrentUserDialog() {
    setIsUserPopoverOpen(false)
    setCurrentUserDraft({
      nickname: currentUser?.nickname ?? currentUserToken?.username ?? '',
      phone: currentUser?.phone ?? '',
    })
    setIsCurrentUserDialogOpen(true)
  }

  async function handleSaveCurrentUser() {
    if (!currentUserToken?.userId || !canSaveCurrentUser || isSavingCurrentUser) {
      return
    }

    setIsSavingCurrentUser(true)

    try {
      const updatedUser = await updateUser(currentUserToken.userId, {
        nickname: currentUserDraft.nickname.trim(),
        phone: currentUserDraft.phone.trim(),
      } satisfies UpdateUserRequestDto)

      setCurrentUser(updatedUser)
      toast.success('用户信息已更新')
      setIsCurrentUserDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新用户信息失败，请稍后重试。')
    } finally {
      setIsSavingCurrentUser(false)
    }
  }

  function handleLogout() {
    clearReusableAuthSession()
    window.location.assign(getStrictMenuLoginUrl())
  }

  return (
    <SidebarProvider defaultOpen className="h-dvh min-h-dvh overflow-hidden">
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader
          className={`${APP_SHELL_HEADER_CLASS} justify-center border-b border-sidebar-border/80 px-3 py-0`}
        >
          <div className="flex w-full items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <CommandIcon className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">后台管理系统</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                  {visibleModules.length} 个菜单
                </Badge>
              </div>
            </div>
            <SidebarTrigger className="ml-auto shrink-0 rounded-lg border border-sidebar-border/80 bg-sidebar hover:bg-sidebar-accent" />
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid gap-4">
                {(adminMenuStatus === 'loading' || permissionStatus === 'loading') &&
                visibleNavGroups.length === 0 ? (
                  <div className={APP_SHELL_SIDEBAR_NOTICE_CLASS}>
                    <div className="flex items-center gap-2">
                      <Spinner className="size-4" />
                      <span>正在加载后台菜单与权限...</span>
                    </div>
                  </div>
                ) : null}

                {(adminMenuStatus === 'error' || permissionStatus === 'error') &&
                visibleNavGroups.length === 0 ? (
                  <div className={APP_SHELL_SIDEBAR_NOTICE_CLASS}>
                    <div className="grid gap-3">
                      <p>
                        {adminMenuErrorMessage || permissionErrorMessage || '后台菜单或权限加载失败，请稍后重试。'}
                      </p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={reloadAdminMenu}>
                          重试菜单
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={reloadPermissions}>
                          重试权限
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {filteredGroups.map((group) => (
                  <Collapsible
                    key={group.label}
                    open={hasSearchKeyword || expandedGroups[group.label]}
                    onOpenChange={(open) =>
                      setExpandedGroups((currentState) => ({
                        ...currentState,
                        [group.label]: open,
                      }))
                    }
                    className="group/collapsible grid gap-1"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 justify-between rounded-lg px-2 text-xs font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
                      >
                        <span>{group.label}</span>
                        <ChevronDownIcon className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="grid gap-1">
                      <SidebarMenu>
                        {group.items.map((item) => {
                          const Icon = item.icon

                          return (
                            <SidebarMenuItem key={item.slug}>
                              <SidebarMenuButton
                                asChild
                                tooltip={item.title}
                                isActive={location.pathname === `/${item.slug}`}
                                className="h-10 rounded-xl"
                              >
                                <NavLink to={`/${item.slug}`}>
                                  <Icon className="size-4" />
                                  <span>{item.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {filteredGroups.length === 0 &&
                adminMenuStatus === 'success' &&
                permissionStatus === 'success' ? (
                  <div className={APP_SHELL_SIDEBAR_NOTICE_CLASS}>
                    <p>{hasSearchKeyword ? '没有匹配的菜单项。' : '当前没有可展示的后台菜单。'}</p>
                  </div>
                ) : null}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="text-xs text-sidebar-foreground/70">单页演示骨架，可继续扩成真实后台。</div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="h-dvh min-h-0 overflow-hidden bg-transparent">
        <header
          className={`sticky top-0 z-30 ${APP_SHELL_HEADER_CLASS} border-b border-border/70 bg-background/92 backdrop-blur-md`}
        >
          <div className="flex h-full items-center gap-3 px-4 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>管理后台</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentModule.group}</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentModule.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="hidden min-w-0 flex-1 items-center justify-end xl:flex">
              <div className="relative w-full max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchKeyword}
                  onChange={(event) =>
                    startTransition(() => {
                      setSearchKeyword(event.target.value)
                    })
                  }
                  placeholder="筛选菜单、页面或功能"
                  className="h-10 rounded-full border-border/70 bg-background/80 pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="max-w-[11rem] rounded-full px-3"
                    onMouseEnter={keepUserPopoverOpen}
                    onMouseLeave={scheduleUserPopoverClose}
                    onClick={() => setIsUserPopoverOpen((currentValue) => !currentValue)}
                  >
                    <UserRoundIcon data-icon="inline-start" />
                    <span className="max-w-[7rem] truncate">{currentUserDisplayName}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-56 p-2"
                  onMouseEnter={keepUserPopoverOpen}
                  onMouseLeave={scheduleUserPopoverClose}
                >
                  <div className="grid gap-1">
                    <div className="rounded-lg px-2 py-1.5">
                      <div className="truncate text-sm font-medium">{currentUserDisplayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {currentUser?.username || currentUserToken?.username || '未识别账号'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start"
                      onClick={handleOpenCurrentUserDialog}
                      disabled={!currentUserToken?.userId}
                    >
                      <PencilLineIcon data-icon="inline-start" />
                      修改用户信息
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="justify-start text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOutIcon data-icon="inline-start" />
                      退出登录
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden rounded-full px-3 sm:inline-flex"
              >
                <BellRingIcon data-icon="inline-start" />
                消息中心
              </Button>
              <Button type="button" size="sm" className="hidden rounded-full px-3 lg:inline-flex">
                <SparklesIcon data-icon="inline-start" />
                新建任务
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              >
                {resolvedTheme === 'dark' ? (
                  <SunMediumIcon data-icon="inline-start" />
                ) : (
                  <MoonStarIcon data-icon="inline-start" />
                )}
                <span className="hidden sm:inline">{themeLabel}</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </div>
      </SidebarInset>

      <Dialog open={isCurrentUserDialogOpen} onOpenChange={setIsCurrentUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改用户信息</DialogTitle>
            <DialogDescription>支持修改当前登录用户的昵称和手机号。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <div className="text-sm font-medium">账号</div>
              <Input value={currentUser?.username || currentUserToken?.username || ''} disabled />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">用户昵称</div>
              <Input
                value={currentUserDraft.nickname}
                onChange={(event) =>
                  setCurrentUserDraft((currentDraft) => ({ ...currentDraft, nickname: event.target.value }))
                }
                placeholder="请输入用户昵称"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">手机号</div>
              <Input
                value={currentUserDraft.phone}
                onChange={(event) =>
                  setCurrentUserDraft((currentDraft) => ({ ...currentDraft, phone: event.target.value }))
                }
                placeholder="请输入手机号"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCurrentUserDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveCurrentUser()}
              disabled={!canSaveCurrentUser || isSavingCurrentUser}
            >
              {isSavingCurrentUser ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuggestionCollector sourceApp="admin-front" onSubmit={submitSuggestion} />
    </SidebarProvider>
  )
}
