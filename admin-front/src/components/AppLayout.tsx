import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  BellRingIcon,
  CommandIcon,
  MoonStarIcon,
  SearchIcon,
  SparklesIcon,
  SunMediumIcon,
} from 'lucide-react'
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  Input,
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
} from '@/components/ui'
import { adminModules, adminNavGroups, getAdminModuleBySlug } from '@/data/admin-navigation'

const APP_SHELL_HEADER_CLASS = 'h-[var(--app-shell-header-height)] shrink-0'

export function AppLayout() {
  const location = useLocation()
  const { resolvedTheme, setTheme } = useTheme()
  const [searchKeyword, setSearchKeyword] = useState('')
  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim().toLowerCase())

  const filteredGroups = useMemo(() => {
    if (!deferredSearchKeyword) {
      return adminNavGroups
    }

    return adminNavGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const haystack = `${item.title} ${item.shortTitle} ${item.description} ${item.group}`.toLowerCase()
          return haystack.includes(deferredSearchKeyword)
        }),
      }))
      .filter((group) => group.items.length > 0)
  }, [deferredSearchKeyword])

  const currentSlug = location.pathname.replace(/^\//, '') || 'dashboard'
  const currentModule = getAdminModuleBySlug(currentSlug) ?? adminModules[0]
  const themeLabel = resolvedTheme === 'dark' ? '切换浅色' : '切换深色'

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader
          className={`${APP_SHELL_HEADER_CLASS} justify-center border-b border-sidebar-border/80 px-3 py-0`}
        >
          <div className="flex w-full items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <CommandIcon className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">
                后台管理系统
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                  {adminModules.length} 个菜单
                </Badge>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid gap-4">
                {filteredGroups.map((group) => (
                  <div key={group.label} className="grid gap-1">
                    <div className="px-2 text-xs font-medium text-sidebar-foreground/65">
                      {group.label}
                    </div>
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
                  </div>
                ))}

                {filteredGroups.length === 0 ? (
                  <Card className="border border-sidebar-border/80 bg-sidebar-accent/35 py-3 shadow-none">
                    <CardContent className="px-3">
                      <p className="text-sm text-sidebar-foreground/75">没有匹配的菜单项。</p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="text-xs text-sidebar-foreground/70">
              单页演示骨架，可继续扩成真实后台。
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-transparent">
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

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
