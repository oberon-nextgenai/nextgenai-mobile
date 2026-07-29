import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { MmrPluginGate } from '@/components/mmr/MmrPluginGate';
import { useActiveOrg } from '@/store/org';
import {
  useDiscardMmrUpload,
  useMmrUploads,
  useUploadMmrSpreadsheet,
} from '@/api/hooks/mmrHooks';
import type { MmrUploadSummary } from '@/api/services/mmr';
import { fmtRelative } from '@/lib/formatters';
import { confirmAction } from '@/lib/confirm';
import { useThemeMode } from '@/hooks/useThemeMode';

const XLSX_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/**
 * Staging a meter spreadsheet so Prime can build a campaign from it.
 *
 * This screen exists because of a hard constraint: an MCP tool takes JSON
 * arguments, so a file can never be handed to Prime directly. Uploading here
 * gives the sheet an id Prime can name in conversation.
 *
 * Deliberately not a campaign builder. The web form spans roughly forty
 * configuration fields and reproducing it on a phone would be the wrong
 * trade — this covers the one step Prime cannot do for itself, and hands the
 * rest back to the conversation.
 */
export default function MmrUploadsScreen() {
  const { activeOrgId } = useActiveOrg();

  return (
    <Screen edges={{ top: true, bottom: false }}>
      <AppHeader title="Meter spreadsheets" showBack showOrgPill={false} />
      {!activeOrgId ? (
        <EmptyState title="Choose an organization" />
      ) : (
        <MmrPluginGate orgId={activeOrgId} feature="Meter spreadsheets">
          <UploadsBody orgId={activeOrgId} />
        </MmrPluginGate>
      )}
    </Screen>
  );
}

function UploadsBody({ orgId }: { orgId: string }) {
  const { colors } = useThemeMode();
  const uploads = useMmrUploads(orgId);
  const upload = useUploadMmrSpreadsheet(orgId);
  const discard = useDiscardMmrUpload(orgId);
  const [picking, setPicking] = useState(false);

  async function onPick() {
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: XLSX_MIME,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      upload.mutate({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    } finally {
      setPicking(false);
    }
  }

  function onDiscard(item: MmrUploadSummary) {
    confirmAction({
      title: `Discard ${item.fileName}?`,
      message: 'The staged spreadsheet is removed. The file on your device is untouched.',
      confirmLabel: 'Discard',
      onConfirm: () => discard.mutate(item.uploadId),
    });
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={uploads.isFetching}
          onRefresh={() => void uploads.refetch()}
          tintColor={colors.accent}
        />
      }
    >
      <Button
        fullWidth
        loading={picking || upload.isPending}
        onPress={() => void onPick()}
        leftIcon={<Ionicons name="cloud-upload-outline" size={15} color="#fff" />}
      >
        Upload a spreadsheet
      </Button>

      <Text variant="body.xs" tone="subtle" className="mt-2 mb-5 text-center">
        Only needed when the meter fleet changes. To run the next cycle on the same
        meters, ask Prime to carry the previous campaign forward.
      </Text>

      {uploads.isPending ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : uploads.isError ? (
        <ErrorState
          message={(uploads.error as Error).message}
          onRetry={() => void uploads.refetch()}
        />
      ) : (uploads.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Ionicons name="document-outline" size={22} color={colors.fgSubtle} />}
          title="Nothing staged"
          description="Upload a meter spreadsheet and it will wait here for you to turn it into a campaign."
        />
      ) : (
        <>
          <Text variant="mono.label" tone="subtle" className="mb-2">
            Ready for Prime
          </Text>
          {(uploads.data ?? []).map(item => (
            <UploadRow key={item.uploadId} item={item} onDiscard={() => onDiscard(item)} />
          ))}
          <Text variant="body.xs" tone="subtle" className="mt-3 text-center">
            Ask Prime to &ldquo;create an MMR campaign from{' '}
            {uploads.data?.[0]?.fileName ?? 'that spreadsheet'}&rdquo;.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function UploadRow({ item, onDiscard }: { item: MmrUploadSummary; onDiscard: () => void }) {
  const { colors } = useThemeMode();

  return (
    <Card padding="sm" className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text variant="body.medium" numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text variant="mono.label" tone="subtle" className="mt-1">
            {item.deviceCount} meters · {item.contactGroupCount} contact groups
          </Text>
          <Text variant="body.xs" tone="subtle" className="mt-0.5">
            Uploaded {fmtRelative(item.uploadedAt)} · expires {fmtRelative(item.expiresAt)}
          </Text>

          {/* Rows the parser could not use are reported rather than absorbed:
              a sheet that silently loses ten meters bills ten meters short. */}
          {item.totalRows > item.validRows ? (
            <View className="flex-row items-center mt-1.5">
              <Ionicons name="warning-outline" size={11} color={colors.warning} />
              <Text variant="body.xs" tone="warning" className="ml-1.5">
                {item.totalRows - item.validRows} of {item.totalRows} rows could not be read
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable onPress={onDiscard} hitSlop={10} accessibilityLabel="Discard upload">
          <Ionicons name="trash-outline" size={16} color={colors.fgSubtle} />
        </Pressable>
      </View>
    </Card>
  );
}
