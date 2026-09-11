import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Elevation } from '@/constants/Colors';
import { useThemeMode } from '@/hooks/useThemeMode';
import { usePressScale } from '@/hooks/usePressScale';
import type { PrimeMessage } from '@/api/hooks/chatHooks';
import type { PrimeAction } from '@/lib/primeStructuredSchema';
import { MessageBubble } from './MessageBubble';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Within this many px of the end still counts as "reading the latest". */
const NEAR_BOTTOM_PX = 80;

interface ChatListProps {
  messages: PrimeMessage[];
  streamingContent: string;
  onAction?: (action: PrimeAction) => void;
}

/**
 * Auto-scroll follows iOS chat rules: your own send always snaps to the end;
 * Prime's activity only follows if you were already at the end. Scrolling up
 * to re-read pauses following and surfaces a return pill instead of yanking
 * the list out from under you.
 */
export function ChatList({ messages, streamingContent, onAction }: ChatListProps) {
  const ref = useRef<FlashListRef<PrimeMessage>>(null);
  const { colors } = useThemeMode();
  const nearBottomRef = useRef(true);
  const [showReturnPill, setShowReturnPill] = useState(false);
  const pillPress = usePressScale();

  const scrollToEnd = useCallback((animated: boolean) => {
    try {
      ref.current?.scrollToEnd({ animated });
    } catch {
      // ignore — list may not be laid out yet
    }
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distance < NEAR_BOTTOM_PX;
    nearBottomRef.current = nearBottom;
    setShowReturnPill(!nearBottom);
  }, []);

  const lastRole = messages.length > 0 ? messages[messages.length - 1].role : null;

  useEffect(() => {
    if (messages.length === 0) return;
    // A user send re-engages following even if they had scrolled up.
    if (lastRole === 'user') nearBottomRef.current = true;
    if (!nearBottomRef.current) return;
    const t = setTimeout(() => scrollToEnd(true), 80);
    return () => clearTimeout(t);
  }, [messages.length, streamingContent, lastRole, scrollToEnd]);

  return (
    <View className="flex-1">
      <FlashList
        ref={ref}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            streamingContent={item.status === 'streaming' ? streamingContent : undefined}
            onAction={onAction}
          />
        )}
        contentContainerStyle={{ paddingVertical: 12 }}
        ItemSeparatorComponent={() => <View className="h-1" />}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        onContentSizeChange={() => {
          if (nearBottomRef.current) scrollToEnd(false);
        }}
      />
      {showReturnPill ? (
        <AnimatedPressable
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            nearBottomRef.current = true;
            setShowReturnPill(false);
            scrollToEnd(true);
          }}
          onPressIn={pillPress.onPressIn}
          onPressOut={pillPress.onPressOut}
          accessibilityRole="button"
          accessibilityLabel="Scroll to latest"
          hitSlop={8}
          className="absolute bottom-3 self-center w-9 h-9 rounded-full items-center justify-center"
          style={[
            pillPress.animatedStyle,
            Elevation.md,
            {
              backgroundColor: colors.surfaceGlass,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          <Ionicons name="chevron-down" size={16} color={colors.fg} />
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
