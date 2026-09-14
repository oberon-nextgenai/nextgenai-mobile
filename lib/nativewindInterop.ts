import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { cssInterop } from 'nativewind';

/**
 * NativeWind registration for Reanimated components.
 *
 * NativeWind only converts `className` for components it has been told about —
 * the same rule that makes `cssInterop(Text, …)` necessary in
 * `components/ui/Text.tsx`. Reanimated's components were never registered, and
 * under Reanimated 3 they did not need to be: the animated wrapper spread
 * unrecognised props onto the component underneath, which IS registered, so
 * `className` arrived one level down and was converted there.
 *
 * Reanimated 4 no longer forwards it. Every `<Animated.View className="…">`
 * and every animated `Pressable` in the app silently lost its styles at the
 * SDK 53 → 57 upgrade — margins, gaps, padding and, most visibly, `flex-row`,
 * which is why menu rows stacked their icon above their label. Nothing
 * errored; the classes simply stopped arriving.
 */

/** `Animated.View` is one shared component type — register it once. */
cssInterop(Animated.View, { className: 'style' });

/**
 * The app's animated pressable.
 *
 * `createAnimatedComponent` mints a NEW component type per call, so a single
 * registration cannot cover repeated calls — nineteen files each declared
 * their own identical `AnimatedPressable`, and every one of them would need
 * registering separately. One shared component makes that impossible to get
 * wrong, and is what those nineteen copies should always have been.
 *
 * Components styled only through props (`AnimatedPath` in `ui/Sparkline.tsx`,
 * which takes SVG attributes and no `className`) need no registration.
 */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: 'style' });
