import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';
import type { PrimeMessage } from '@/api/hooks/chatHooks';
import type { PrimeAction } from '@/lib/primeStructuredSchema';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StructuredCard } from './StructuredCard';
import { ToolCallBadge } from './ToolCallBadge';
import { ToolCallSummary } from './ToolCallSummary';
import { StreamingIndicator } from './StreamingIndicator';

interface MessageBubbleProps {
  message: PrimeMessage;
  streamingContent?: string;
  onAction?: (action: PrimeAction) => void;
}

const TOOL_CALL_SUMMARY_THRESHOLD = 3;

export function MessageBubble({ message, streamingContent, onAction }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <View className="items-end mb-4 px-4">
        <View className="bg-accent-soft dark:bg-accent-soft-dark border border-accent/20 dark:border-accent-dark/30 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[88%]">
          <Text
            className="text-fg dark:text-fg-dark-DEFAULT text-[15px] leading-5"
            style={{ fontFamily: 'Inter_400Regular' }}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  const isStreaming = message.status === 'streaming';
  const displayContent =
    isStreaming && streamingContent ? streamingContent : message.content;
  const hasStructured = message.format === 'structured' && message.structured;
  const hasFallbackOnly =
    message.format === 'structured' &&
    !message.structured &&
    !!message.fallbackMarkdown;
  const showThinking =
    isStreaming && !displayContent && !hasStructured && !hasFallbackOnly;

  // Tool-call rendering:
  // - While streaming: suppress all tool badges. The "Prime is thinking…"
  //   StreamingIndicator is the only signal — avoid the wall-of-pills problem
  //   when the model fans out to many tools.
  // - On complete/error with 3+ tools: render a single collapsed "Used N tools"
  //   summary row, tap to expand into the existing per-tool badges.
  // - With 1-2 tools: keep the current inline badge rendering.
  const tools = message.toolCalls ?? [];
  const showTools = !isStreaming && tools.length > 0;
  const shouldCollapse = tools.length >= TOOL_CALL_SUMMARY_THRESHOLD;

  return (
    <View className={cn('mb-4 px-4', message.status === 'error' && 'opacity-90')}>
      {showTools ? (
        shouldCollapse ? (
          <ToolCallSummary tools={tools} />
        ) : (
          <View className="mb-1.5 flex-row flex-wrap gap-1.5">
            {tools.map((tc) => (
              <ToolCallBadge key={tc.id} tool={tc} />
            ))}
          </View>
        )
      ) : null}

      {showThinking ? (
        <StreamingIndicator />
      ) : hasStructured ? (
        <StructuredCard
          data={message.structured!}
          fallbackMarkdown={message.fallbackMarkdown}
          onActionTap={onAction}
        />
      ) : hasFallbackOnly ? (
        <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl px-4 py-3">
          <MarkdownRenderer source={message.fallbackMarkdown ?? ''} />
        </View>
      ) : (
        <View className="px-1">
          <MarkdownRenderer source={displayContent || ' '} />
        </View>
      )}
    </View>
  );
}
