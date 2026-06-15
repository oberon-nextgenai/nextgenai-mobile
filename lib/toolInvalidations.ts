import type { QueryClient } from '@tanstack/react-query';

/**
 * Map a Prime tool name to the React Query keys that should be invalidated
 * after a successful tool execution. Used by the chat hook so newly-created
 * entities (agents, campaigns, etc.) show up immediately on read-only tabs.
 */
const INVALIDATION_MAP: Record<string, (orgId: string) => readonly unknown[][]> = {
  create_agent: (orgId) => [
    ['agents', orgId],
    ['analytics', 'agents', orgId],
    ['analytics', 'dashboard', orgId],
  ],
  update_agent: (orgId) => [
    ['agents', orgId],
    ['analytics', 'agents', orgId],
  ],
  delete_agent: (orgId) => [
    ['agents', orgId],
    ['analytics', 'agents', orgId],
  ],
  configure_agent_reports: (orgId) => [['agents', orgId]],
  assign_phone_number: (orgId) => [
    ['agents', orgId],
    ['phone-numbers', orgId],
  ],
  unassign_phone_number: (orgId) => [
    ['agents', orgId],
    ['phone-numbers', orgId],
  ],
  list_phone_numbers: (orgId) => [['phone-numbers', orgId]],
  create_new_campaign: (orgId) => [['campaigns', orgId]],
  manage_campaign_execution: (orgId) => [['campaigns', orgId]],
  schedule_campaign: (orgId) => [['campaigns', orgId]],
  assign_agent_to_campaign: (orgId) => [
    ['campaigns', orgId],
    ['agents', orgId],
  ],
  create_task: (orgId) => [['tasks', orgId]],
  update_task: (orgId) => [['tasks', orgId]],
  update_task_status: (orgId) => [['tasks', orgId]],
  delete_task: (orgId) => [['tasks', orgId]],
  duplicate_task: (orgId) => [['tasks', orgId]],
  install_plugin: (orgId) => [
    ['plugins', orgId],
    ['integrations', orgId],
  ],
  uninstall_plugin: (orgId) => [
    ['plugins', orgId],
    ['integrations', orgId],
  ],
  attach_knowledge_base_to_agent: (orgId) => [
    ['agents', orgId],
    ['knowledge-bases', orgId],
  ],
};

export function invalidateForTool(
  qc: QueryClient,
  toolName: string,
  orgId: string,
): void {
  const builder = INVALIDATION_MAP[toolName];
  if (!builder) return;
  for (const key of builder(orgId)) {
    qc.invalidateQueries({ queryKey: key });
  }
}
