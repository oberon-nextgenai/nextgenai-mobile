import { render, screen } from '@testing-library/react-native';
import ApprovalDetailScreen from './[id]';
import { useDecideEscalation, useEscalation } from '@/api/hooks/escalationHooks';
import type { Approval, Escalation } from '@/api/services/escalations';

jest.mock('@/api/hooks/escalationHooks', () => ({
  useEscalation: jest.fn(),
  useDecideEscalation: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'esc-1' }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('@/store/org', () => ({
  useActiveOrg: () => ({ activeOrgId: 'org_1', active: null, organizations: [] }),
}));

// The screen mirrors the backend's org-admin decide gate off the session role.
let mockRole: string = 'org_admin';
jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: { user: { role: string } }) => unknown) =>
    selector({ user: { role: mockRole } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockEscalation = useEscalation as unknown as jest.Mock;
const mockDecide = useDecideEscalation as unknown as jest.Mock;

const ESCALATION: Escalation = {
  _id: 'esc-1',
  organizationId: 'org_1',
  ref: 'ESC-7',
  severity: 'high',
  kind: 'tool_approval',
  title: 'Sophie wants to send an email',
  context: 'Outside the campaign window.',
  agentName: 'Sophie',
  impactAmount: 0,
  currency: 'USD',
  status: 'open',
  slaDueAt: '2026-08-17T18:00:00.000Z',
  createdAt: '2026-08-17T14:00:00.000Z',
};

const TOOL_APPROVAL: Approval = {
  _id: 'app-1',
  organizationId: 'org_1',
  escalationId: 'esc-1',
  action: 'tool_grant',
  decision: 'pending',
  projections: [],
  createdAt: '2026-08-17T14:00:00.000Z',
  toolName: 'send_new_email',
  grantStatus: 'none',
  actionPayload: {
    to: 'cfo@example.com',
    subject: 'Renewal terms',
    apiKey: 'sk-live-leaked',
  },
};

const HANDOFF_APPROVAL: Approval = {
  _id: 'app-2',
  organizationId: 'org_1',
  escalationId: 'esc-1',
  action: 'approve_human_takeover',
  decision: 'pending',
  projections: [],
  createdAt: '2026-08-17T14:00:00.000Z',
};

function setDetail(approval: Approval | null) {
  mockEscalation.mockReturnValue({
    data: { escalation: ESCALATION, approval },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  mockRole = 'org_admin';
  setDetail(TOOL_APPROVAL);
  mockDecide.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  });
});

describe('ApprovalDetailScreen decide gating', () => {
  it('offers the decision to an org admin', () => {
    render(<ApprovalDetailScreen />);

    expect(screen.getByText('Approve')).toBeTruthy();
    expect(screen.getByText('Reject')).toBeTruthy();
  });

  it('shows an org member the truth instead of buttons that would 403', () => {
    mockRole = 'user';
    render(<ApprovalDetailScreen />);

    expect(screen.queryByText('Approve')).toBeNull();
    expect(screen.queryByText('Reject')).toBeNull();
    expect(screen.getByText('An organization admin decides this approval.')).toBeTruthy();
  });

  it('lets a superadmin decide too — the backend accepts both', () => {
    mockRole = 'superadmin';
    render(<ApprovalDetailScreen />);

    expect(screen.getByText('Approve')).toBeTruthy();
  });
});

describe('ApprovalDetailScreen proposed action', () => {
  it('shows what the gated tool will do with the frozen arguments', () => {
    render(<ApprovalDetailScreen />);

    expect(screen.getByText('Proposed action')).toBeTruthy();
    expect(screen.getByText('send_new_email')).toBeTruthy();
    expect(screen.getByText('cfo@example.com')).toBeTruthy();
    expect(screen.getByText('Renewal terms')).toBeTruthy();
  });

  it('never renders a credential, even if the server redaction slipped', () => {
    render(<ApprovalDetailScreen />);

    expect(screen.queryByText('sk-live-leaked')).toBeNull();
    expect(screen.getByText('[REDACTED]')).toBeTruthy();
  });

  it('labels the grant lifecycle for a decided item', () => {
    setDetail({ ...TOOL_APPROVAL, decision: 'approved', grantStatus: 'issued' });
    render(<ApprovalDetailScreen />);

    // The Tag uppercases visually via CSS; the text node keeps the raw label.
    expect(screen.getByText('grant issued')).toBeTruthy();
  });

  it('keeps manager handoffs on the classic layout — no action block', () => {
    setDetail(HANDOFF_APPROVAL);
    render(<ApprovalDetailScreen />);

    expect(screen.queryByText('Proposed action')).toBeNull();
    expect(screen.getByText('Approve')).toBeTruthy();
  });
});
