import { Stack } from 'expo-router';

// A stack so the agent detail pushes within the Workforce tab (real back button).
export default function WorkforceLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
