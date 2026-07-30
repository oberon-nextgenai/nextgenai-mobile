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
    tts: '/api/chat/tts',
    transcribe: '/api/chat/transcribe',
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
    start: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/start`,
    stop: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/stop`,
    mmr: {
      details: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/details`,
      callStatus: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/call-status`,
      emailStatus: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/email-status`,
      resendEmail: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/resend-email`,
      exportXlsx: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/export`,
      clone: (id: string) => `/api/campaigns/${encodeURIComponent(id)}/mmr/clone`,
      cantCollect: (id: string, groupId: string) =>
        `/api/campaigns/${encodeURIComponent(id)}/mmr/contact-groups/${encodeURIComponent(groupId)}/cant-collect`,
      updateContact: (id: string, groupId: string) =>
        `/api/campaigns/${encodeURIComponent(id)}/mmr/contact-groups/${encodeURIComponent(groupId)}/contact`,
      uploads: '/api/campaigns/mmr/uploads',
      upload: (uploadId: string) =>
        `/api/campaigns/mmr/uploads/${encodeURIComponent(uploadId)}`,
      uploadToCampaign: (uploadId: string) =>
        `/api/campaigns/mmr/uploads/${encodeURIComponent(uploadId)}/campaign`,
    },
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
    channelMix: (orgId: string) =>
      `/api/analytics/channel-mix/${encodeURIComponent(orgId)}`,
    ndsBackgroundChecks: (orgId: string) =>
      `/api/agent-analytics/nds-background-checks/${encodeURIComponent(orgId)}`,
    mmrCampaigns: '/api/campaigns',
  },
  briefings: {
    list: (orgId: string) => `/api/briefings/${encodeURIComponent(orgId)}`,
  },
  escalations: {
    list: '/api/escalations',
    counts: '/api/escalations/counts',
    detail: (id: string) => `/api/escalations/${encodeURIComponent(id)}`,
    assign: (id: string) => `/api/escalations/${encodeURIComponent(id)}/assign`,
    approve: (id: string) => `/api/escalations/${encodeURIComponent(id)}/approve`,
    reject: (id: string) => `/api/escalations/${encodeURIComponent(id)}/reject`,
  },
  conversations: {
    /** Requires `organizationId` as a query param; returns an unpaginated array. */
    list: '/api/conversations',
  },
  auditLog: {
    list: '/api/audit-log',
  },
  devices: {
    register: '/api/devices/register',
    list: '/api/devices',
    preferences: '/api/devices/preferences',
    unregister: (token: string) => `/api/devices/${encodeURIComponent(token)}`,
  },
  orgs: {
    list: '/api/orgs',
    departments: (orgId: string) =>
      `/api/orgs/${encodeURIComponent(orgId)}/departments`,
  },
} as const;
