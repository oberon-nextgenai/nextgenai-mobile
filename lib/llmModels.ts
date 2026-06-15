/** LLM models offered by the platform, grouped by provider. Mirrors the web
 *  app's `src/constants/llm-providers.tsx`. */
export interface LlmProviderGroup {
  provider: string;
  models: string[];
}

export const ORG_DEFAULT_LLM = 'gpt-4o-mini';

export const LLM_PROVIDERS: LlmProviderGroup[] = [
  {
    provider: 'OpenAI',
    models: [
      'gpt-5',
      'gpt-5-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
  },
  {
    provider: 'Anthropic',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  {
    provider: 'Google',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    provider: 'Groq',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  },
  {
    provider: 'Mistral',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  },
  {
    provider: 'Perplexity AI',
    models: [
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online',
    ],
  },
  {
    provider: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    provider: 'XAI',
    models: ['grok-beta'],
  },
  {
    provider: 'Cerebras',
    models: ['llama-3.3-70b'],
  },
];
