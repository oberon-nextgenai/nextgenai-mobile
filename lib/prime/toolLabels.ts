/**
 * Turns an MCP tool name into the phrase Prime shows while it is working.
 *
 * The deck's tool panel reads as a colleague narrating their own work —
 * "Reading agent logs", "Checking escalation queue" — not as a log of RPC
 * names. That means a name like `get_all_agents_status` has to become a
 * sentence fragment before it ever reaches the screen.
 *
 * Two layers, in order:
 *
 *  1. `LABELS` — an explicit phrase for the tools Prime actually calls. This is
 *     where the copy lives; edit it freely, it is the only place the wording is
 *     decided.
 *  2. `humanise()` — a fallback for anything not in the table. The backend adds
 *     tools faster than this file can track them, and a tool that shipped this
 *     morning must still read as a phrase rather than as `get_foo_bar`. It maps
 *     the leading verb to its gerund ("get" → "Reading") and sentence-cases the
 *     rest.
 *
 * Pure and dependency-free by design — it is the one part of the panel that is
 * worth unit-testing, and `toolLabels.spec.ts` covers both layers.
 */

/**
 * Hand-written copy for the tools Prime reaches for most. Keys are the real MCP
 * tool names (see `oberon-nextgenai-api/src/modules/mcp/mcp.service.ts`).
 */
const LABELS: Record<string, string> = {
  // Fleet / agents
  get_all_agents_status: 'Reading agent logs',
  get_agent_execution_log: 'Reading the execution log',
  get_agent_execution_stats: 'Reading execution stats',
  list_agent_execution_logs: 'Reading agent logs',
  search_agents_by_criteria: 'Searching agents',
  list_agent_roles: 'Listing agent roles',
  create_agent: 'Creating the agent',
  update_agent: 'Updating the agent',
  delete_agent: 'Removing the agent',
  configure_agent_reports: 'Configuring agent reports',

  // Analytics / cost
  get_analytics_dashboard: 'Pulling analytics',
  get_analytics_queue: 'Checking the analytics queue',
  get_call_analytics_summary: 'Pulling call analytics',
  get_conversation_insights: 'Reading conversation insights',
  get_langchain_tool_execution_summary: 'Reviewing tool executions',
  list_langchain_agent_failures: 'Checking agent failures',
  get_task_metrics: 'Reading task metrics',

  // Escalations
  list_escalations: 'Checking escalation queue',
  triage_escalations: 'Triaging escalations',
  approve_human_takeover: 'Approving human takeover',

  // Campaigns
  get_campaign_analytics: 'Reading campaign data',
  get_campaign_queue_status: 'Checking the campaign queue',
  create_new_campaign: 'Creating the campaign',
  update_campaign: 'Updating the campaign',
  schedule_campaign: 'Scheduling the campaign',
  manage_campaign_execution: 'Managing campaign execution',
  assign_agent_to_campaign: 'Assigning an agent to the campaign',

  // Telephony
  list_phone_numbers: 'Checking phone numbers',
  assign_phone_number: 'Assigning a phone number',
  unassign_phone_number: 'Releasing the phone number',
  create_outbound_call: 'Placing an outbound call',

  // Contacts
  create_new_contact: 'Creating the contact',
  modify_contact_attributes: 'Updating contact attributes',
  search_contacts_advanced: 'Searching contacts',
  analyze_contact_segments: 'Analysing contact segments',

  // Knowledge
  search_knowledge_base: 'Searching the knowledge base',
  list_knowledge_bases: 'Listing knowledge bases',
  attach_knowledge_base_to_agent: 'Attaching the knowledge base',

  // Tasks
  list_tasks: 'Reading the task list',
  create_task: 'Creating the task',
  update_task: 'Updating the task',
  update_task_status: 'Updating task status',
  delete_task: 'Deleting the task',
  duplicate_task: 'Duplicating the task',
  add_task_comment: 'Adding a task comment',

  // Plugins / integrations
  list_available_plugins: 'Browsing available plugins',
  list_installed_plugins: 'Checking installed plugins',
  install_plugin: 'Installing the plugin',
  uninstall_plugin: 'Removing the plugin',
  configure_plugin: 'Configuring the plugin',
  assign_plugin_to_agent: 'Attaching the plugin',
  remove_plugin_from_agent: 'Detaching the plugin',
  test_plugin_health: 'Testing plugin health',

  // Workflows
  get_n8n_execution_log: 'Reading the workflow log',
  list_n8n_execution_logs: 'Reading workflow logs',
  list_n8n_workflow_failures: 'Checking workflow failures',

  // Org
  get_team_members: 'Looking up the team',
  list_departments: 'Listing departments',
  update_department: 'Updating the department',
  update_role: 'Updating the role',
  describe_entity: 'Looking up details',
};

