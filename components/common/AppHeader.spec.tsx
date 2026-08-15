import { fireEvent, render } from '@testing-library/react-native';
import { AppHeader } from './AppHeader';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

jest.mock('@/components/common/OrgPill', () => ({ OrgPill: () => null }));
jest.mock('@/components/common/NotificationBell', () => ({
  NotificationBell: () => null,
}));

describe('AppHeader back button', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockReplace.mockReset();
  });

  it('goes back when there is history behind the screen', () => {
    mockCanGoBack = true;
    const { getByLabelText } = render(<AppHeader title="Audit record" showBack />);
    fireEvent.press(getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('falls back to the given route when history is empty (web deep link / modal)', () => {
    mockCanGoBack = false;
    const { getByLabelText } = render(
      <AppHeader title="Audit record" showBack backFallback="/(root)/(tabs)/approvals" />,
    );
    fireEvent.press(getByLabelText('Back'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(root)/(tabs)/approvals');
  });

  it('defaults the fallback to the brief tab', () => {
    mockCanGoBack = false;
    const { getByLabelText } = render(<AppHeader title="Settings" showBack />);
    fireEvent.press(getByLabelText('Back'));
    expect(mockReplace).toHaveBeenCalledWith('/(root)/(tabs)/brief');
  });
});
