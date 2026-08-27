import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import type { Availability } from '../../types';

/**
 * Fixed avatar scale used everywhere in the app so avatar prominence stays
 * consistent: sm = inline mentions, md = list/row content, lg = featured
 * cards, xl = profile hero.
 */
export const AvatarSize = {
  sm: 32,
  md: 44,
  lg: 56,
  xl: 88,
} as const;

interface AvatarProps {
  name: string;
  initials: string;
  color: string;
  imageUrl?: string;
  size?: number;
  availability?: Availability;
}

const AVAILABILITY_COLOR: Record<Availability, string> = {
  available_now: Colors.success,
  available_soon: Colors.warning,
  busy: Colors.textTertiary,
};

export function Avatar({ name, initials, color, imageUrl, size = AvatarSize.md, availability }: AvatarProps) {
  const fontSize = Math.max(12, size * 0.38);
  const dotSize = Math.max(10, size * 0.28);

  return (
    <View style={{ width: size, height: size }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={name}
          style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.circle,
            styles.initialsCircle,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {availability && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: AVAILABILITY_COLOR[availability],
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
  },
  initialsCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.white,
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});

export default Avatar;
