export interface PublicUser {
  _id?: string;
  id?: string;
  userId?: string;
  email: string;
  /** Backend serializes the full name in `name`; first/last kept for forward compat. */
  name?: string;
  firstName?: string;
  lastName?: string;
  role: 'superadmin' | 'org_admin' | 'user' | string;
  organizationId?: string;
  organizationIds?: string[];
  departmentId?: string;
  profileImage?: string;
  phone?: string;
  twoFactorEnabled?: boolean;
  status?: 'active' | 'inactive' | string;
  emailVerified?: boolean;
  lastLogin?: string;
  lastActive?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token?: string;
  user: PublicUser;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface TwoFactorLoginRequest {
  tempToken: string;
  code: string;
}

export interface Organization {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  logoUrl?: string;
}

export interface Permissions {
  canSelectDepartment: boolean;
  role: string;
  isAdmin: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Agent {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'paused' | 'training' | string;
  type?: 'phone' | 'text' | 'external' | string;
  agentType?: string;
  provider?: 'vapi' | 'retell' | 'elevenlabs' | string;
  organizationId?: string;
  vapiAgentId?: string;
  retellAgentId?: string;
  systemPrompt?: string;
  llmModel?: string;
  voiceProvider?: string;
  voiceModelId?: string;
  selectedVoiceId?: string;
  vapiData?: {
    firstMessage?: string;
    voicemailMessage?: string;
    endCallMessage?: string;
    forwardingNumber?: string;
    [k: string]: unknown;
  };
  elevenlabsConfig?: Record<string, unknown>;
  retellConfig?: Record<string, unknown>;
  enabledTools?: Record<string, boolean>;
  knowledgeBaseIds?: string[];
  fileIds?: string[];
  departmentId?: string;
  roleId?: string;
  phone_number_id?: string;
  phoneNumberId?: string;
  escalationConfig?: {
    enabled?: boolean;
    managerEmail?: string;
    postEscalationAutoReply?: string;
  };
  emailSignatureConfig?: {
    enabled?: boolean;
    signatureHtml?: string;
  };
  dailyReportsEnabled?: boolean;
  reportTime?: string;
  reportEmails?: string[];
  reportTimezone?: string;
  configuration?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  lastCallAt?: string;
  successRate?: number;
}

export interface Role {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
}

export interface Department {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  roles?: Role[];
}

export interface PhoneNumber {
  _id: string;
  number: string;
  provider?: string;
  status?: string;
  name?: string;
  assigned_agents?: string[];
  assignedAgents?: string[];
  organizationId?: string;
}

export interface VoiceConfig {
  _id: string;
  voiceId: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral' | string;
  age?: 'young' | 'middle_aged' | 'old' | string;
  languages?: string[];
  description?: string;
  active?: boolean;
  avatarUrl?: string;
  sampleAudioUrl?: string;
  sampleText?: string;
  provider?: { providerName: string; model: string };
  organizationId?: string;
}

export interface KnowledgeBase {
  _id: string;
  knowledgeBaseId?: string;
  name: string;
  status?: string;
  size?: number;
  type?: string;
  tags?: string[];
  organizationId?: string;
}

export type PluginAuthType = 'oauth2' | 'api_key' | 'none' | string;

export interface PluginConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea';
  label: string;
  description?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  default?: unknown;
}

export interface Plugin {
  type: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  icon?: string;
  tags?: string[];
  authType?: PluginAuthType;
  oauthScopes?: string[];
  configSchema?: Record<string, PluginConfigField>;
  requiresAgentAssignment?: boolean;
  capabilities?: string[];
}

export interface PluginCategory {
  id?: string;
  name: string;
  count?: number;
}

export type IntegrationStatus =
  | 'active'
  | 'error'
  | 'authentication_required'
  | 'disabled'
  | 'pending_setup'
  | string;

export interface Integration {
  _id: string;
  organization_id: string;
  type: string;
  name: string;
  status: IntegrationStatus;
  agent_ids?: string[];
  configuration?: Record<string, unknown>;
  health_status?: 'healthy' | 'unhealthy' | 'unknown' | string;
  metadata?: {
    last_sync?: string;
    error_count?: number;
    last_error?: string;
    [k: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIntegrationDto {
  type: string;
  name: string;
  config?: Record<string, unknown>;
  assignedAgents?: string[];
}

export interface UpdateIntegrationDto {
  name?: string;
  configuration?: Record<string, unknown>;
  agent_ids?: string[];
}

// ─── Plugin-aware analytics (NDS / MMR) ─────────────────────────────────────
// Shapes mirrored from oberon-nextgenai-app/src/types/nds-analytics.types.ts.

export type NdsPeriod = '7d' | '30d' | '90d';

export interface NdsActionKpiItem {
  /** Current value (e.g. 17 active cases; 0–100 for percent KPIs like workflowHealth). */
  value: number;
  /** % change vs prior period. `null` when there is no prior data to compare. */
  trend: number | null;
}

export interface NdsActionKpis {
  activeCases?: NdsActionKpiItem;
  needsManagerAction?: NdsActionKpiItem;
  needsCandidateAction?: NdsActionKpiItem;
  slaRiskToday?: NdsActionKpiItem;
  approvalsToday?: NdsActionKpiItem;
  denialsToday?: NdsActionKpiItem;
  workflowHealth?: NdsActionKpiItem;
}

export interface NdsVolumeTrendPoint {
  date: string;
  ordered: number;
  invited?: number;
  completed: number;
  approved: number;
  denied: number;
}

export interface NdsPipelineFunnel {
  totalOrdered?: number;
  invited?: number;
  completed?: number;
  approved?: number;
  denied?: number;
  canceled?: number;
  expiredInvites?: number;
}

export interface NdsQueueRow {
  candidateId?: string;
  name?: string;
  status?: string;
  daysInQueue?: number;
  [k: string]: unknown;
}

export interface NdsQueueSummary {
  name: string;
  label: string;
  count: number;
  rows?: NdsQueueRow[];
}

export interface NdsManagerPerformanceRow {
  managerId?: string;
  /** Manager display name (backend key: `fullName`). */
  fullName?: string;
  active?: boolean;
  totalChecks?: number;
  approved?: number;
  denied?: number;
  pending?: number;
  /** Approval rate as a percentage (e.g. 100 for 100%). */
  approvalRate?: number | null;
  /** Average turnaround time in days. `null` when no completed checks. */
  avgTatDays?: number | null;
  notificationCount?: number;
  uniqueCandidates?: number;
}

export interface NdsTurnaroundTime {
  percentiles?: {
    p50?: number;
    p75?: number;
    p90?: number;
    p95?: number;
  };
  min?: number;
  max?: number;
  avg?: number;
  total?: number;
}

export interface NdsIntegrationHealth {
  webhooks?: {
    processed?: number;
    unprocessed?: number;
    lastReceivedAt?: string;
  };
  notifications?: Array<{
    type?: string;
    successCount?: number;
    failureCount?: number;
  }>;
}

export interface NdsCoverageEntry {
  key: string;
  label?: string;
  count?: number;
  match?: number;
  mismatch?: number;
}

export interface NdsCoverage {
  byManager?: NdsCoverageEntry[];
  byLocation?: NdsCoverageEntry[];
}

export interface NdsDocumentsBucket {
  status: string;
  count: number;
}

export interface NdsDocuments {
  byStatus?: NdsDocumentsBucket[];
  total?: number;
}

export interface NdsDataQuality {
  totalIssues?: number;
  totalCandidates?: number;
  byType?: Array<{ type: string; count: number }>;
}

export interface NdsDashboardData {
  actionKpis?: NdsActionKpis;
  queues?: NdsQueueSummary[];
  volumeTrends?: NdsVolumeTrendPoint[];
  pipeline?: NdsPipelineFunnel;
  managerPerformance?: NdsManagerPerformanceRow[];
  turnaroundTime?: NdsTurnaroundTime;
  integrations?: NdsIntegrationHealth;
  coverage?: NdsCoverage;
  documents?: NdsDocuments;
  dataQuality?: NdsDataQuality;
  [k: string]: unknown;
}

export interface MmrCampaign {
  _id: string;
  name?: string;
  status?: 'active' | 'completed' | 'failed' | 'draft' | string;
  type?: string;
  deviceCount?: number;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    totalContacts?: number;
    completed?: number;
    pending?: number;
    failed?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  messages: ChatMessageDto[];
  organizationId: string;
  agentId?: string;
  useTools?: boolean;
  mode?: 'console' | 'helpdesk';
}

export interface ToolAvailable {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface StoredPrimeMessage {
  _id?: string;
  id?: string;
  organizationId: string;
  userId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  format?: 'text' | 'structured';
  toolCalls?: Array<{ toolName: string; arguments?: unknown; result?: unknown }>;
  timestamp?: string;
  createdAt?: string;
}

/** Sentiment tally returned by the dashboard (Retell call_analysis). */
export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  unknown: number;
}

export interface AnalyticsMetric {
  totalCalls?: number;
  successfulCalls?: number;
  failedCalls?: number;
  callSuccessRate?: number;
  averageCallDurationMinutes?: number;
  averageResponseTimeSeconds?: number;
  activeAgents?: number;
  agentUtilizationPercent?: number;
  totalCost?: number;
  liveActiveSessions?: number;
  /** Eval metrics (Retell call_analysis) — present when calls have evaluations. */
  evaluatedCalls?: number;
  evalSuccessfulCalls?: number;
  evalSuccessRate?: number;
  sentimentBreakdown?: SentimentBreakdown;
}

// Structured dashboard charts — mirrors the backend `RetellDashboardData.charts`
// (oberon-nextgenai-api/src/modules/analytics/types/retell-analytics.types.ts).
export interface DashboardBarDatum {
  name: string;
  calls: number;
  successfulCalls?: number;
  failedCalls?: number;
  averageDurationMinutes?: number;
  totalCost?: number;
}
export interface DashboardPieDatum {
  name: string;
  value: number;
  assistantId: string;
  color?: string;
}
export interface DashboardLineDatum {
  name: string;
  calls: number;
  successRate?: number;
}
export interface DashboardSentimentDatum {
  name: string;
  value: number;
  color?: string;
}
export interface DashboardCharts {
  barData: DashboardBarDatum[];
  pieData: DashboardPieDatum[];
  lineData: DashboardLineDatum[];
  sentimentData: DashboardSentimentDatum[];
}

export interface AnalyticsDashboard {
  metrics: AnalyticsMetric;
  charts?: DashboardCharts;
}

/**
 * A single call from `/api/analytics/calls/:orgId`. Mirrors the backend
 * `RetellCallListItem`. `startedAt`/`endedAt` arrive as ISO strings over HTTP.
 */
export interface AnalyticsCallSummary {
  id: string;
  retellCallId?: string;
  agentId?: string;
  agentName?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  /** Seconds. */
  durationSec?: number;
  cost?: number;
  disconnectionReason?: string;
  recordingUrl?: string;
  transcript?: string;
  customerNumber?: string;
  /** Retell eval (`call_analysis`) success evaluation. */
  evalSuccessful?: boolean;
  sentiment?: string;
  summary?: string;
}

/** Mirrors the backend `RetellAgentMetricRow` from `/api/analytics/agents/:orgId`. */
export interface AnalyticsAgentRow {
  agentId: string;
  agentName?: string;
  totalCalls?: number;
  successfulCalls?: number;
  /** Already a percentage value (e.g. 61.1). */
  successRate?: number;
  /** Minutes. */
  averageDurationMinutes?: number;
  totalCost?: number;
}

/** Flat shape returned by `/api/analytics/agent-details/:orgId/:assistantId`. */
export interface AgentDetails {
  agentName?: string;
  totalCalls?: number;
  successfulCalls?: number;
  /** Already a percentage value. */
  successRate?: number;
  /** Minutes (not seconds — different unit than `AnalyticsAgentRow.averageCallDuration`). */
  averageDurationMinutes?: number;
  totalCost?: number;
}
