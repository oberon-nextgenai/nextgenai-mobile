import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useThemeMode } from '@/hooks/useThemeMode';
import { confirmAction } from '@/lib/confirm';
import {
  useMarkCantCollect,
  useResendMmrEmail,
  useUpdateGroupContact,
} from '@/api/hooks/mmrHooks';
import {
  MMR_STATUS_LABEL,
  type MmrContactGroup,
  type MmrContactUpdate,
} from '@/api/services/mmr';

interface MmrGroupActionSheetProps {
  group: MmrContactGroup | null;
  orgId: string;
  campaignId: string;
  onClose: () => void;
}

/**
 * What you can do about one contact group, from the phone.
 *
 * Three actions, in the order the situation usually escalates: resend the
 * request, correct who it goes to, then give up. Correcting the contact sits
 * between them deliberately — most groups that look unreachable have a stale
 * address, and fixing that is the action worth reaching for before writing the
 * meters off.
 */
export function MmrGroupActionSheet({
  group,
  orgId,
  campaignId,
  onClose,
}: MmrGroupActionSheetProps) {
  const { colors } = useThemeMode();
  const scope = { orgId, campaignId };
  const resend = useResendMmrEmail(scope);
  const cantCollect = useMarkCantCollect(scope);
  const updateContact = useUpdateGroupContact(scope);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Reset the form whenever a different group is opened, so edits never leak
  // from one customer's record into another's.
  useEffect(() => {
    setEditing(false);
    setName(group?.contactName ?? '');
    setEmail(group?.contactEmail ?? '');
    setPhone(group?.contactPhone ?? '');
  }, [group]);

  if (!group) return null;

  const status = group.status ?? 'pending';
  const meters = group.meterSerials?.length ?? group.totalCount ?? 0;
  const busy = resend.isPending || cantCollect.isPending || updateContact.isPending;

  function onResend() {
    if (!group) return;
    confirmAction({
      title: 'Resend the meter-reading request?',
      message: `This sends a real email to ${group.contactEmail || 'this contact'}.`,
      confirmLabel: 'Send email',
      destructive: false,
      onConfirm: () => resend.mutate(group.groupId, { onSuccess: onClose }),
    });
  }

  function onCantCollect() {
    if (!group) return;
    confirmAction({
      title: "Mark can't collect?",
      // Names the consequence in meters, because that is what goes unbilled.
      message: `No further emails or calls will be made to this contact, and their ${meters} meter${meters === 1 ? '' : 's'} will go unread this cycle.`,
      confirmLabel: "Can't collect",
      onConfirm: () => cantCollect.mutate(group.groupId, { onSuccess: onClose }),
    });
  }

  function onSaveContact() {
    if (!group) return;

    // Send only what changed. The endpoint updates the fields it receives, so
    // posting everything would overwrite a field someone else just corrected.
    const updates: MmrContactUpdate = {};
    if (name.trim() !== (group.contactName ?? '')) updates.contactName = name.trim();
    if (email.trim() !== (group.contactEmail ?? '')) updates.contactEmail = email.trim();
    if (phone.trim() !== (group.contactPhone ?? '')) updates.contactPhone = phone.trim();

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }

    updateContact.mutate(
      { groupId: group.groupId, updates },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      />
      <View style={{ backgroundColor: colors.bg }} className="px-4 pb-8 pt-4">
        <Card padding="md">
          <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text variant="display.sm" numberOfLines={2}>
                  {group.contactName?.trim() || 'Unnamed contact'}
                </Text>
                <Text variant="mono.label" tone="subtle" className="mt-1">
                  {MMR_STATUS_LABEL[status]} · {meters} {meters === 1 ? 'meter' : 'meters'}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.fgMuted} />
              </Pressable>
            </View>

            {editing ? (
              <View className="mt-4 gap-2.5">
                <Input label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
                <Input
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
                <Text variant="body.xs" tone="subtle">
                  Future attempts use the new details. Readings already collected are unaffected.
                </Text>

                <View className="flex-row gap-2.5 mt-1">
                  <View className="flex-1">
                    <Button variant="secondary" fullWidth onPress={() => setEditing(false)}>
                      Cancel
                    </Button>
                  </View>
                  <View className="flex-1">
                    <Button
                      fullWidth
                      loading={updateContact.isPending}
                      onPress={onSaveContact}
                    >
                      Save
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View className="mt-4 gap-2">
                  <ContactRow icon="mail-outline" value={group.contactEmail} />
                  <ContactRow
                    icon="call-outline"
                    value={
                      group.contactPhone
                        ? group.contactPhoneExtension
                          ? `${group.contactPhone} ext. ${group.contactPhoneExtension}`
                          : group.contactPhone
                        : undefined
                    }
                  />
                  <ContactRow
                    icon="repeat-outline"
                    value={`${group.attemptsCount ?? 0} attempts · prefers ${group.preferredChannel ?? 'email'}`}
                  />
                  {group.lastOutcome ? (
                    <ContactRow icon="information-circle-outline" value={group.lastOutcome} />
                  ) : null}
                </View>

                {group.emailBounced ? (
                  <View
                    className="mt-3 flex-row items-start rounded-xl p-2.5"
                    style={{ backgroundColor: colors.warningSoft }}
                  >
                    <Ionicons name="warning-outline" size={13} color={colors.warning} />
                    <Text variant="body.xs" tone="warning" className="ml-2 flex-1">
                      This address bounced, so emails are no longer sent to it. Correct the
                      contact or reach them by phone.
                    </Text>
                  </View>
                ) : null}

                <View className="mt-5 gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={busy || !group.contactEmail}
                    loading={resend.isPending}
                    onPress={onResend}
                    leftIcon={<Ionicons name="mail-outline" size={14} color={colors.fg} />}
                  >
                    Resend email
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    disabled={busy}
                    onPress={() => setEditing(true)}
                    leftIcon={<Ionicons name="create-outline" size={14} color={colors.fg} />}
                  >
                    Correct contact details
                  </Button>
                  {status !== 'cant_collect' && status !== 'completed' ? (
                    <Button
                      variant="outline-danger"
                      fullWidth
                      disabled={busy}
                      loading={cantCollect.isPending}
                      onPress={onCantCollect}
                      leftIcon={
                        <Ionicons name="hand-left-outline" size={14} color={colors.danger} />
                      }
                    >
                      Mark can&apos;t collect
                    </Button>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function ContactRow({
  icon,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
}) {
  const { colors } = useThemeMode();
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={13} color={colors.fgSubtle} />
      <Text variant="body.sm" tone={value ? 'muted' : 'subtle'} className="ml-2 flex-1">
        {value || 'Not on file'}
      </Text>
    </View>
  );
}
