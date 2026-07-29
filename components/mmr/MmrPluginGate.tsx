import { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/Button';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useMmrEntitlement } from '@/api/hooks/mmrHooks';

interface MmrPluginGateProps {
  orgId: string | null;
  children: ReactNode;
  /** What the user was trying to reach, for the explanatory copy. */
  feature?: string;
}

/**
 * Renders MMR features only for a workspace that has the MMR plugin.
 *
 * Deliberately explains itself instead of rendering nothing. The plugin has
 * never had a server-side effect, so an organization can be running meter
 * reads today with no integration record — for them this gate is wrong, and a
 * blank screen would give them no way to work that out. Naming the plugin and
 * offering the route to install it turns a dead end into a two-tap fix.
 */
export function MmrPluginGate({ orgId, children, feature = 'Meter reading' }: MmrPluginGateProps) {
  const router = useRouter();
  const { colors } = useThemeMode();
  const entitlement = useMmrEntitlement(orgId);

  if (entitlement.isPending) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // A failed lookup is not proof of absence. Saying "not installed" here would
  // send someone to install a plugin they already have.
  if (entitlement.isError) {
    return <ErrorState message="Could not check which plugins this workspace has." />;
  }

  if (!entitlement.enabled) {
    return (
      <EmptyState
        icon={<Ionicons name="speedometer-outline" size={22} color={colors.fgSubtle} />}
        title={`${feature} isn't enabled here`}
        description="This workspace doesn't have the MMR Campaigns plugin installed, so meter-reading campaigns are hidden on mobile."
        action={
          <Button
            variant="secondary"
            size="sm"
            onPress={() => router.push('/plugins' as never)}
            leftIcon={<Ionicons name="extension-puzzle-outline" size={14} color={colors.fg} />}
          >
            Open plugins
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
