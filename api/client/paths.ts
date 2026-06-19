export const PATHS = {
  auth: {
    mobileLogin: '/auth/mobile/login',
    mobileTwoFactorLogin: '/auth/mobile/2fa/login',
    mobileSsoStart: (provider: 'google' | 'microsoft') =>
      `/auth/mobile/sso/${provider}`,
    mobileSsoExchange: '/auth/mobile/sso/exchange',
    mobileSsoApple: '/auth/mobile/sso/apple',
    me: '/auth/me',
    permissions: '/api/auth/permissions',
    logout: '/api/auth/logout',
    forgotPassword: '/auth/password-reset/request',
    resetPassword: '/auth/password-reset/confirm',
  },
  chat: {
    stream: '/api/chat/stream',
    message: '/api/chat/message',
    toolsAvailable: '/api/chat/tools/available',
    history: (orgId: string) =>
      `/api/chat/get-prime-console-messages/${encodeURIComponent(orgId)}`,
    clearHistory: (orgId: string) =>
      `/api/chat/delete-prime-console-messages/${encodeURIComponent(orgId)}`,
    saveMessage: '/api/chat/save-prime-console-message',
  },
  agents: {
    list: '/api/agents',
    detail: (id: string) => `/api/agents/${encodeURIComponent(id)}`,
    updateTools: (id: string) =>
      `/api/agents/${encodeURIComponent(id)}/tools`,
    restoreFromTrash: (id: string) =>
      `/api/agents/trash/${encodeURIComponent(id)}/restore`,
    assignPhoneNumber: (id: string) =>
      `/api/agents/${encodeURIComponent(id)}/assign-phone-number`,
    unassignPhoneNumber: (id: string) =>
      `/api/agents/${encodeURIComponent(id)}/unassign-phone-number`,
  },
  phoneNumbers: {
    available: '/api/phone-numbers/available',
  },
  voices: {
    list: '/api/configurations/voice',
  },
  calls: {
    list: '/api/calllogs',
    detail: (id: string) => `/api/calllogs/${encodeURIComponent(id)}`,
  },
  campaigns: {
    list: '/api/campaigns',
    detail: (id: string) => `/api/campaigns/${encodeURIComponent(id)}`,
  },
  security: {
    twoFactorSetup: '/api/auth/2fa/setup',
    twoFactorVerify: '/api/auth/2fa/verify',
    twoFactorDisable: '/api/auth/2fa/disable',
    twoFactorStatus: '/api/auth/2fa/status',
    passwordChange: '/api/auth/password/change',
  },
  files: {
    upload: '/api/files/upload',
  },
  knowledgeBases: {
    documents: '/api/knowledge-base/documents',
  },
  plugins: {
    catalog: '/api/plugins',
    byType: (type: string) => `/api/plugins/${encodeURIComponent(type)}`,
    categories: '/api/plugins/categories',
  },
  integrations: {
    list: '/api/integrations',
    detail: (id: string) => `/api/integrations/${encodeURIComponent(id)}`,
    test: (id: string) =>
      `/api/integrations/${encodeURIComponent(id)}/test`,
    initialize: (id: string) =>
      `/api/integrations/${encodeURIComponent(id)}/initialize`,
  },
  analytics: {
    dashboard: (orgId: string) =>
      `/api/analytics/dashboard/${encodeURIComponent(orgId)}`,
    calls: (orgId: string) => `/api/analytics/calls/${encodeURIComponent(orgId)}`,
    agents: (orgId: string) => `/api/analytics/agents/${encodeURIComponent(orgId)}`,
    agentDetails: (orgId: string, assistantId: string) =>
      `/api/analytics/agent-details/${encodeURIComponent(orgId)}/${encodeURIComponent(assistantId)}`,
    stream: (orgId: string) => `/api/analytics/stream/${encodeURIComponent(orgId)}`,
    ndsBackgroundChecks: (orgId: string) =>
      `/api/agent-analytics/nds-background-checks/${encodeURIComponent(orgId)}`,
    mmrCampaigns: '/api/campaigns',
  },
  orgs: {
    list: '/api/orgs',
    departments: (orgId: string) =>
      `/api/orgs/${encodeURIComponent(orgId)}/departments`,
  },
} as const;
