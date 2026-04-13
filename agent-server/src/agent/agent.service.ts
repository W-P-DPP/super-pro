import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { CurrentUserDto } from '../auth/current-user.ts';
import { knowledgeRepository } from '../knowledge/knowledge.repository.ts';
import type {
  AgentBindingDto,
  AgentCurrentUserResponseDto,
  AgentMeResponseDto,
  AgentModelOptionDto,
  AgentProviderModelsResponseDto,
  AgentProvider,
  AgentResponseDto,
} from './agent.dto.ts';
import { agentRepository } from './agent.repository.ts';

export class AgentBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = 'AgentBusinessError';
  }
}

function normalizeAgentResponse(
  agent: Awaited<ReturnType<typeof agentRepository.getDefaultAgent>>,
): AgentResponseDto {
  return {
    id: agent.id,
    code: agent.code,
    name: agent.name,
    description: agent.description,
    defaultProvider: agent.defaultProvider,
    defaultModel: agent.defaultModel,
    systemPrompt: agent.systemPrompt,
  };
}

const PROVIDER_MODELS: Record<AgentProvider, AgentModelOptionDto[]> = {
  openai: [
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
  ],
};

function isAgentProvider(value: string): value is AgentProvider {
  return value === 'openai' || value === 'anthropic';
}

function normalizeCurrentUser(currentUser: CurrentUserDto): AgentCurrentUserResponseDto {
  const username = currentUser.username.trim();

  return {
    userId: currentUser.userId,
    username,
    displayName: username,
  };
}

export class AgentService {
  async getDefaultAgentProfile() {
    return agentRepository.getDefaultAgent();
  }

  async getCurrentUser(currentUser: CurrentUserDto): Promise<AgentCurrentUserResponseDto> {
    return normalizeCurrentUser(currentUser);
  }

  async getAgentMe(ownerUserId: number): Promise<AgentMeResponseDto> {
    const agent = await agentRepository.getDefaultAgent();
    const bindings = await this.listBindings(ownerUserId);

    return {
      agent: normalizeAgentResponse(agent),
      bindings,
    };
  }

  async listBindings(ownerUserId: number): Promise<AgentBindingDto[]> {
    const agent = await agentRepository.getDefaultAgent();
    const bindings = await agentRepository.listBindings(ownerUserId, agent.id);

    if (bindings.length === 0) {
      return [];
    }

    const knowledgeBases = await knowledgeRepository.getKnowledgeBasesByIds(
      ownerUserId,
      bindings.map((item) => item.knowledgeBaseId),
    );
    const knowledgeBaseMap = new Map(knowledgeBases.map((item) => [item.id, item]));

    return bindings
      .map((item) => knowledgeBaseMap.get(item.knowledgeBaseId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        knowledgeBaseId: item.id,
        name: item.name,
      }));
  }

  async updateBindings(ownerUserId: number, knowledgeBaseIds: number[]) {
    const normalizedIds = Array.from(
      new Set(
        knowledgeBaseIds
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    );

    if (normalizedIds.length !== knowledgeBaseIds.length) {
      throw new AgentBusinessError('知识库绑定参数无效');
    }

    const agent = await agentRepository.getDefaultAgent();
    const knowledgeBases = await knowledgeRepository.getKnowledgeBasesByIds(
      ownerUserId,
      normalizedIds,
    );

    if (knowledgeBases.length !== normalizedIds.length) {
      throw new AgentBusinessError('存在不可用的知识库', HttpStatus.NOT_FOUND);
    }

    await agentRepository.replaceBindings(ownerUserId, agent.id, normalizedIds);
    return this.listBindings(ownerUserId);
  }

  async getProviderModels(provider: string): Promise<AgentProviderModelsResponseDto> {
    const normalizedProvider = provider.trim().toLowerCase();
    if (!isAgentProvider(normalizedProvider)) {
      throw new AgentBusinessError('不支持的模型供应商', HttpStatus.NOT_FOUND);
    }

    const agent = await agentRepository.getDefaultAgent();
    const models = PROVIDER_MODELS[normalizedProvider];
    const fallbackModel = models[0]?.value;
    if (!fallbackModel) {
      throw new AgentBusinessError('当前供应商未配置可用模型', HttpStatus.ERROR);
    }

    const defaultModel =
      normalizedProvider === agent.defaultProvider &&
      models.some((item) => item.value === agent.defaultModel)
        ? agent.defaultModel
        : fallbackModel;

    return {
      provider: normalizedProvider,
      defaultModel,
      models,
    };
  }
}

export const agentService = new AgentService();
