import { Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';
import { useThemeMode } from '@/hooks/useThemeMode';
import type {
  NdsActionKpis,
  NdsActionKpiItem,
  NdsVolumeTrendPoint,
} from '@/api/services/types';

interface NdsHeroProps {
  kpis: NdsActionKpis | undefined;
  volumeTrends: NdsVolumeTrendPoint[] | undefined;
}

// Series colors mirrored from the web NDS dashboard.
const CYAN = '#06B6D4';
const EMERALD = '#10B981';
const VIOLET = '#8B5CF6';

type SparkSource = (p: NdsVolumeTrendPoint) => number;

interface HeroSpec {
  key: keyof NdsActionKpis;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  suffix?: string;
  spark: SparkSource;
}

interface CompactSpec {
  key: keyof NdsActionKpis;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const HERO_CARDS: HeroSpec[] = [
  {
    key: 'activeCases',
    label: 'Active Cases',
    icon: 'people-outline',
    color: CYAN,
    spark: (p) => Math.max(0, (p.ordered ?? 0) - (p.completed ?? 0)),
  },
  {
    key: 'approvalsToday',
    label: 'Approvals Today',
    icon: 'checkmark-done-outline',
    color: EMERALD,
    spark: (p) => p.approved ?? 0,
  },
  {
    key: 'workflowHealth',
    label: 'Workflow Health',
    icon: 'pulse-outline',
    color: VIOLET,
    suffix: '%',
    spark: (p) => {
      const total = (p.approved ?? 0) + (p.denied ?? 0);
      return total > 0 ? Math.round(((p.approved ?? 0) / total) * 100) : 0;
    },
  },
];

const COMPACT_CARDS: CompactSpec[] = [
  { key: 'needsManagerAction', label: 'Needs Manager Action', icon: 'person-outline' },
  { key: 'needsCandidateAction', label: 'Needs Candidate Action', icon: 'person-circle-outline' },
  { key: 'denialsToday', label: 'Denials Today', icon: 'close-circle-outline' },
];

function formatTrend(t: number | null | undefined): string | null {
  if (t == null || !Number.isFinite(t)) return null;
  if (t === 0) return '0%';
  const sign = t > 0 ? '+' : '';
  return `${sign}${Math.round(t)}%`;
}

function buildSpark(
  trends: NdsVolumeTrendPoint[] | undefined,
  source: SparkSource,
): { value: number }[] {
  if (!trends?.length) return [];
  return trends.slice(-14).map((p) => ({ value: source(p) }));
}

interface TrendPillProps {
  trend: number | null | undefined;
}

function TrendPill({ trend }: TrendPillProps) {
  const { colors } = useThemeMode();
  const label = formatTrend(trend);
  if (label === null) return null;
  const positive = (trend ?? 0) > 0;
  const negative = (trend ?? 0) < 0;
  const tone = positive ? colors.success : negative ? colors.danger : colors.fgMuted;
  const icon = positive ? 'trending-up' : negative ? 'trending-down' : 'remove';
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={10} color={tone} />
      <Text
        className="text-[10px] ml-0.5"
        style={{ fontFamily: 'Inter_500Medium', color: tone }}
      >
        {label}
      </Text>
    </View>
  );
}

interface HeroCardProps {
  spec: HeroSpec;
  item: NdsActionKpiItem | undefined;
  spark: { value: number }[];
}

function HeroCard({ spec, item, spark }: HeroCardProps) {
  const { colors } = useThemeMode();
  const value = item?.value;
  const trend = item?.trend ?? null;
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center flex-1 pr-2">
            <Ionicons name={spec.icon} size={11} color={spec.color} style={{ marginRight: 5 }} />
            <Text
              className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'Inter_500Medium' }}
              numberOfLines={1}
            >
              {spec.label}
            </Text>
          </View>
        </View>
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-2xl"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {value != null ? `${value}${spec.suffix ?? ''}` : '—'}
          </Text>
          <TrendPill trend={trend} />
        </View>
        {spark.length > 1 ? (
          <View className="mt-2 -mx-1">
            <LineChart
              data={spark}
              areaChart
              curved
              isAnimated={false}
              height={36}
              initialSpacing={0}
              endSpacing={0}
              spacing={Math.max(6, Math.floor(140 / Math.max(1, spark.length - 1)))}
              hideRules
              hideYAxisText
              hideAxesAndRules
              xAxisColor="transparent"
              yAxisColor="transparent"
              color={spec.color}
              thickness={1.6}
              startFillColor={spec.color}
              endFillColor={spec.color}
              startOpacity={0.22}
              endOpacity={0.02}
              hideDataPoints
              disableScroll
              adjustToWidth
            />
          </View>
        ) : (
          <View style={{ height: 36 }} />
        )}
      </View>
    </View>
  );
}

interface CompactCardProps {
  spec: CompactSpec;
  item: NdsActionKpiItem | undefined;
}

function CompactCard({ spec, item }: CompactCardProps) {
  const { colors } = useThemeMode();
  const value = item?.value;
  return (
    <View className="w-1/2 px-1 mb-2">
      <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3">
        <View className="flex-row items-center mb-1">
          <Ionicons name={spec.icon} size={11} color={colors.fgMuted} style={{ marginRight: 5 }} />
          <Text
            className="text-fg-muted dark:text-fg-dark-muted text-[10px] uppercase tracking-widest flex-1"
            style={{ fontFamily: 'Inter_500Medium' }}
            numberOfLines={1}
          >
            {spec.label}
          </Text>
        </View>
        <View className="flex-row items-baseline justify-between">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-xl"
            style={{ fontFamily: 'Inter_700Bold' }}
          >
            {value != null ? value : '—'}
          </Text>
          <TrendPill trend={item?.trend ?? null} />
        </View>
      </View>
    </View>
  );
}

/**
 * NDS hero KPI grid — mirrors the web Analytics dashboard.
 *
 *   Row 1: 3 hero cards with sparkline + trend pill
 *          (Active Cases · Approvals Today · Workflow Health)
 *   Row 2: 3 compact cards (Needs Manager Action · Needs Candidate Action · Denials Today)
 *
 * On phone widths the two rows render as a 2-col grid (1.5 cards per row);
 * the layout reads top-to-bottom in importance order regardless.
 */
export function NdsHero({ kpis, volumeTrends }: NdsHeroProps) {
  return (
    <View>
      <View className={cn('flex-row flex-wrap -mx-1')}>
        {HERO_CARDS.map((spec) => (
          <HeroCard
            key={spec.key}
            spec={spec}
            item={kpis?.[spec.key]}
            spark={buildSpark(volumeTrends, spec.spark)}
          />
        ))}
      </View>
      <View className={cn('flex-row flex-wrap -mx-1')}>
        {COMPACT_CARDS.map((spec) => (
          <CompactCard key={spec.key} spec={spec} item={kpis?.[spec.key]} />
        ))}
      </View>
    </View>
  );
}
