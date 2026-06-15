import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

export function Skeleton({ className, style }: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[{ opacity: anim }, style]}
      className={cn('bg-border dark:bg-border-dark rounded-md', className)}
    />
  );
}

export function SkeletonRow() {
  return (
    <View className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl p-3 mb-2">
      <Skeleton className="h-3 w-1/3 mb-2" />
      <Skeleton className="h-2 w-1/2" />
    </View>
  );
}
