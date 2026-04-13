import { jest } from '@jest/globals';
import { agentService } from '../../src/agent/agent.service.ts';
import { chatRepository } from '../../src/chat/chat.repository.ts';
import { ChatBusinessError, chatService } from '../../src/chat/chat.service.ts';
import { knowledgeService } from '../../src/knowledge/knowledge.service.ts';

async function collectEvents<T>(iterator: AsyncGenerator<T>) {
  const events: T[] = [];
  for await (const event of iterator) {
    events.push(event);
  }
  return events;
}

describe('chatService session identifiers', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('maps session responses to uuid identifiers', async () => {
    jest.spyOn(chatRepository, 'listSessions').mockResolvedValue([
      {
        id: 1,
        sessionId: 'uuid-session-1',
        ownerUserId: 7,
        title: 'session-title',
        lastMessageAt: new Date('2026-04-13T08:00:00.000Z'),
        createTime: new Date('2026-04-13T07:00:00.000Z'),
      } as never,
    ]);

    const result = await chatService.getSessions(7);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'uuid-session-1',
        title: 'session-title',
      }),
    ]);
  });

  it('rejects message query when session does not exist', async () => {
    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue(null);

    await expect(chatService.getMessages(7, 'uuid-missing')).rejects.toEqual(
      expect.objectContaining({
        name: ChatBusinessError.name,
        statusCode: 404,
      }),
    );
  });

  it('deletes session by uuid identifier', async () => {
    const deleteSpy = jest.spyOn(chatRepository, 'deleteSession').mockResolvedValue({
      id: 2,
      sessionId: 'uuid-delete-1',
      ownerUserId: 7,
      title: 'to-delete',
    } as never);

    const result = await chatService.deleteSession(7, 'uuid-delete-1');

    expect(deleteSpy).toHaveBeenCalledWith(7, 'uuid-delete-1');
    expect(result).toEqual({ id: 'uuid-delete-1' });
  });

  it('streams replies with uuid session identifiers', async () => {
    const createRunSpy = jest.spyOn(chatRepository, 'createRun').mockResolvedValue({ id: 99 } as never);

    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-stream-1',
      ownerUserId: 7,
      title: 'new-session',
    } as never);
    jest.spyOn(agentService, 'getDefaultAgentProfile').mockResolvedValue({
      id: 3,
      systemPrompt: 'system',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
    } as never);
    jest.spyOn(agentService, 'listBindings').mockResolvedValue([]);
    jest.spyOn(knowledgeService, 'searchAcrossKnowledgeBases').mockResolvedValue([]);
    jest.spyOn(chatRepository, 'updateSessionActivity').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-stream-1',
    } as never);
    jest
      .spyOn(chatRepository, 'createMessage')
      .mockResolvedValueOnce({ id: 101 } as never)
      .mockResolvedValueOnce({
        id: 102,
        content: 'hello world',
      } as never);
    jest.spyOn(chatRepository, 'listMessages').mockResolvedValue([
      {
        id: 101,
        role: 'user',
        content: 'hello',
        provider: '',
        model: '',
        createTime: new Date('2026-04-13T08:00:00.000Z'),
      } as never,
    ]);
    jest.spyOn(chatRepository, 'completeRun').mockResolvedValue({ durationMs: 25 } as never);

    const events = await collectEvents(
      chatService.streamSessionReply(
        { userId: 7, username: 'alice' },
        'uuid-stream-1',
        {
          message: 'hello',
          knowledgeBaseIds: [],
          provider: 'openai',
          model: 'gpt-5',
        },
      ),
    );

    expect(createRunSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'uuid-stream-1',
      }),
    );
    expect(events[0]).toMatchObject({
      event: 'run-start',
      data: expect.objectContaining({
        sessionId: 'uuid-stream-1',
      }),
    });
    expect(events.at(-1)).toMatchObject({
      event: 'run-complete',
      data: expect.objectContaining({
        status: 'success',
      }),
    });
  });
});
