import { http } from '@/api/client/http';
import { PATHS } from '@/api/client/paths';
// DEMO ONLY — DO NOT MERGE: the demo build short-fuses this request.
import { DEMO_APPROVALS } from '@/api/demo/flags';

/**
 * The platform query engine's rendered dashboard —
 * `GET /api/analytics-engine/dashboards/:orgId/render?preset=`.
 * Returns widget definitions AND their computed values in one call. This is
 * the same payload the web console's schema-driven dashboard renders.
 */
export type RenderPreset = '7d' | '30d' | '90d';

export type WidgetType = 'kpi' | 'bar' | 'line' | 'pie' | 'table';

export interface RenderWidget {
  widgetId: string;
  type: WidgetType;
  title: string;
  grid?: { x: number; y: number; w: number; h: number };
  display?: { section?: string; format?: string; ratio?: boolean };
  data?: {
    resource: string;
    rows: Record<string, unknown>[];
    meta?: { organizationId?: string; limit?: number; rowCount?: number };
  };
  /** Per-widget failure — the dashboard degrades per tile, callers HIDE these. */
  error?: string;
}

export interface DashboardRender {
  organizationId: string;
  version: number;
  title: string;
  layout?: { columns: number };
  widgets: RenderWidget[];
}

const DEMO_TIMEOUT_MS = 2_500;

export async function fetchDashboardRender(
  organizationId: string,
  preset: RenderPreset,
): Promise<DashboardRender> {
  const { data } = await http.get<DashboardRender>(
    PATHS.analyticsEngine.render(organizationId),
    {
      params: { preset },
      ...(DEMO_APPROVALS ? { timeout: DEMO_TIMEOUT_MS, suppressErrorToast: true } : {}),
    },
  );
  return data;
}

/**
 * DEMO ONLY — DO NOT MERGE: the id of the Alex voice agent, exactly as the
 * platform's own dashboard script pins it. MMR campaigns attach to the VOICE
 * assistant, so this scope resolves Alex's campaigns — without it the count
 * would include every MMR campaign in the organization.
 */
const ALEX_VOICE_AGENT_ID = '69ea742cabad44eb6a5e52bd';

interface AdhocQueryResult {
  resource: string;
  rows: Record<string, unknown>[];
  meta?: { organizationId?: string; limit?: number; rowCount?: number };
}

/**
 * All-time count of meter assignments (device rows) on Alex's MMR campaigns,
 * via `POST /api/analytics-engine/query/:orgId`. Deliberately UNWINDOWED:
 * `mmr_devices` time-scopes on campaign `createdAt`, so any weekly/monthly
 * window would count campaigns created in the window — a different cohort
 * from readings collected in it. All-time is the only honest presentation.
 * Returns null on error or zero — callers hide the tile entirely.
 */
export async function fetchAlexAssignedMeters(
  organizationId: string,
): Promise<number | null> {
  const { data } = await http.post<AdhocQueryResult>(
    PATHS.analyticsEngine.query(organizationId),
    {
      query: {
        resource: 'mmr_devices',
        measures: [{ id: 'count', op: 'count' }],
        agentScope: { agentIds: [ALEX_VOICE_AGENT_ID], mode: 'include' },
      },
    },
    DEMO_APPROVALS ? { timeout: DEMO_TIMEOUT_MS, suppressErrorToast: true } : {},
  );
  const n = Number(data?.rows?.[0]?.count);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Row conventions (mirrors the web renderer): measure keys are
 * `count | avg_duration | sum_duration | min_duration | max_duration`;
 * percent KPIs carry `percent`; any other key is the dimension label.
 * pg NUMERIC/BIGINT arrive as strings — coerce before display.
 */
const MEASURE_KEYS = new Set([
  'count',
  'avg_duration',
  'sum_duration',
  'min_duration',
  'max_duration',
  'percent',
  'numerator',
  'denominator',
]);

export function widgetKpiValue(widget: RenderWidget): number | null {
  const row = widget.data?.rows?.[0];
  if (!row) return null;
  const source = widget.display?.ratio && row.percent != null ? row.percent : (row.percent ?? row.count);
  const candidate = source ?? Object.values(row).find(v => typeof v === 'number' || (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))));
  const n = Number(candidate);
  return Number.isFinite(n) ? n : null;
}

export function widgetDimensionRows(
  widget: RenderWidget,
): { label: string; value: number }[] {
  const rows = widget.data?.rows ?? [];
  return rows
    .map(row => {
      const dimKey = Object.keys(row).find(k => !MEASURE_KEYS.has(k));
      const label = dimKey != null ? String(row[dimKey] ?? '(none)') : '(none)';
      const measure = row.count ?? row.percent ?? row.sum_duration ?? row.avg_duration;
      const value = Number(measure);
      return { label, value: Number.isFinite(value) ? value : 0 };
    })
    .filter(r => r.label !== '' && r.value >= 0);
}
