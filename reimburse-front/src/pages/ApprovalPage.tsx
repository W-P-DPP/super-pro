import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser, getReimbursements, type ReimbursementListItem } from '@/api/modules/reimbursement';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Spinner,
} from '@/components/ui';

export function ApprovalPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReimbursementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (!active) {
          return;
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'approver') {
          setForbidden(true);
          setItems([]);
          return;
        }

        const response = await getReimbursements('submitted');
        if (active) {
          setItems(response);
          setForbidden(false);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载审批列表失败');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="grid gap-4 p-4 md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>审批列表</CardTitle>
          <CardDescription>仅审批人和管理员可以查看待审批报销单。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              正在加载待审批报销单
            </div>
          ) : null}

          {!loading && forbidden ? (
            <Empty className="border border-dashed border-border/80 bg-background/40">
              <EmptyHeader>
                <EmptyTitle>暂无权限</EmptyTitle>
                <EmptyDescription>当前账号不是审批人或管理员，无法查看审批列表。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!loading && !forbidden && items.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-background/40">
              <EmptyHeader>
                <EmptyTitle>暂无待审批报销单</EmptyTitle>
                <EmptyDescription>当前没有待处理的报销申请。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {!loading && !forbidden
            ? items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/reimbursements/${item.id}`)}
                  className="w-full rounded-2xl border border-border/80 bg-background/40 px-4 py-4 text-left transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{item.title}</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        申请人 {item.applicantUsername} · {item.category} · {item.expenseDate}
                      </div>
                    </div>
                    <Badge>待审批</Badge>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">金额 ¥{item.amount.toFixed(2)}</div>
                </button>
              ))
            : null}
        </CardContent>
      </Card>
    </section>
  );
}
