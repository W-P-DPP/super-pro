import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BotMessageSquareIcon, SendHorizonalIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAgentProviderModels,
  type AgentModelOption,
  type AgentProvider,
} from '@/api/modules/agent';
import {
  getChatMessages,
  streamChatReply,
  type ChatMessageItem,
  type ChatStreamEvent,
} from '@/api/modules/chat';
import type { KnowledgeSearchItem } from '@/api/modules/knowledge';
import type { AppLayoutOutletContext } from '@/components/AppLayout';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  NativeSelect,
  NativeSelectOption,
  Separator,
  Spinner,
  Textarea,
} from '@/components/ui';
import { getUserAvatarFallback } from '@/lib/user-display';
import { cn } from '@/lib/utils';

type DisplayMessage = Omit<ChatMessageItem, 'id'> & { id: number | string };

function pickModel(
  options: AgentModelOption[],
  preferredModel: string | null | undefined,
  defaultModel: string,
) {
  if (preferredModel && options.some((item) => item.value === preferredModel)) {
    return preferredModel;
  }

  if (options.some((item) => item.value === defaultModel)) {
    return defaultModel;
  }

  return options[0]?.value ?? '';
}

export function ChatPage() {
  const navigate = useNavigate();
  const {
    activeSessionId,
    agentInfo,
    createSession,
    currentKnowledgeBaseIds,
    currentUser,
    refreshSessions,
    sessions,
    workspaceLoading,
  } = useOutletContext<AppLayoutOutletContext>();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [provider, setProvider] = useState<AgentProvider>('openai');
  const [model, setModel] = useState('');
  const [modelOptions, setModelOptions] = useState<AgentModelOption[]>([]);
  const [input, setInput] = useState('');
  const [retrievalItems, setRetrievalItems] = useState<KnowledgeSearchItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [sending, setSending] = useState(false);

  const userAvatarFallback = getUserAvatarFallback(
    currentUser?.displayName,
    currentUser?.username,
  );

  useEffect(() => {
    let active = true;

    async function loadInitialModels() {
      const nextProvider = agentInfo?.agent.defaultProvider ?? 'openai';
      const preferredModel = agentInfo?.agent.defaultModel ?? '';

      try {
        setLoadingModels(true);
        const response = await getAgentProviderModels(nextProvider);
        if (!active) {
          return;
        }

        setProvider(response.provider);
        setModelOptions(response.models);
        setModel(pickModel(response.models, preferredModel, response.defaultModel));
      } catch (error) {
        if (!active) {
          return;
        }

        toast.error(error instanceof Error ? error.message : '加载模型列表失败');
      } finally {
        if (active) {
          setLoadingModels(false);
        }
      }
    }

    void loadInitialModels();

    return () => {
      active = false;
    };
  }, [agentInfo]);

  useEffect(() => {
    if (activeSessionId === null) {
      setMessages([]);
      return;
    }

    const sessionId = activeSessionId;
    let active = true;

    async function loadMessageList() {
      try {
        setLoadingMessages(true);
        const response = await getChatMessages(sessionId);
        if (!active) {
          return;
        }

        setMessages(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载消息失败');
      } finally {
        if (active) {
          setLoadingMessages(false);
        }
      }
    }

    void loadMessageList();

    return () => {
      active = false;
    };
  }, [activeSessionId]);

  const currentSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  const refreshCurrentSession = async (targetSessionId: string) => {
    const [, messageList] = await Promise.all([refreshSessions(), getChatMessages(targetSessionId)]);
    setMessages(messageList);
  };

  const handleProviderChange = async (nextProvider: AgentProvider) => {
    if (nextProvider === provider || loadingModels) {
      return;
    }

    try {
      setLoadingModels(true);
      const response = await getAgentProviderModels(nextProvider);
      setProvider(response.provider);
      setModelOptions(response.models);
      setModel(pickModel(response.models, null, response.defaultModel));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '切换模型供应商失败');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || loadingModels || !model) {
      return;
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAssistantId = `assistant-${Date.now()}`;

    try {
      setSending(true);
      setRetrievalItems([]);
      setInput('');

      let targetSessionId = activeSessionId;
      if (targetSessionId === null) {
        targetSessionId = await createSession(trimmed.slice(0, 24));
        if (targetSessionId === null) {
          setInput(trimmed);
          return;
        }
      }

      if (targetSessionId === null) {
        setInput(trimmed);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: tempUserId,
          role: 'user',
          content: trimmed,
          provider: '',
          model: '',
        },
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          provider,
          model,
        },
      ]);

      await streamChatReply(
        targetSessionId,
        {
          message: trimmed,
          knowledgeBaseIds: currentKnowledgeBaseIds,
          provider,
          model,
        },
        {
          onEvent: (event: ChatStreamEvent) => {
            if (event.event === 'token') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === tempAssistantId
                    ? { ...item, content: item.content + event.data.content }
                    : item,
                ),
              );
            }

            if (event.event === 'retrieval-result') {
              setRetrievalItems(event.data.items);
            }

            if (event.event === 'error') {
              toast.error(event.data.message || '会话执行失败');
            }
          },
        },
      );

      await refreshCurrentSession(targetSessionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送消息失败');
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  if (workspaceLoading) {
    return (
      <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          正在加载工作台
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-[calc(100svh-3.75rem)] gap-4 p-4 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6">
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{currentSession?.title ?? '新会话'}</CardTitle>
            </div>
            <Badge variant="outline" className="capitalize">
              {provider}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">供应商</span>
              <NativeSelect
                value={provider}
                onChange={(event) => void handleProviderChange(event.target.value as AgentProvider)}
                className="w-full"
                disabled={loadingModels || sending}
              >
                <NativeSelectOption value="openai">OpenAI</NativeSelectOption>
                <NativeSelectOption value="anthropic">Anthropic</NativeSelectOption>
              </NativeSelect>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">模型</span>
              <NativeSelect
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="w-full"
                disabled={loadingModels || sending || modelOptions.length === 0}
              >
                {modelOptions.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          </div>
        </CardHeader>
        <CardContent className="flex h-full min-h-[32rem] flex-col gap-4 pt-4">
          <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border/70 bg-background/45 p-4">
            {loadingMessages ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                正在加载消息
              </div>
            ) : null}

            {loadingModels ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                正在刷新模型列表
              </div>
            ) : null}

            {messages.map((item) => {
              const isUser = item.role === 'user';

              return (
                <div
                  key={item.id}
                  className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'flex max-w-[min(92%,48rem)] items-end gap-3',
                      isUser ? 'flex-row-reverse' : 'flex-row',
                    )}
                  >
                    <Avatar className="shrink-0">
                      <AvatarFallback
                        className={cn(
                          isUser
                            ? 'bg-primary/12 text-primary'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isUser ? userAvatarFallback : <BotMessageSquareIcon className="size-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={cn(
                        'inline-flex w-fit max-w-full flex-col gap-2 rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm transition-colors',
                        isUser
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border/70 bg-muted/78 text-foreground',
                      )}
                    >
                      {!isUser && item.model ? (
                        <div className="text-[11px] text-muted-foreground">{item.model}</div>
                      ) : null}
                      <div className="whitespace-pre-wrap break-words">
                        {item.content || (sending ? '正在生成回复...' : '')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && !loadingMessages ? (
              <Empty className="border border-dashed border-border/80 bg-background/40">
                <EmptyHeader>
                  <EmptyTitle>开始一次新会话</EmptyTitle>
                  <EmptyDescription>输入问题后即可开始。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
          </div>

          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入你的问题"
              className="min-h-28"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                已纳入 {currentKnowledgeBaseIds.length} 个知识库
              </div>
              <Button type="button" onClick={handleSend} disabled={sending || loadingModels || !model}>
                {sending ? <Spinner className="size-4" /> : <SendHorizonalIcon className="size-4" />}
                发送
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>检索命中</CardTitle>
          <CardDescription>
            最近一次回复引用的资料片段，当前会话共纳入 {currentKnowledgeBaseIds.length} 个来源。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {retrievalItems.map((item) => (
            <div key={item.chunkId} className="rounded-xl border border-border/70 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">{item.documentName}</div>
                <Badge variant="secondary">{item.score.toFixed(1)}</Badge>
              </div>
              <Separator className="my-2" />
              <div className="text-sm leading-6 text-muted-foreground">{item.snippet}</div>
            </div>
          ))}
          {retrievalItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon className="size-4" />
              暂未产生检索结果
            </div>
          ) : null}

          {sessions.length === 0 && activeSessionId === null ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => void createSession()}>
              新建第一个会话
            </Button>
          ) : null}

          {activeSessionId === null && sessions.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/chat/${sessions[0].id}`)}
            >
              打开最近会话
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
