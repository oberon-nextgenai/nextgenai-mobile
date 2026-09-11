import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '@/app/_layout';

// `_layout.tsx` imports the Tailwind entry point for its side effect (nativewind
// picks it up at build time); Jest has no CSS transform, so stub it here.
jest.mock('@/global.css', () => ({}), { virtual: true });

describe('ErrorBoundary', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    // The component itself logs on every render (see the fix below) —
    // spy so that's asserted on rather than left to print to the test output.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders the crash screen and retries via the button', () => {
    const retry = jest.fn();

    render(<ErrorBoundary error={new Error('boom')} retry={retry} />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("logs the error instead of discarding it — this replaces expo-router's default boundary", () => {
    const error = new Error('boom');

    render(<ErrorBoundary error={error} retry={jest.fn()} />);

    expect(consoleError).toHaveBeenCalledWith('[root] uncaught render error', error);
  });

  it('shows the error message on screen in dev, where the default boundary used to', () => {
    render(<ErrorBoundary error={new Error('a very specific crash reason')} retry={jest.fn()} />);

    expect(screen.getByText('a very specific crash reason')).toBeTruthy();
  });
});
