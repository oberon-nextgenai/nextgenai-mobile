import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { GlassSurface } from './GlassSurface';

interface StickyActionProps {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

/**
 * Bottom save bar. Single 1px top hairline + surface background — feels
 * embedded in the screen, not floating. Adapts to safe-area inset.
 */
export function StickyAction({
  visible,
  onCancel,
  onSave,
  saving,
  saveLabel = 'Save',
  cancelLabel = 'Discard',
}: StickyActionProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <GlassSurface
      border="top"
      radius={0}
      elevation="lg"
      intensity={40}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
    >
      <View
        className="px-4 pt-3 flex-row gap-2"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <View className="flex-1">
          <Button variant="ghost" onPress={onCancel} disabled={saving} fullWidth>
            {cancelLabel}
          </Button>
        </View>
        <View className="flex-[1.5]">
          <Button onPress={onSave} loading={saving} fullWidth>
            {saveLabel}
          </Button>
        </View>
      </View>
    </GlassSurface>
  );
}
