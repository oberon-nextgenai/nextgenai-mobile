import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useThemeMode } from '@/hooks/useThemeMode';
import {
  widgetDimensionRows,
  widgetKpiValue,
  type RenderWidget,
} from '@/api/services/analyticsEngine';
import { fmtNumber, fmtPct } from '@/lib/formatters';

/**
 * One platform-query-engine widget, mobile-sized.
 *
 * A widget carrying `error` renders NOTHING — the dashboard degrades by
 * omission, never by showing a dash (the demo's no-dash rule).
 */
export function WidgetTile({ widget }: { widget: RenderWidget }) {
  const { colors } = useThemeMode();

  if (widget.error) return null;

  if (widget.type === 'kpi') {
    const value = widgetKpiValue(widget);
    if (value == null) return null;
    const display = widget.display?.ratio ? fmtPct(value, 0) : fmtNumber(Math.round(value));
    return (
      <Card padding="sm" className="flex-1">
        <Text variant="mono.label" tone="subtle" numberOfLines={2}>
          {widget.title}
        </Text>
        <Text variant="display.sm" className="mt-1">
          {display}
        </Text>
      </Card>
    );
  }

  // bar / pie / line / table all collapse to labeled proportional rows — the
  // honest mobile rendering of a small categorical series.
  const rows = widgetDimensionRows(widget).slice(0, 6);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(r => r.value), 1);

  return (
    <Card padding="sm">
      <Text variant="mono.label" tone="subtle" numberOfLines={1}>
        {widget.title}
      </Text>
      <View className="mt-2.5 gap-2">
        {rows.map(row => (
          <View key={row.label}>
            <View className="flex-row items-center justify-between">
              <Text variant="body.sm" numberOfLines={1} className="flex-1 pr-2">
                {row.label}
              </Text>
              <Text variant="mono.sm" tone="muted">
                {fmtNumber(Math.round(row.value))}
              </Text>
            </View>
            <View
              className="mt-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.surface2 }}
            >
              <View
                className="h-1 rounded-full"
                style={{
                  backgroundColor: colors.accent2,
                  width: `${Math.max(4, Math.round((row.value / max) * 100))}%`,
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
