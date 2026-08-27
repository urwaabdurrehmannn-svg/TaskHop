import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface StarRatingProps {
  rating: number;
  size?: number;
  /** When provided, stars become tappable and call this with the pressed value (1-5). */
  onChange?: (rating: number) => void;
}

/** Read-only by default (e.g. profile stats, review rows); pass onChange to make it an input (RatingModal). */
export function StarRating({ rating, size = 16, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((value) => {
        const filled = value <= Math.round(rating);
        const icon = filled ? 'star' : 'star-outline';
        if (!onChange) {
          return <Ionicons key={value} name={icon} size={size} color={Colors.warning} />;
        }
        return (
          <Pressable key={value} onPress={() => onChange(value)} hitSlop={4} style={styles.starButton}>
            <Ionicons name={icon} size={size} color={Colors.warning} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
});

export default StarRating;
