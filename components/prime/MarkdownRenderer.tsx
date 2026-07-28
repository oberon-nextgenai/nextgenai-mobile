import Markdown from 'react-native-markdown-display';
import { Type } from '@/constants/Typography';
import { useThemeMode } from '@/hooks/useThemeMode';

interface MarkdownRendererProps {
  source: string;
}

/**
 * Markdown inside a Prime reply.
 *
 * `react-native-markdown-display` takes a style map rather than JSX, so this is
 * the one place the type roles are spread by hand instead of coming through
 * `<Text variant=…>`. The mapping still follows the same rule as everywhere else:
 * headings are the answer (serif), prose is the explanation (sans), code is the
 * provenance (mono) — never a raw font string.
 */
export function MarkdownRenderer({ source }: MarkdownRendererProps) {
  const { colors } = useThemeMode();
  const styles = {
    body: { ...Type.body.md, color: colors.fg },
    paragraph: { marginTop: 0, marginBottom: 8 },
    // A heading in a reply is the reply's verdict — same serif, same size as a
    // StructuredCard title, so a markdown answer and a structured one match.
    heading1: { ...Type.display.sm, color: colors.fg, marginTop: 8, marginBottom: 6 },
    heading2: { ...Type.body.semibold, color: colors.fg, marginTop: 8, marginBottom: 6 },
    heading3: { ...Type.body.medium, color: colors.fg, marginTop: 6, marginBottom: 4 },
    strong: { ...Type.body.semibold, color: colors.fg },
    em: { ...Type.body.md, fontStyle: 'italic' as const, color: colors.fg },
    code_inline: {
      ...Type.mono.code,
      backgroundColor: colors.surface2,
      color: colors.accent,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      ...Type.mono.code,
      backgroundColor: colors.surface2,
      color: colors.fg,
      padding: 10,
      borderRadius: 8,
    },
    fence: {
      ...Type.mono.code,
      backgroundColor: colors.surface2,
      color: colors.fg,
      padding: 10,
      borderRadius: 8,
    },
    link: { color: colors.accent },
    list_item: { ...Type.body.md, color: colors.fg, marginBottom: 4 },
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
