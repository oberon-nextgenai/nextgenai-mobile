import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as agentsService from '@/api/services/agents';
import { QUERY_KEYS } from '@/lib/constants';
import type { Agent } from '@/api/services/types';

type UpdateAgentInput = Partial<Agent> & Record<string, unknown>;

interface MutationArgs {
  orgId: string;
  id: string;
}

export function useCreateAgent(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: agentsService.CreateAgentDto) => agentsService.createAgent(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', orgId] });
      Toast.show({ type: 'success', text1: 'Agent created' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Create failed', text2: String(message) });
    },
  });
}

export function useUpdateAgent({ orgId, id }: MutationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateAgentInput) => agentsService.updateAgent(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.agent(orgId, id) });
      qc.invalidateQueries({ queryKey: ['agents', orgId] });
      Toast.show({ type: 'success', text1: 'Agent updated' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Update failed', text2: String(message) });
    },
  });
}

export function useUpdateAgentTools({ orgId, id }: MutationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabledTools: Record<string, boolean>) =>
      agentsService.updateAgentTools(id, enabledTools),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.agent(orgId, id) });
    },
  });
}

export function useAssignPhoneNumber({ orgId, id }: MutationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phoneNumberId: string) =>
      agentsService.assignPhoneNumber(id, phoneNumberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.agent(orgId, id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.phoneNumbersAvailable(orgId) });
      qc.invalidateQueries({ queryKey: ['agents', orgId] });
      Toast.show({ type: 'success', text1: 'Phone number assigned' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Assign failed', text2: String(message) });
    },
  });
}

export function useUnassignPhoneNumber({ orgId, id }: MutationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsService.unassignPhoneNumber(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.agent(orgId, id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.phoneNumbersAvailable(orgId) });
      qc.invalidateQueries({ queryKey: ['agents', orgId] });
      Toast.show({ type: 'success', text1: 'Phone number unassigned' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Unassign failed', text2: String(message) });
    },
  });
}

export function useDeleteAgent({ orgId, id }: MutationArgs) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsService.softDeleteAgent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents', orgId] });
      qc.removeQueries({ queryKey: QUERY_KEYS.agent(orgId, id) });
      Toast.show({ type: 'success', text1: 'Agent moved to trash' });
    },
    onError: (err) => {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err as Error).message;
      Toast.show({ type: 'error', text1: 'Delete failed', text2: String(message) });
    },
  });
}
