import Markdown from 'react-native-markdown-display';
import { useThemeMode } from '@/hooks/useThemeMode';

interface MarkdownRendererProps {
  source: string;
}

export function MarkdownRenderer({ source }: MarkdownRendererProps) {
  const { colors } = useThemeMode();
  const styles = {
    body: {
      color: colors.fg,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'Inter_400Regular',
    },
    paragraph: { marginTop: 0, marginBottom: 8 },
    heading1: {
      color: colors.fg,
      fontFamily: 'Inter_700Bold',
      fontSize: 20,
      marginTop: 8,
      marginBottom: 6,
    },
    heading2: {
      color: colors.fg,
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      marginTop: 8,
      marginBottom: 6,
    },
    heading3: {
      color: colors.fg,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      marginTop: 6,
      marginBottom: 4,
    },
    strong: { fontFamily: 'Inter_700Bold', color: colors.fg },
    em: { fontStyle: 'italic' as const, color: colors.fg },
    code_inline: {
      backgroundColor: colors.surface2,
      color: colors.accent,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'Menlo',
    },
    code_block: {
      backgroundColor: colors.surface2,
      color: colors.fg,
      padding: 10,
      borderRadius: 8,
      fontFamily: 'Menlo',
      fontSize: 13,
    },
    fence: {
      backgroundColor: colors.surface2,
      color: colors.fg,
      padding: 10,
      borderRadius: 8,
      fontFamily: 'Menlo',
      fontSize: 13,
    },
    link: { color: colors.accent },
    list_item: { color: colors.fg, marginBottom: 4 },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    blockquote: {
      backgroundColor: colors.surface2,
      borderLeftColor: colors.accent,
      borderLeftWidth: 3,
      paddingLeft: 8,
      paddingVertical: 4,
      marginBottom: 8,
    },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 8 },
  } as const;
  return <Markdown style={styles}>{source}</Markdown>;
}
