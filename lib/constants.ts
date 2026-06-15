export const STORAGE_KEYS = {
  jwt: 'oberon.jwt',
  user: 'oberon.user',
  activeOrgId: 'oberon.activeOrgId',
  theme: 'oberon.theme',
  biometricEnabled: 'oberon.biometricEnabled',
} as const;

export const QUERY_KEYS = {
  me: ['auth', 'me'] as const,
  permissions: ['auth', 'permissions'] as const,
  orgs: ['orgs', 'list'] as const,
  agents: (orgId: string, filters?: Record<string, unknown>) =>
    ['agents', orgId, filters ?? {}] as const,
  agent: (orgId: string, id: string) => ['agents', orgId, 'detail', id] as const,
  agentTools: (orgId: string, id: string) =>
    ['agents', orgId, 'detail', id, 'tools'] as const,
  analyticsDashboard: (orgId: string) => ['analytics', 'dashboard', orgId] as const,
  analyticsCalls: (orgId: string, range?: string) =>
    ['analytics', 'calls', orgId, range ?? 'default'] as const,
  analyticsAgents: (orgId: string, range?: string) =>
    ['analytics', 'agents', orgId, range ?? 'default'] as const,
  analyticsAgentDetail: (orgId: string, assistantId: string) =>
    ['analytics', 'agent-detail', orgId, assistantId] as const,
  primeHistory: (orgId: string) => ['prime', 'history', orgId] as const,
  primeTools: (orgId: string) => ['prime', 'tools', orgId] as const,
  pluginsCatalog: (filter?: { category?: string; search?: string }) =>
    ['plugins', 'catalog', filter ?? {}] as const,
  plugin: (type: string) => ['plugins', 'detail', type] as const,
  pluginCategories: ['plugins', 'categories'] as const,
  installedIntegrations: (orgId: string) =>
    ['integrations', orgId] as const,
  integration: (orgId: string, id: string) =>
    ['integrations', orgId, 'detail', id] as const,
  departments: (orgId: string) => ['orgs', orgId, 'departments'] as const,
  phoneNumbersAvailable: (orgId: string) =>
    ['phone-numbers', 'available', orgId] as const,
  knowledgeBases: (orgId: string) => ['knowledge-bases', orgId] as const,
  voices: (orgId: string, filter?: Record<string, unknown>) =>
    ['voices', orgId, filter ?? {}] as const,
  campaigns: (orgId: string) => ['campaigns', orgId] as const,
  campaign: (orgId: string, id: string) =>
    ['campaigns', orgId, 'detail', id] as const,
  twoFactorStatus: ['security', '2fa', 'status'] as const,
} as const;

export const BIOMETRIC_RELOCK_AFTER_MS = 5 * 60 * 1000;
