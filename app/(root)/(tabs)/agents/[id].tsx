import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionCard } from '@/components/ui/SectionCard';
import { StickyAction } from '@/components/ui/StickyAction';
import { ChipInput } from '@/components/ui/ChipInput';
import { StatusDot } from '@/components/ui/StatusDot';
import { ProviderChip } from '@/components/ui/ProviderChip';
import { useActiveOrg } from '@/store/org';
import {
  useAgent,
  useAgentTools,
  useAvailablePhoneNumbers,
  useKnowledgeBases,
} from '@/api/hooks/agentHooks';
import {
  useUpdateAgent,
  useUpdateAgentTools,
  useDeleteAgent,
  useAssignPhoneNumber,
  useUnassignPhoneNumber,
} from '@/api/hooks/agentMutations';
import { useDepartments } from '@/api/hooks/orgHooks';
import { fmtRelative } from '@/lib/formatters';
import { confirmAction } from '@/lib/confirm';
import { LLM_PROVIDERS, ORG_DEFAULT_LLM } from '@/lib/llmModels';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';
import { VoicePickerSheet } from '@/components/voice/VoicePickerSheet';
import type { Agent, Department, KnowledgeBase, PhoneNumber, Role, VoiceConfig } from '@/api/services/types';

type StatusValue = 'active' | 'paused' | 'inactive';

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
];

interface FormState {
  name: string;
  description: string;
  status: StatusValue;
  systemPrompt: string;
  llmModel: string;
  selectedVoiceId: string;
  selectedVoiceName: string;
  firstMessage: string;
  voicemailMessage: string;
  endCallMessage: string;
  dailyReportsEnabled: boolean;
  reportTime: string;
  reportEmails: string[];
  reportTimezone: string;
  enabledTools: Record<string, boolean>;
  departmentId: string;
  roleId: string;
  knowledgeBaseIds: string[];
  escalationEnabled: boolean;
  managerEmail: string;
  emailSignatureEnabled: boolean;
}

function initialForm(a: Agent): FormState {
  const stat = ((): StatusValue => {
    if (a.status === 'paused') return 'paused';
    if (a.status === 'inactive') return 'inactive';
    return 'active';
  })();
  return {
    name: a.name ?? '',
    description: a.description ?? '',
    status: stat,
    systemPrompt: a.systemPrompt ?? '',
    llmModel: a.llmModel ?? '',
    selectedVoiceId: a.selectedVoiceId ?? '',
    selectedVoiceName: '',
    firstMessage: a.vapiData?.firstMessage ?? '',
    voicemailMessage: a.vapiData?.voicemailMessage ?? '',
    endCallMessage: a.vapiData?.endCallMessage ?? '',
    dailyReportsEnabled: Boolean(a.dailyReportsEnabled),
    reportTime: a.reportTime ?? '',
    reportEmails: a.reportEmails ?? [],
    reportTimezone: a.reportTimezone ?? 'Etc/UTC',
    enabledTools: { ...(a.enabledTools ?? {}) },
    departmentId: a.departmentId ?? '',
    roleId: a.roleId ?? '',
    knowledgeBaseIds: [...(a.knowledgeBaseIds ?? [])],
    escalationEnabled: Boolean(a.escalationConfig?.enabled),
    managerEmail: a.escalationConfig?.managerEmail ?? '',
    emailSignatureEnabled: Boolean(a.emailSignatureConfig?.enabled),
  };
}

