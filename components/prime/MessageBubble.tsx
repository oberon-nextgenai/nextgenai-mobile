import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import type { PrimeMessage } from '@/api/hooks/chatHooks';
import type { PrimeAction } from '@/lib/primeStructuredSchema';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StructuredCard } from './StructuredCard';
import { ToolCallBadge } from './ToolCallBadge';
import { ToolCallSummary } from './ToolCallSummary';
import { PrimeToolPanel } from './PrimeToolPanel';
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
          {/* Same role as the markdown `body` opposite, so both sides of the
              thread read at one size. */}
          <Text variant="body.md">{message.content}</Text>
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

  // Tool-call rendering:
  // - While streaming, with tool calls or a status hint: the PRIME · WORKING
  //   panel. It is the signal — one readable step per tool, so a high-fanout
  //   turn narrates itself instead of producing a wall of pills.
  // - While streaming, with neither: fall back to the StreamingIndicator, which
  //   is the right answer for a model replying from context with no tools.
  // - On complete/error with 3+ tools: render a single collapsed "Used N tools"
  //   summary row, tap to expand into the existing per-tool badges.
  // - With 1-2 tools: keep the current inline badge rendering.
  const tools = message.toolCalls ?? [];
  const statusMessage = message.statusMessage?.trim() || undefined;
  const showToolPanel = isStreaming && (tools.length > 0 || Boolean(statusMessage));
  const showTools = !isStreaming && tools.length > 0;
  const shouldCollapse = tools.length >= TOOL_CALL_SUMMARY_THRESHOLD;

  const showThinking =
    isStreaming &&
    !showToolPanel &&
    !displayContent &&
    !hasStructured &&
    !hasFallbackOnly;

  return (
    <View className={cn('mb-4 px-4', message.status === 'error' && 'opacity-90')}>
      {showToolPanel ? (
        <View className="mb-2">
          <PrimeToolPanel tools={tools} statusMessage={statusMessage} />
        </View>
      ) : showTools ? (
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
        // A message row, never a hero surface — no gloss.
        <Card>
          <MarkdownRenderer source={message.fallbackMarkdown ?? ''} />
        </Card>
      ) : displayContent || !isStreaming ? (
        <View className="px-1">
          <MarkdownRenderer source={displayContent || ' '} />
        </View>
      ) : (
        // Streaming, tools running, no prose yet — the panel above is the whole
        // message. An empty markdown block here would add a phantom line of
        // height under it.
        null
      )}
    </View>
  );
}