/**
 * Leading verbs, mapped to the gerund that opens the phrase. `get_foo_bar`
 * loses its "get" and gains a "Reading" — the verb is replaced, not kept, which
 * is what stops the fallback reading like a function signature.
 */
const VERB_GERUNDS: Record<string, string> = {
  get: 'Reading',
  fetch: 'Reading',
  read: 'Reading',
  load: 'Reading',
  list: 'Listing',
  search: 'Searching',
  find: 'Searching',
  query: 'Searching',
  lookup: 'Looking up',
  describe: 'Looking up',
  check: 'Checking',
  test: 'Testing',
  analyze: 'Analysing',
  analyse: 'Analysing',
  review: 'Reviewing',
  summarize: 'Summarising',
  create: 'Creating',
  add: 'Adding',
  new: 'Creating',
  update: 'Updating',
  modify: 'Updating',
  edit: 'Updating',
  set: 'Updating',
  patch: 'Updating',
  configure: 'Configuring',
  manage: 'Managing',
  schedule: 'Scheduling',
  send: 'Sending',
  run: 'Running',
  execute: 'Running',
  trigger: 'Starting',
  start: 'Starting',
  stop: 'Stopping',
  cancel: 'Cancelling',
  approve: 'Approving',
  reject: 'Rejecting',
  triage: 'Triaging',
  assign: 'Assigning',
  unassign: 'Unassigning',
  attach: 'Attaching',
  detach: 'Detaching',
  install: 'Installing',
  uninstall: 'Removing',
  delete: 'Deleting',
  remove: 'Removing',
  duplicate: 'Duplicating',
};

/** Shown while a tool call's name is still arriving across stream deltas. */
const UNNAMED_LABEL = 'Working';

/**
 * Splits a tool name into lowercase words. Handles `snake_case`, `kebab-case`,
 * plain spaces and `camelCase` — the last because a name that arrives from a
 * non-MCP provider is just as likely to be `getAllAgentsStatus`.
 */
function tokenize(name: string): string[] {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

/** Capitalises the first character and leaves the rest alone. */
function sentenceCase(phrase: string): string {
  if (!phrase) return phrase;
  return phrase[0].toUpperCase() + phrase.slice(1);
}

/**
 * The fallback: strip a recognised leading verb, swap in its gerund, and
 * sentence-case what is left. An unrecognised verb is kept rather than dropped,
 * so `frobnicate_widget_state` still reads as "Frobnicate widget state" instead
 * of losing the only word that said what it did.
 */
function humanise(words: string[]): string {
  const gerund = VERB_GERUNDS[words[0]];
  const rest = gerund ? words.slice(1) : words;

  if (gerund && rest.length === 0) return gerund;
  if (!gerund) return sentenceCase(rest.join(' '));

  return `${gerund} ${rest.join(' ')}`;
}

/**
 * The phrase to show for a tool call, e.g. `get_all_agents_status` →
 * "Reading agent logs". Never returns an empty string: a name that has not
 * finished streaming yet falls back to "Working".
 */
export function toolLabel(name: string | null | undefined): string {
  if (typeof name !== 'string') return UNNAMED_LABEL;

  const trimmed = name.trim();
  if (!trimmed) return UNNAMED_LABEL;

  const exact = LABELS[trimmed.toLowerCase()];
  if (exact) return exact;

  const words = tokenize(trimmed);
  if (words.length === 0) return UNNAMED_LABEL;

  // Already a phrase ("Reading agent logs") and not verb-led — collapse the
  // whitespace and leave the casing alone, so a backend that starts sending
  // prose is not flattened into a fake gerund.
  if (!VERB_GERUNDS[words[0]] && /\s/.test(trimmed) && !/[_-]/.test(trimmed)) {
    return sentenceCase(trimmed.replace(/\s+/g, ' '));
  }

  return humanise(words);
}
