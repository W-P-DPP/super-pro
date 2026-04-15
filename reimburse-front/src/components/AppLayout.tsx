import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { ClipboardCheckIcon, LogOutIcon, MoonStarIcon, ReceiptTextIcon, SunMediumIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui';
import { clearReusableAuthSession, hasReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';
import { getCurrentUser, type CurrentUserResponse } from '@/api/modules/reimbursement';

const navItems = [
  { label: '我的报销', path: '/reimbursements', icon: ReceiptTextIcon },
  { label: '审批列表', path: '/approvals', icon: ClipboardCheckIcon },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);

  useEffect(() => {
    if (!hasReusableAuthToken()) {
      redirectToLoginWithCurrentPage();
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await getCurrentUser();
        if (active) {
          setCurrentUser(response);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载当前用户失败');
      }
    }

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/approvals')) {
      return '审批列表';
    }
    if (location.pathname.includes('/new')) {
      return '新建报销';
    }
    if (/\/reimbursements\/\d+/.test(location.pathname)) {
      return '报销详情';
    }
    return '我的报销';
  }, [location.pathname]);

  const handleLogout = () => {
    clearReusableAuthSession();
    redirectToLoginWithCurrentPage();
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-border/70 px-4 py-3">
          <div className="text-sm font-semibold">报销系统</div>
          <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {currentUser ? `${currentUser.username} · ${currentUser.role}` : '正在加载用户'}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>工作台</SidebarGroupLabel>
            <SidebarGroupContent className="grid gap-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    <Icon className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </button>
                );
              })}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/70 p-2">
          <Button type="button" variant="ghost" className="justify-start gap-2" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {resolvedTheme === 'dark' ? <SunMediumIcon className="size-4" /> : <MoonStarIcon className="size-4" />}
            <span className="group-data-[collapsible=icon]:hidden">切换主题</span>
          </Button>
          <Button type="button" variant="ghost" className="justify-start gap-2" onClick={handleLogout}>
            <LogOutIcon className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">退出登录</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <SidebarTrigger />
          <div className="font-semibold">{pageTitle}</div>
        </header>
        <main>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
