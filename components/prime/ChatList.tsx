import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { PrimeMessage } from '@/api/hooks/chatHooks';
import type { PrimeAction } from '@/lib/primeStructuredSchema';
import { MessageBubble } from './MessageBubble';

interface ChatListProps {
  messages: PrimeMessage[];
  streamingContent: string;
  onAction?: (action: PrimeAction) => void;
}

export function ChatList({ messages, streamingContent, onAction }: ChatListProps) {
  const ref = useRef<FlashList<PrimeMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => {
      try {
        ref.current?.scrollToEnd({ animated: true });
      } catch {
        // ignore
      }
    }, 80);
    return () => clearTimeout(t);
  }, [messages.length, streamingContent]);

  return (
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
      estimatedItemSize={120}
      contentContainerStyle={{ paddingVertical: 12 }}
      ItemSeparatorComponent={() => <View className="h-1" />}
      onContentSizeChange={() => {
        try {
          ref.current?.scrollToEnd({ animated: false });
        } catch {
          // ignore
        }
      }}
    />
  );
}
