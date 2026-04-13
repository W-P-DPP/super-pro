import { jest } from '@jest/globals';
import { agentService, AgentBusinessError } from '../../src/agent/agent.service.ts';

jest.mock('../../src/agent/agent.repository.ts', () => ({
  agentRepository: {
    getDefaultAgent: jest.fn(async () => ({
      id: 1,
      code: 'default-agent',
      name: '默认 Agent',
      description: '',
      systemPrompt: '',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
      status: 1,
    })),
    listBindings: jest.fn(),
    replaceBindings: jest.fn(),
  },
}));

jest.mock('../../src/knowledge/knowledge.repository.ts', () => ({
  knowledgeRepository: {
    getKnowledgeBasesByIds: jest.fn(),
  },
}));

describe('agentService.getProviderModels', () => {
  it('returns openai models with default model', async () => {
    const result = await agentService.getProviderModels('openai');

    expect(result.provider).toBe('openai');
    expect(result.defaultModel).toBe('gpt-5');
    expect(result.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'gpt-5', label: 'GPT-5' }),
      ]),
    );
  });

  it('falls back to first model when provider differs from agent default provider', async () => {
    const result = await agentService.getProviderModels('anthropic');

    expect(result.provider).toBe('anthropic');
    expect(result.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(result.models[0]?.value).toBe('claude-sonnet-4-20250514');
  });

  it('rejects unsupported providers', async () => {
    await expect(agentService.getProviderModels('custom')).rejects.toBeInstanceOf(
      AgentBusinessError,
    );
  });
});

describe('agentService.getCurrentUser', () => {
  it('maps current user payload to display info', async () => {
    const result = await agentService.getCurrentUser({
      userId: 7,
      username: 'alice',
    });

    expect(result).toEqual({
      userId: 7,
      username: 'alice',
      displayName: 'alice',
    });
  });
});
