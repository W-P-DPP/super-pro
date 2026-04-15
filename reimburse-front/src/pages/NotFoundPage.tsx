export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-dashed border-border/80 bg-background/40 p-6 text-center">
        <div className="text-lg font-semibold">页面不存在</div>
        <div className="mt-2 text-sm text-muted-foreground">当前路由未接入页面，请返回报销列表继续操作。</div>
        <a className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" href="#/reimbursements">
          返回报销列表
        </a>
      </div>
    </section>
  );
}
