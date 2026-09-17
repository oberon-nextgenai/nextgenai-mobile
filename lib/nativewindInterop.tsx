import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

/**
 * NativeWind interop for Reanimated components.
 *
 * NativeWind only converts `className` for components it has been told about —
 * the same rule that makes `cssInterop(Text, …)` necessary in
 * `components/ui/Text.tsx`. Reanimated's components were never registered, and
 * under Reanimated 3 they did not need to be: the animated wrapper spread
 * unrecognised props onto the component underneath, which IS registered, so
 * `className` arrived one level down and was converted there.
 *
 * Reanimated 4 no longer forwards it. Every animated `Pressable` in the app
 * silently lost its styles at the SDK 53 → 57 upgrade — margins, gaps, padding
 * and, most visibly, `flex-row`, which is why menu rows stacked their icon
 * above their label. Nothing errored; the classes simply stopped arriving.
 */

/** `Animated.View` is one shared component type — register it once. */
cssInterop(Animated.View, { className: 'style' });

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type BaseProps = ComponentProps<typeof AnimatedPressableBase>;

export interface AnimatedPressableProps extends Omit<BaseProps, 'children' | 'className' | 'key'> {
  className?: string;
  children?: ReactNode;
  /** Applied to the inner styled view, for callers that need it. */
  contentProps?: Omit<ViewProps, 'className' | 'children'>;
}

/**
 * The app's animated pressable: Reanimated transforms on the outside, NativeWind
 * classes on a plain `View` inside.
 *
 * Registering the animated component with `cssInterop` does not work on Android
 * — measured on device, a `size="md"` GradientButton (`px-4 py-3`) laid out at
 * 21pt tall, i.e. bare text height with every class dropped, while plain views
 * on the same screen styled correctly. Both spellings were tried: registering
 * the component and relying on NativeWind's JSX lookup, and rendering the
 * wrapper `cssInterop` returns. Neither delivered the classes.
 *
 * So the classes go where they are known to work. The outer pressable carries
 * only the animated `style`; this inner view carries `className` and is what
 * paints background, border, radius and padding. It wraps its children tightly,
 * so the pressable still sizes to the styled box and the touch target is
 * unchanged.
 *
 * `createAnimatedComponent` also mints a NEW component type per call, so a
 * single registration could never have covered repeated calls — nineteen files
 * each declared their own identical `AnimatedPressable`. One shared component
 * makes that impossible to get wrong, and is what those nineteen should always
 * have been.
 */
export const AnimatedPressable = forwardRef<
  ComponentRef<typeof AnimatedPressableBase>,
  AnimatedPressableProps
>(function AnimatedPressable({ className, children, contentProps, style, ...rest }, ref) {
  return (
    <AnimatedPressableBase ref={ref} style={style} {...rest}>
      <View {...contentProps} className={className}>
        {children}
      </View>
    </AnimatedPressableBase>
  );
});
