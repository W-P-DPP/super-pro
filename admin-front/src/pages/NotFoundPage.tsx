import { Link } from 'react-router-dom'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100svh-var(--app-shell-header-height)-2rem)] w-full max-w-[var(--app-shell-page-width)] items-center justify-center px-4 py-6 md:px-6">
      <Card className="w-full max-w-xl border border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardDescription>404</CardDescription>
          <CardTitle className="text-2xl font-semibold tracking-tight">页面不存在</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <p className="text-sm leading-6 text-muted-foreground">
            当前路由还没有绑定到后台菜单。你可以先回到工作台，或者继续进入其他占位模块。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full px-4">
              <Link to="/dashboard">返回工作台</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full px-4">
              <Link to="/users">进入用户管理</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
