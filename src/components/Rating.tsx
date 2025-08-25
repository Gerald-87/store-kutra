import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingProps {
  currentRating?: number;
  size?: number;
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
  showLabel?: boolean;
  label?: string;
}

const Rating: React.FC<RatingProps> = ({
  currentRating = 0,
  size = 20,
  readonly = false,
  onRatingChange,
  showLabel = false,
  label = '',
}) => {
  const [rating, setRating] = useState(currentRating);

  const handleRatingPress = (newRating: number) => {
    if (readonly) return;
    
    setRating(newRating);
    onRatingChange?.(newRating);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating;
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRatingPress(i)}
          disabled={readonly}
          style={styles.starButton}
        >
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? '#FFD700' : '#D1D5DB'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showLabel && label && (
        <Text style={styles.label}>{label}</Text>
      )}
      {showLabel && (
        <Text style={styles.ratingText}>
          {rating > 0 ? `${rating}/5` : 'No rating'}
        </Text>
      )}
    </View>
  );
};

interface RatingDisplayProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  size = 16,
  showNumber = true,
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 1; i <= 5; i++) {
      let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
      
      if (i <= fullStars) {
        iconName = 'star';
      } else if (i === fullStars + 1 && hasHalfStar) {
        iconName = 'star-half';
      }
      
      stars.push(
        <Ionicons
          key={i}
          name={iconName}
          size={size}
          color="#FFD700"
          style={styles.displayStar}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.displayContainer}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      {showNumber && (
        <Text style={[styles.ratingNumber, { fontSize: size * 0.8 }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  starButton: {
    padding: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayStar: {
    marginRight: 1,
  },
  ratingNumber: {
    color: '#374151',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default Rating;