function shallowEqual(a: FormState, b: FormState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function deptIdOf(d: Department): string {
  return d._id ?? d.id ?? d.name;
}
function roleIdOf(r: Role): string {
  return r._id ?? r.id ?? r.name;
}

type SheetKind = null | 'department' | 'role' | 'phone' | 'kb' | 'voice' | 'llm';

export default function AgentEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();

  const agent = useAgent(activeOrgId, id);
  const tools = useAgentTools(activeOrgId, id);
  const update = useUpdateAgent({ orgId: activeOrgId ?? '', id: id ?? '' });
  const updateTools = useUpdateAgentTools({ orgId: activeOrgId ?? '', id: id ?? '' });
  const del = useDeleteAgent({ orgId: activeOrgId ?? '', id: id ?? '' });
  const assignPhone = useAssignPhoneNumber({ orgId: activeOrgId ?? '', id: id ?? '' });
  const unassignPhone = useUnassignPhoneNumber({ orgId: activeOrgId ?? '', id: id ?? '' });

  const departments = useDepartments(activeOrgId);
  const phoneNumbers = useAvailablePhoneNumbers(activeOrgId);
  const knowledgeBases = useKnowledgeBases(activeOrgId);

  const [form, setForm] = useState<FormState | null>(null);
  const [pristine, setPristine] = useState<FormState | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [kbSearch, setKbSearch] = useState('');

  useEffect(() => {
    if (agent.data && !form) {
      const seeded = initialForm(agent.data);
      setForm(seeded);
      setPristine(seeded);
    }
  }, [agent.data, form]);

  const isDirty = useMemo(() => {
    if (!form || !pristine) return false;
    return !shallowEqual(form, pristine);
  }, [form, pristine]);

  if (!activeOrgId) {
    return (
      <Screen>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <EmptyState title="Choose an organization" />
      </Screen>
    );
  }

  if (agent.isPending || !form) {
    return (
      <Screen>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <View className="py-12 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (agent.isError) {
    return (
      <Screen>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <ErrorState
          message={(agent.error as Error).message}
          onRetry={() => agent.refetch()}
        />
      </Screen>
    );
  }
  if (!agent.data) {
    return (
      <Screen>
        <AppHeader title="Agent" showBack showOrgPill={false} />
        <EmptyState title="Agent not found" />
      </Screen>
    );
  }

  const a = agent.data;
  const isPhone = a.agentType === 'phone';
  const promptPreview = (form.systemPrompt || '').split('\n').slice(0, 4).join('\n');
  const promptHasMore = (form.systemPrompt || '').split('\n').length > 4;

  const departmentList = departments.data ?? [];
  const selectedDepartment = departmentList.find((d) => deptIdOf(d) === form.departmentId);
  const availableRoles: Role[] = selectedDepartment?.roles ?? [];
  const selectedRole = availableRoles.find((r) => roleIdOf(r) === form.roleId);

  const phoneList = phoneNumbers.data ?? [];
  const currentPhone =
    phoneList.find((p) => p._id === (a.phone_number_id ?? a.phoneNumberId)) ?? null;

  const kbList = knowledgeBases.data ?? [];
  const kbBySelectedId = new Map(
    kbList.filter((k) => form.knowledgeBaseIds.includes(k._id)).map((k) => [k._id, k]),
  );
  const filteredKbList =
    kbSearch.trim().length > 0
      ? kbList.filter((k) =>
          k.name.toLowerCase().includes(kbSearch.trim().toLowerCase()),
        )
      : kbList;

  const handleSave = async () => {
    const updates: Partial<Agent> & Record<string, unknown> = {};
    if (form.name !== pristine?.name) updates.name = form.name;
    if (form.description !== pristine?.description) updates.description = form.description;
    if (form.status !== pristine?.status) updates.status = form.status;
    if (form.systemPrompt !== pristine?.systemPrompt) updates.systemPrompt = form.systemPrompt;
    if (form.llmModel !== pristine?.llmModel) updates.llmModel = form.llmModel;
    if (form.selectedVoiceId !== pristine?.selectedVoiceId)
      updates.selectedVoiceId = form.selectedVoiceId;

    const vapiPatch: Record<string, unknown> = {};
    if (form.firstMessage !== pristine?.firstMessage) vapiPatch.firstMessage = form.firstMessage;
    if (form.voicemailMessage !== pristine?.voicemailMessage)
      vapiPatch.voicemailMessage = form.voicemailMessage;
    if (form.endCallMessage !== pristine?.endCallMessage)
      vapiPatch.endCallMessage = form.endCallMessage;
    if (Object.keys(vapiPatch).length > 0) {
      updates.vapiData = { ...(a.vapiData ?? {}), ...vapiPatch };
    }

    if (form.dailyReportsEnabled !== pristine?.dailyReportsEnabled)
      updates.dailyReportsEnabled = form.dailyReportsEnabled;
    if (form.reportTime !== pristine?.reportTime) updates.reportTime = form.reportTime;
    if (JSON.stringify(form.reportEmails) !== JSON.stringify(pristine?.reportEmails))
      updates.reportEmails = form.reportEmails;
    if (form.reportTimezone !== pristine?.reportTimezone)
      updates.reportTimezone = form.reportTimezone;

    if (form.departmentId !== pristine?.departmentId) updates.departmentId = form.departmentId;
    if (form.roleId !== pristine?.roleId) updates.roleId = form.roleId;

    if (JSON.stringify(form.knowledgeBaseIds) !== JSON.stringify(pristine?.knowledgeBaseIds))
      updates.knowledgeBaseIds = form.knowledgeBaseIds;

    if (
      form.escalationEnabled !== pristine?.escalationEnabled ||
      form.managerEmail !== pristine?.managerEmail
    ) {
      updates.escalationConfig = {
        ...(a.escalationConfig ?? {}),
        enabled: form.escalationEnabled,
        managerEmail: form.escalationEnabled ? form.managerEmail : '',
      };
    }

    if (form.emailSignatureEnabled !== pristine?.emailSignatureEnabled) {
      updates.emailSignatureConfig = {
        ...(a.emailSignatureConfig ?? {}),
        enabled: form.emailSignatureEnabled,
      };
    }

    const toolsChanged =
      JSON.stringify(form.enabledTools) !== JSON.stringify(pristine?.enabledTools);

    try {
      if (Object.keys(updates).length > 0) {
        await update.mutateAsync(updates);
      }
      if (toolsChanged) {
        await updateTools.mutateAsync(form.enabledTools);
      }
      setPristine(form);
    } catch {
      // toasts handled
    }
  };

  const onDelete = () => {
    confirmAction({
      title: 'Move to trash?',
      message:
        'The agent will be deleted but can be restored from the trash within 30 days.',
      confirmLabel: 'Move to trash',
      onConfirm: async () => {
        try {
          await del.mutateAsync();
          router.back();
        } catch {
          // toast handled
        }
      },
    });
  };

  const onAssignPhone = async (phoneNumberId: string) => {
    try {
      await assignPhone.mutateAsync(phoneNumberId);
      setSheet(null);
    } catch {
      // toast handled
    }
  };
  const onUnassignPhone = () => {
    confirmAction({
      title: 'Unassign phone number?',
      message: 'The agent will stop receiving calls on this number.',
      confirmLabel: 'Unassign',
      onConfirm: () => unassignPhone.mutate(),
    });
  };

  const toggleKb = (kbId: string) => {
    const current = form.knowledgeBaseIds;
    const next = current.includes(kbId)
      ? current.filter((x) => x !== kbId)
      : [...current, kbId];
    setForm({ ...form, knowledgeBaseIds: next });
  };

  const availableTools = tools.data ?? [];

  return (
    <Screen avoidKeyboard edges={{ top: true, bottom: false }}>
      <AppHeader title={a.name ?? 'Agent'} showBack showOrgPill={false} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: isDirty ? 100 : 24 }}
      >
        {/* Header */}
        <View className="flex-row items-center mb-5 mt-2">
          <Avatar name={a.name} size={56} />
          <View className="flex-1 ml-3">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-lg"
              style={{ fontFamily: 'Inter_700Bold' }}
              numberOfLines={1}
            >
              {form.name || a.name}
            </Text>
            <View className="flex-row items-center mt-1 gap-2 flex-wrap">
              <ProviderChip provider={a.provider ?? a.agentType} />
              <View className="flex-row items-center">
                <StatusDot status={form.status} />
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest ml-1.5"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  {form.status}
                </Text>
              </View>
              {a.agentType ? (
                <Text
                  className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  · {a.agentType}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Identity */}
        <SectionCard label="Identity">
          <View className="gap-3">
            <Input
              label="Name"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
            <TextArea
              label="Description"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              minLines={2}
            />
            <View className="gap-1.5">
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs tracking-wide"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Status
              </Text>
              <SegmentedControl
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
              />
            </View>
          </View>
        </SectionCard>

        {/* Department + Role */}
        <SectionCard label="Department & role">
          <View className="gap-2.5">
            <PickerRow
              label="Department"
              value={selectedDepartment?.name ?? 'Not assigned'}
              loading={departments.isPending}
              onPress={() => setSheet('department')}
            />
            <PickerRow
              label="Role"
              value={selectedRole?.name ?? (form.departmentId ? 'Select role' : 'Pick a department first')}
              disabled={!form.departmentId || availableRoles.length === 0}
              onPress={() => setSheet('role')}
            />
          </View>
        </SectionCard>

        {/* System prompt — read-only on mobile */}
        <SectionCard label="System prompt">
          {form.systemPrompt ? (
            <View>
              <View className="bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-lg p-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-xs leading-5"
                  style={{ fontFamily: 'Menlo' }}
                  numberOfLines={4}
                >
                  {promptPreview}
                  {promptHasMore ? '\n…' : ''}
                </Text>
              </View>
              <Text
                className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] mt-2"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                Edit the prompt on the web platform
                {a.updatedAt ? ` · last updated ${fmtRelative(a.updatedAt)}` : ''}
              </Text>
            </View>
          ) : (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-sm"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              No system prompt yet. Add one on the web platform.
            </Text>
          )}
        </SectionCard>

        {/* LLM model */}
        <SectionCard label="LLM model">
          <View className="gap-2">
            <PickerRow
              label="Model"
              value={form.llmModel || `Org default (${ORG_DEFAULT_LLM})`}
              onPress={() => setSheet('llm')}
            />
            <Text
              className="text-fg-subtle dark:text-fg-dark-subtle text-[11px]"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Pick a model, or use the organization default.
            </Text>
          </View>
        </SectionCard>

        {/* Phone number (voice only) */}
        {isPhone ? (
          <SectionCard label="Phone number">
            {currentPhone ? (
              <View className="gap-2.5">
                <View className="flex-row items-center justify-between bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-lg px-3 py-3">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_600SemiBold' }}
                    >
                      {currentPhone.number}
                    </Text>
                    {currentPhone.provider ? (
                      <Text
                        className="text-fg-muted dark:text-fg-dark-muted text-[11px] uppercase tracking-widest mt-0.5"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {currentPhone.provider}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="call" size={16} color={colors.accent} />
                </View>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button variant="secondary" fullWidth onPress={() => setSheet('phone')}>
                      Change
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      variant="outline-danger"
                      fullWidth
                      loading={unassignPhone.isPending}
                      onPress={onUnassignPhone}
                    >
                      Unassign
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-2.5">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-sm"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  No phone number assigned. The agent cannot receive inbound calls until you assign one.
                </Text>
                <Button
                  variant="primary"
                  fullWidth
                  loading={phoneNumbers.isPending}
                  onPress={() => setSheet('phone')}
                  leftIcon={<Ionicons name="add" size={15} color="#FFFFFF" />}
                >
                  Assign phone number
                </Button>
              </View>
            )}
          </SectionCard>
        ) : null}

        {/* Voice & model (phone only) */}
        {isPhone ? (
          <SectionCard label="Voice">
            <View className="gap-3">
              <PickerRow
                label="Voice"
                value={
                  form.selectedVoiceName || form.selectedVoiceId || 'No voice selected'
                }
                onPress={() => setSheet('voice')}
              />
              <TextArea
                label="First message"
                description="What the agent says when the call connects."
                value={form.firstMessage}
                minLines={2}
                onChangeText={(v) => setForm({ ...form, firstMessage: v })}
              />
              <TextArea
                label="Voicemail message"
                value={form.voicemailMessage}
                minLines={2}
                onChangeText={(v) => setForm({ ...form, voicemailMessage: v })}
              />
              <TextArea
                label="End-call message"
                value={form.endCallMessage}
                minLines={2}
                onChangeText={(v) => setForm({ ...form, endCallMessage: v })}
              />
            </View>
          </SectionCard>
        ) : null}

        {/* Knowledge bases */}
        <SectionCard label="Knowledge bases">
          <View className="gap-2.5">
            {form.knowledgeBaseIds.length === 0 ? (
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-sm"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                No knowledge bases attached.
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {form.knowledgeBaseIds.map((kbId) => {
                  const kb = kbBySelectedId.get(kbId);
                  return (
                    <View
                      key={kbId}
                      className="flex-row items-center bg-accent-soft dark:bg-accent-soft-dark rounded-full px-3 py-1.5"
                    >
                      <Ionicons name="library-outline" size={12} color={colors.accent} />
                      <Text
                        className="text-accent dark:text-accent-dark text-xs ml-1.5 mr-2"
                        style={{ fontFamily: 'Inter_500Medium' }}
                      >
                        {kb?.name ?? kbId}
                      </Text>
                      <Pressable onPress={() => toggleKb(kbId)}>
                        <Ionicons name="close" size={12} color={colors.accent} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            <Button
              variant="secondary"
              fullWidth
              loading={knowledgeBases.isPending}
              onPress={() => setSheet('kb')}
              leftIcon={<Ionicons name="library-outline" size={15} color={colors.fg} />}
            >
              Manage knowledge bases
            </Button>
          </View>
        </SectionCard>

        {/* Manager escalation */}
        <SectionCard label="Manager escalation">
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Escalate to manager
                </Text>
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  When the agent can't resolve, hand off the conversation.
                </Text>
              </View>
              <Switch
                value={form.escalationEnabled}
                onValueChange={(v) => setForm({ ...form, escalationEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
            {form.escalationEnabled ? (
              <Input
                label="Manager email"
                value={form.managerEmail}
                placeholder="manager@nextgen.ai"
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(v) => setForm({ ...form, managerEmail: v })}
              />
            ) : null}
          </View>
        </SectionCard>

        {/* Email signature */}
        <SectionCard label="Email signature">
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Append signature
                </Text>
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  Adds the agent's signature to outbound emails.
                </Text>
              </View>
              <Switch
                value={form.emailSignatureEnabled}
                onValueChange={(v) => setForm({ ...form, emailSignatureEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
            <Text
              className="text-fg-subtle dark:text-fg-dark-subtle text-[11px]"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Signature content is edited on the web.
            </Text>
          </View>
        </SectionCard>

        {/* Daily reports */}
        <SectionCard label="Daily reports">
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Enable daily reports
                </Text>
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  Sends a summary email at the chosen time.
                </Text>
              </View>
              <Switch
                value={form.dailyReportsEnabled}
                onValueChange={(v) => setForm({ ...form, dailyReportsEnabled: v })}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
            {form.dailyReportsEnabled ? (
              <>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Input
                      label="Time (HH:MM)"
                      value={form.reportTime}
                      placeholder="09:00"
                      keyboardType="numbers-and-punctuation"
                      onChangeText={(v) => setForm({ ...form, reportTime: v })}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      label="Timezone"
                      value={form.reportTimezone}
                      autoCapitalize="none"
                      onChangeText={(v) => setForm({ ...form, reportTimezone: v })}
                    />
                  </View>
                </View>
                <ChipInput
                  label="Recipients"
                  description="Press enter or comma to add an email."
                  values={form.reportEmails}
                  onChange={(v) => setForm({ ...form, reportEmails: v })}
                  placeholder="ops@nextgen.ai"
                  validate={(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
                />
              </>
            ) : null}
          </View>
        </SectionCard>

        {/* Tools — only those sourced from installed integrations/plugins */}
        <SectionCard label="Tools" dense>
          {tools.isPending ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-sm px-2 py-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              Loading tools…
            </Text>
          ) : availableTools.length === 0 ? (
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-sm px-2 py-2"
              style={{ fontFamily: 'Inter_400Regular' }}
            >
              No tools available. Install and assign a plugin/integration to give this agent runtime capabilities.
            </Text>
          ) : (
            availableTools.map((t) => (
              <View
                key={t.id}
                className="flex-row items-center justify-between py-2.5 border-b border-border-subtle dark:border-border-dark-subtle last:border-b-0"
              >
                <View className="flex-1 pr-3">
                  <Text
                    className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                    style={{ fontFamily: 'Inter_500Medium' }}
                  >
                    {t.name}
                  </Text>
                  {t.description ? (
                    <Text
                      className="text-fg-muted dark:text-fg-dark-muted text-xs mt-0.5"
                      style={{ fontFamily: 'Inter_400Regular' }}
                      numberOfLines={2}
                    >
                      {t.description}
                    </Text>
                  ) : null}
                </View>
                <Switch
                  value={form.enabledTools[t.id] !== false}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      enabledTools: { ...form.enabledTools, [t.id]: v },
                    })
                  }
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>
            ))
          )}
        </SectionCard>

        {/* Danger zone */}
        <SectionCard label="Danger zone">
          <Button
            variant="outline-danger"
            fullWidth
            loading={del.isPending}
            onPress={onDelete}
            leftIcon={<Ionicons name="trash-outline" size={15} color={colors.danger} />}
          >
            Move to trash
          </Button>
          <Text
            className="text-fg-subtle dark:text-fg-dark-subtle text-xs mt-2"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            Can be restored from trash within 30 days.
          </Text>
        </SectionCard>
      </ScrollView>

      <StickyAction
        visible={isDirty}
        saving={update.isPending || updateTools.isPending}
        onCancel={() => setForm(pristine)}
        onSave={handleSave}
      />

      {/* Department sheet */}
      {sheet === 'department' ? (
        <PickerSheet title="Pick a department" onClose={() => setSheet(null)}>
          {departmentList.length === 0 ? (
            <SheetEmpty text="No departments configured." />
          ) : (
            <>
              <SheetRow
                label="No department"
                selected={!form.departmentId}
                onPress={() => {
                  setForm({ ...form, departmentId: '', roleId: '' });
                  setSheet(null);
                }}
              />
              {departmentList.map((d) => (
                <SheetRow
                  key={deptIdOf(d)}
                  label={d.name}
                  subtitle={
                    d.roles && d.roles.length > 0
                      ? `${d.roles.length} role${d.roles.length === 1 ? '' : 's'}`
                      : undefined
                  }
                  selected={form.departmentId === deptIdOf(d)}
                  onPress={() => {
                    setForm({ ...form, departmentId: deptIdOf(d), roleId: '' });
                    setSheet(null);
                  }}
                />
              ))}
            </>
          )}
        </PickerSheet>
      ) : null}

      {/* Role sheet */}
      {sheet === 'role' ? (
        <PickerSheet title="Pick a role" onClose={() => setSheet(null)}>
          {availableRoles.length === 0 ? (
            <SheetEmpty text="This department has no roles." />
          ) : (
            <>
              <SheetRow
                label="No role"
                selected={!form.roleId}
                onPress={() => {
                  setForm({ ...form, roleId: '' });
                  setSheet(null);
                }}
              />
              {availableRoles.map((r) => (
                <SheetRow
                  key={roleIdOf(r)}
                  label={r.name}
                  selected={form.roleId === roleIdOf(r)}
                  onPress={() => {
                    setForm({ ...form, roleId: roleIdOf(r) });
                    setSheet(null);
                  }}
                />
              ))}
            </>
          )}
        </PickerSheet>
      ) : null}

      {/* Phone number sheet */}
      {sheet === 'phone' ? (
        <PickerSheet title="Assign phone number" onClose={() => setSheet(null)}>
          {phoneList.length === 0 ? (
            <SheetEmpty text="No available phone numbers. Provision one on the web." />
          ) : (
            phoneList.map((p) => {
              const isCurrent = currentPhone?._id === p._id;
              return (
                <SheetRow
                  key={p._id}
                  label={p.number}
                  subtitle={[p.provider, p.status].filter(Boolean).join(' · ') || undefined}
                  selected={isCurrent}
                  disabled={assignPhone.isPending}
                  onPress={() => onAssignPhone(p._id)}
                />
              );
            })
          )}
        </PickerSheet>
      ) : null}

      {/* Voice picker sheet */}
      {sheet === 'voice' ? (
        <VoicePickerSheet
          orgId={activeOrgId}
          selectedVoiceId={form.selectedVoiceId}
          onPick={(v: VoiceConfig) => {
            setForm({
              ...form,
              selectedVoiceId: v.voiceId,
              selectedVoiceName: v.name,
            });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {/* LLM model sheet */}
      {sheet === 'llm' ? (
        <PickerSheet title="Choose a model" onClose={() => setSheet(null)}>
          <SheetRow
            label={`Org default (${ORG_DEFAULT_LLM})`}
            subtitle="Use the organization default"
            selected={!form.llmModel}
            onPress={() => {
              setForm({ ...form, llmModel: '' });
              setSheet(null);
            }}
          />
          {LLM_PROVIDERS.map((group) => (
            <View key={group.provider}>
              <Text
                className="text-fg-subtle dark:text-fg-dark-subtle text-[10px] uppercase tracking-widest mt-3 mb-1.5 px-1"
                style={{ fontFamily: 'Inter_600SemiBold' }}
              >
                {group.provider}
              </Text>
              {group.models.map((model) => (
                <SheetRow
                  key={model}
                  label={model}
                  selected={form.llmModel === model}
                  onPress={() => {
                    setForm({ ...form, llmModel: model });
                    setSheet(null);
                  }}
                />
              ))}
            </View>
          ))}
        </PickerSheet>
      ) : null}

      {/* Knowledge base sheet (multi-select) */}
      {sheet === 'kb' ? (
        <PickerSheet title="Knowledge bases" onClose={() => setSheet(null)}>
          <View className="mb-2">
            <Input
              value={kbSearch}
              onChangeText={setKbSearch}
              placeholder="Search…"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="search" size={16} color={colors.fgMuted} />}
            />
          </View>
          {filteredKbList.length === 0 ? (
            <SheetEmpty text={kbList.length === 0 ? 'No knowledge bases.' : 'No matches.'} />
          ) : (
            filteredKbList.map((kb: KnowledgeBase) => {
              const selected = form.knowledgeBaseIds.includes(kb._id);
              return (
                <Pressable
                  key={kb._id}
                  onPress={() => toggleKb(kb._id)}
                  className={cn(
                    'flex-row items-center px-3 py-3 rounded-lg mb-1',
                    selected
                      ? 'bg-accent-soft dark:bg-accent-soft-dark'
                      : 'bg-surface-2 dark:bg-surface-2-dark',
                  )}
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_500Medium' }}
                      numberOfLines={1}
                    >
                      {kb.name}
                    </Text>
                    {kb.type || kb.status ? (
                      <Text
                        className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
                        style={{ fontFamily: 'Inter_400Regular' }}
                      >
                        {[kb.type, kb.status].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={selected ? colors.accent : colors.fgSubtle}
                  />
                </Pressable>
              );
            })
          )}
          <View className="mt-2">
            <Button variant="primary" fullWidth onPress={() => setSheet(null)}>
              Done
            </Button>
          </View>
        </PickerSheet>
      ) : null}
    </Screen>
  );
}

interface PickerRowProps {
  label: string;
  value: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}
function PickerRow({ label, value, loading, disabled, onPress }: PickerRowProps) {
  const { colors } = useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-lg px-3 py-3',
        disabled ? 'opacity-50' : 'active:opacity-80',
      )}
    >
      <View className="flex-1">
        <Text
          className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          {label}
        </Text>
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-sm mt-0.5"
          style={{ fontFamily: 'Inter_500Medium' }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.fgSubtle} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
      )}
    </Pressable>
  );
}

interface PickerSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}
function PickerSheet({ title, onClose, children }: PickerSheetProps) {
  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
    >
      <Pressable className="bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark rounded-t-3xl p-5 max-h-[80%]">
        <View className="flex-row items-center justify-between mb-3">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-base"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={20} color="#94A3B8" />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </Pressable>
    </Pressable>
  );
}

interface SheetRowProps {
  label: string;
  subtitle?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}
function SheetRow({ label, subtitle, selected, disabled, onPress }: SheetRowProps) {
  const { colors } = useThemeMode();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'flex-row items-center justify-between px-3 py-3 rounded-lg mb-1',
        selected
          ? 'bg-accent-soft dark:bg-accent-soft-dark'
          : 'bg-surface-2 dark:bg-surface-2-dark',
        disabled ? 'opacity-50' : null,
      )}
    >
      <View className="flex-1 pr-3">
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-sm"
          style={{ fontFamily: 'Inter_500Medium' }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
            style={{ fontFamily: 'Inter_400Regular' }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
    </Pressable>
  );
}

function SheetEmpty({ text }: { text: string }) {
  return (
    <View className="py-6 items-center">
      <Text
        className="text-fg-muted dark:text-fg-dark-muted text-sm"
        style={{ fontFamily: 'Inter_400Regular' }}
      >
        {text}
      </Text>
    </View>
  );
}
