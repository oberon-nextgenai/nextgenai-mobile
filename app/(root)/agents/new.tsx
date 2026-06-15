import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useActiveOrg } from '@/store/org';
import { useDepartments } from '@/api/hooks/orgHooks';
import { useCreateAgent } from '@/api/hooks/agentMutations';
import { useThemeMode } from '@/hooks/useThemeMode';
import { cn } from '@/lib/cn';
import type { Department, Role } from '@/api/services/types';

const ORG_DEFAULT_LLM = 'gpt-4o-mini';

type AgentTypeValue = 'text' | 'phone';
type Sheet = null | 'department' | 'role';

function deptIdOf(d: Department): string {
  return d._id ?? d.id ?? d.name;
}
function roleIdOf(r: Role): string {
  return r._id ?? r.id ?? r.name;
}

export default function NewAgentScreen() {
  const router = useRouter();
  const { activeOrgId } = useActiveOrg();
  const { colors } = useThemeMode();
  const create = useCreateAgent(activeOrgId ?? '');
  const departments = useDepartments(activeOrgId);

  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState<AgentTypeValue>('text');
  const [description, setDescription] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);

  const departmentList = departments.data ?? [];
  const selectedDepartment = departmentList.find((d) => deptIdOf(d) === departmentId);
  const availableRoles: Role[] = selectedDepartment?.roles ?? [];
  const selectedRole = availableRoles.find((r) => roleIdOf(r) === roleId);

  const canSubmit = name.trim().length > 0 && Boolean(activeOrgId);

  const onSubmit = async () => {
    if (!canSubmit || !activeOrgId) return;
    try {
      const agent = await create.mutateAsync({
        name: name.trim(),
        organizationId: activeOrgId,
        agentType,
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        llmModel: llmModel.trim() || undefined,
        departmentId: departmentId || undefined,
        roleId: roleId || undefined,
      });
      const newId = agent._id ?? agent.id;
      if (newId) {
        router.replace(`/(root)/(tabs)/agents/${newId}` as never);
      } else {
        router.back();
      }
    } catch {
      // toast handled
    }
  };

  return (
    <Screen avoidKeyboard>
      <View className="flex-row items-center justify-between px-4 py-3 bg-bg dark:bg-bg-dark">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-sm"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            Cancel
          </Text>
        </Pressable>
        <Text
          className="text-fg dark:text-fg-dark-DEFAULT text-base"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          New agent
        </Text>
        <Pressable onPress={onSubmit} disabled={!canSubmit || create.isPending} hitSlop={8}>
          <Text
            className={cn(
              'text-sm',
              canSubmit ? 'text-accent dark:text-accent-dark' : 'text-fg-subtle',
            )}
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {create.isPending ? 'Creating…' : 'Create'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <SectionCard label="Identity">
          <View className="gap-3">
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Inbound support"
            />
            <View className="gap-1.5">
              <Text
                className="text-fg-muted dark:text-fg-dark-muted text-xs tracking-wide"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Type
              </Text>
              <SegmentedControl
                options={[
                  { value: 'text', label: 'Text' },
                  { value: 'phone', label: 'Voice' },
                ]}
                value={agentType}
                onChange={setAgentType}
              />
            </View>
            <TextArea
              label="Description"
              value={description}
              onChangeText={setDescription}
              minLines={2}
              placeholder="What does this agent do?"
            />
          </View>
        </SectionCard>

        <SectionCard label="Department & role">
          <View className="gap-2.5">
            <Pressable
              onPress={() => setSheet('department')}
              className="flex-row items-center bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-lg px-3 py-3 active:opacity-80"
            >
              <View className="flex-1">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Department
                </Text>
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm mt-0.5"
                  style={{ fontFamily: 'Inter_500Medium' }}
                  numberOfLines={1}
                >
                  {selectedDepartment?.name ?? 'Not assigned'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
            </Pressable>
            <Pressable
              onPress={() => setSheet('role')}
              disabled={!departmentId || availableRoles.length === 0}
              className={cn(
                'flex-row items-center bg-surface-2 dark:bg-surface-2-dark border border-border-subtle dark:border-border-dark-subtle rounded-lg px-3 py-3',
                !departmentId || availableRoles.length === 0
                  ? 'opacity-50'
                  : 'active:opacity-80',
              )}
            >
              <View className="flex-1">
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Role
                </Text>
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm mt-0.5"
                  style={{ fontFamily: 'Inter_500Medium' }}
                  numberOfLines={1}
                >
                  {selectedRole?.name ??
                    (departmentId ? 'Select role' : 'Pick a department first')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.fgSubtle} />
            </Pressable>
          </View>
        </SectionCard>

        <SectionCard label="Model & prompt">
          <View className="gap-3">
            <View>
              <Input
                label="LLM model"
                value={llmModel}
                placeholder={`Org default (${ORG_DEFAULT_LLM})`}
                autoCapitalize="none"
                onChangeText={setLlmModel}
              />
              <Text
                className="text-fg-subtle dark:text-fg-dark-subtle text-[11px] mt-1"
                style={{ fontFamily: 'Inter_400Regular' }}
              >
                Leave empty to use the organization default.
              </Text>
            </View>
            <TextArea
              label="System prompt"
              description="The agent's behavior and persona. You can refine this on the web."
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              minLines={6}
            />
          </View>
        </SectionCard>

        <View className="mt-2 mb-4">
          <Button
            variant="primary"
            fullWidth
            loading={create.isPending}
            disabled={!canSubmit}
            onPress={onSubmit}
          >
            Create agent
          </Button>
        </View>
      </ScrollView>

      {sheet === 'department' ? (
        <Pressable
          onPress={() => setSheet(null)}
          className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
        >
          <Pressable className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-4 px-5 pb-6 max-h-[70%]">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-base mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Pick a department
            </Text>
            <ScrollView>
              {departmentList.length === 0 ? (
                <Text
                  className="text-fg-muted dark:text-fg-dark-muted text-sm py-3"
                  style={{ fontFamily: 'Inter_400Regular' }}
                >
                  No departments configured.
                </Text>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      setDepartmentId('');
                      setRoleId('');
                      setSheet(null);
                    }}
                    className="px-3 py-3 rounded-lg mb-1 bg-surface-2 dark:bg-surface-2-dark"
                  >
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      No department
                    </Text>
                  </Pressable>
                  {departmentList.map((d) => {
                    const id = deptIdOf(d);
                    const selected = departmentId === id;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => {
                          setDepartmentId(id);
                          setRoleId('');
                          setSheet(null);
                        }}
                        className={cn(
                          'px-3 py-3 rounded-lg mb-1',
                          selected
                            ? 'bg-accent-soft dark:bg-accent-soft-dark'
                            : 'bg-surface-2 dark:bg-surface-2-dark',
                        )}
                      >
                        <Text
                          className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                          style={{ fontFamily: 'Inter_500Medium' }}
                        >
                          {d.name}
                        </Text>
                        {d.roles && d.roles.length > 0 ? (
                          <Text
                            className="text-fg-muted dark:text-fg-dark-muted text-[11px] mt-0.5"
                            style={{ fontFamily: 'Inter_400Regular' }}
                          >
                            {d.roles.length} role{d.roles.length === 1 ? '' : 's'}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      ) : null}

      {sheet === 'role' ? (
        <Pressable
          onPress={() => setSheet(null)}
          className="absolute inset-0 bg-fg/40 dark:bg-bg-dark/60 z-40 justify-end"
        >
          <Pressable className="bg-surface dark:bg-surface-dark rounded-t-3xl pt-4 px-5 pb-6 max-h-[70%]">
            <Text
              className="text-fg dark:text-fg-dark-DEFAULT text-base mb-3"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Pick a role
            </Text>
            <ScrollView>
              <Pressable
                onPress={() => {
                  setRoleId('');
                  setSheet(null);
                }}
                className="px-3 py-3 rounded-lg mb-1 bg-surface-2 dark:bg-surface-2-dark"
              >
                <Text
                  className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  No role
                </Text>
              </Pressable>
              {availableRoles.map((r) => {
                const id = roleIdOf(r);
                const selected = roleId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      setRoleId(id);
                      setSheet(null);
                    }}
                    className={cn(
                      'px-3 py-3 rounded-lg mb-1',
                      selected
                        ? 'bg-accent-soft dark:bg-accent-soft-dark'
                        : 'bg-surface-2 dark:bg-surface-2-dark',
                    )}
                  >
                    <Text
                      className="text-fg dark:text-fg-dark-DEFAULT text-sm"
                      style={{ fontFamily: 'Inter_500Medium' }}
                    >
                      {r.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      ) : null}
    </Screen>
  );
}
