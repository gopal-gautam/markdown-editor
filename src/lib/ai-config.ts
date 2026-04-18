export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'azure' 
  | 'aws' 
  | 'openrouter' 
  | 'lmstudio' 
  | 'ollama';

export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  defaultModels: string[];
  baseUrl?: string;
  supportsCustomEndpoint: boolean;
}

export interface Provider {
  id: string;
  name: string;
  defaultModels: string[];
  baseUrl?: string;
  supportsCustomEndpoint: boolean;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModels: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1',
    supportsCustomEndpoint: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    baseUrl: 'https://api.anthropic.com/v1',
    supportsCustomEndpoint: true,
  },
  {
    id: 'google',
    name: 'Google AI (Gemini)',
    defaultModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsCustomEndpoint: true,
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-35-turbo'],
    supportsCustomEndpoint: true,
  },
  {
    id: 'aws',
    name: 'AWS (Bedrock)',
    defaultModels: ['anthropic.claude-3-5-sonnet-20241022-v1:0', 'anthropic.claude-3-opus-20240229-v1:0', 'amazon.titan-text-express-v1'],
    supportsCustomEndpoint: false,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModels: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5', 'meta-llama-3.1-70b-instruct'],
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsCustomEndpoint: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    defaultModels: [],
    baseUrl: 'http://localhost:1234/v1',
    supportsCustomEndpoint: false,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    defaultModels: [],
    baseUrl: 'http://localhost:11434',
    supportsCustomEndpoint: false,
  },
];

export function getProviderInfo(provider: AIProvider): Provider | undefined {
  return PROVIDERS.find(function(p) { return p.id === provider; });
}

export function getDefaultBaseUrl(provider: AIProvider): string | undefined {
  const info = getProviderInfo(provider);
  return info ? info.baseUrl : undefined;
}

export function validateApiKey(provider: AIProvider, apiKey: string): boolean {
  if (provider === 'lmstudio' || provider === 'ollama') {
    return true;
  }
  return apiKey.trim().length > 0;
}

export function buildHeaders(config: AIModelConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  switch (config.provider) {
    case 'openai':
    case 'openrouter':
    case 'azure':
      headers['Authorization'] = 'Bearer ' + config.apiKey;
      break;
    case 'anthropic':
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'google':
      headers['Authorization'] = 'Bearer ' + config.apiKey;
      break;
    case 'aws':
      break;
  }
  return headers;
}

export function buildChatCompletionBody(provider: AIProvider, model: string, messages: { role: string; content: string }[]): object {
  const baseBody = { model: model, messages: messages };
  switch (provider) {
    case 'anthropic':
      return {
        model: model,
        messages: messages,
        max_tokens: 4096,
      };
    case 'google':
      return {
        contents: messages.map(function(m) { return { role: m.role === 'system' ? 'user' : m.role, parts: [{ text: m.content }] }; }),
      };
    default:
      return baseBody;
  }
}

export function getEndpoint(config: AIModelConfig): string {
  const baseUrl = config.baseUrl || getDefaultBaseUrl(config.provider) || '';
  switch (config.provider) {
    case 'openai':
    case 'openrouter':
    case 'azure':
      return baseUrl + '/chat/completions';
    case 'anthropic':
      return baseUrl + '/messages';
    case 'google':
      return baseUrl + '/models/' + config.model + ':generateContent';
    case 'aws':
      return 'https://bedrock.' + (config.baseUrl || 'us-east-1') + '.amazonaws.com/model/' + config.model + '/invoke';
    case 'lmstudio':
      return baseUrl + '/chat/completions';
    case 'ollama':
      return baseUrl + '/api/chat';
    default:
      return baseUrl + '/chat/completions';
  }
}

export function parseResponse(provider: AIProvider, data: unknown): string {
  try {
    switch (provider) {
      case 'openai':
      case 'openrouter':
      case 'lmstudio':
        return (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content || '';
      case 'anthropic':
        return (data as { content?: { text?: string }[] })?.content?.[0]?.text || '';
      case 'google':
        return (data as { candidates?: { content?: { parts?: { text?: string }[] }[] }[] })?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      case 'ollama':
        return (data as { message?: { content?: string } })?.message?.content || '';
      case 'aws':
        return (data as { body?: string })?.body || '';
      default:
        return '';
    }
  } catch (e) {
    return '';
  }
}