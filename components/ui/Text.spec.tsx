import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Text } from './Text';
import { Type, FontFamily } from '@/constants/Typography';
import { Colors } from '@/constants/Colors';

/**
 * The Text primitive is now the single path every string in the app takes, so a
 * regression here is a regression everywhere. These tests pin the two things
 * callers actually rely on: that a variant resolves to the right family, and
 * that a tone resolves to a palette colour rather than a hardcoded one.
 */

/** Flattens the rendered style array into one object. */
function styleOf(el: { props: { style?: unknown } }): Record<string, unknown> {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

describe('Text', () => {
  it('defaults to body.md so an un-annotated string is still on the system', () => {
    const { getByText } = render(<Text>hello</Text>);
    expect(styleOf(getByText('hello'))).toMatchObject({
      fontFamily: FontFamily.sans,
      fontSize: Type.body.md.fontSize,
    });
  });

  describe('variant resolves to the right family — the three-family split', () => {
    it.each([
      ['display.lg', FontFamily.serif],
      ['display.md', FontFamily.serif],
      ['display.italic', FontFamily.serifItalic],
      ['body.md', FontFamily.sans],
      ['body.semibold', FontFamily.sansSemibold],
      ['mono.label', FontFamily.monoMedium],
      ['mono.value', FontFamily.mono],
      ['mono.code', FontFamily.mono],
    ] as const)('%s → %s', (variant, family) => {
      const { getByText } = render(<Text variant={variant}>x</Text>);
      expect(styleOf(getByText('x')).fontFamily).toBe(family);
    });
  });

  it('sets mono labels uppercase and tracked, so callers never hand-roll it', () => {
    const { getByText } = render(<Text variant="mono.label">fleet health</Text>);
    const style = styleOf(getByText('fleet health'));

    expect(style.textTransform).toBe('uppercase');
    expect(style.letterSpacing).toBeGreaterThan(1);
  });

  describe('tone resolves to a palette value', () => {
    const dark = Colors.dark;

    it.each([
      ['default', dark.fg],
      ['muted', dark.fgMuted],
      ['subtle', dark.fgSubtle],
      ['accent', dark.accent2],
      ['success', dark.success],
      ['warning', dark.warning],
      ['danger', dark.danger],
      ['onAccent', '#FFFFFF'],
    ] as const)('%s → %s', (tone, expected) => {
      const { getByText } = render(<Text tone={tone}>x</Text>);
      expect(styleOf(getByText('x')).color).toBe(expected);
    });
  });

  it('lets an explicit style win, so spacing utilities and overrides still work', () => {
    const { getByText } = render(
      <Text variant="body.md" style={{ fontSize: 99, marginTop: 8 }}>
        x
      </Text>,
    );
    const style = styleOf(getByText('x'));

    expect(style.fontSize).toBe(99);
    expect(style.marginTop).toBe(8);
    // The family still comes from the variant — only what was overridden changes.
    expect(style.fontFamily).toBe(FontFamily.sans);
  });

  it('passes through the props callers depend on', () => {
    const { getByText } = render(
      <Text numberOfLines={2} accessibilityLabel="described">
        x
      </Text>,
    );
    const el = getByText('x');

    expect(el.props.numberOfLines).toBe(2);
    expect(el.props.accessibilityLabel).toBe('described');
  });
});

describe('Typography roles', () => {
  it('keeps every display role on a serif and every mono role on the mono family', () => {
    for (const style of Object.values(Type.display)) {
      expect(style.fontFamily).toMatch(/^Newsreader_/);
    }
    for (const style of Object.values(Type.mono)) {
      expect(style.fontFamily).toMatch(/^JetBrainsMono_/);
    }
    for (const style of Object.values(Type.body)) {
      expect(style.fontFamily).toMatch(/^Inter_/);
    }
  });

  it('has a line height at least the font size for every role', () => {
    const all = { ...Type.display, ...Type.body, ...Type.mono } as Record<
      string,
      { fontSize: number; lineHeight?: number }
    >;
    for (const [name, style] of Object.entries(all)) {
      if (style.lineHeight == null) continue;
      expect(`${name}:${style.lineHeight >= style.fontSize}`).toBe(`${name}:true`);
    }
  });
});
