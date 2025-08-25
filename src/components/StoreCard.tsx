import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Store } from '../types';

interface StoreCardProps {
  store: Store;
  onPress: (store: Store) => void;
  width?: number;
  compact?: boolean;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress, width = 220, compact = false }) => {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={12} color="#F59E0B" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={12} color="#F59E0B" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#D1D5DB" />
      );
    }

    return stars;
  };

  const getDeliveryFeeText = () => {
    if (store.deliveryFee === 0) return 'Free Delivery';
    if (store.deliveryFee) return `K${store.deliveryFee.toFixed(2)} Delivery`;
    return 'Delivery Available';
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        !store.isActive && styles.inactiveStore,
        { width },
        compact && styles.compactContainer
      ]}
      onPress={() => onPress(store)}
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: store.logoBase64 
              ? `data:image/jpeg;base64,${store.logoBase64}`
              : store.logoUrl || 'https://placehold.co/100x100.png?text=Store'
          }}
          style={styles.logo}
          resizeMode="cover"
        />
        {store.isActive ? (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
          </View>
        ) : (
          <View style={styles.inactiveIndicator}>
            <View style={styles.inactiveDot} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.storeName} numberOfLines={2} ellipsizeMode="tail">
            {store.name}
          </Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(store.averageRating || 0)}
            </View>
            <Text style={styles.ratingText}>
              {store.averageRating ? store.averageRating.toFixed(1) : 'New'}
            </Text>
            {store.numberOfRatings && store.numberOfRatings > 0 && (
              <Text style={styles.ratingCount}>({store.numberOfRatings})</Text>
            )}
          </View>
        </View>

        {/* Store description */}
        {store.description && (
          <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
            {store.description}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.deliveryInfo}>
            <Ionicons name="bicycle" size={14} color="#8B4513" />
            <Text style={styles.deliveryText}>
              {getDeliveryFeeText()}
            </Text>
          </View>
          
          <View style={styles.locationInfo}>
            <Ionicons name="time-outline" size={12} color="#8B7355" />
            <Text style={styles.operatingHours} numberOfLines={1}>
              {store.operatingHours || 'Open Now'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    marginVertical: 4,
    width: 220,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactContainer: {
    padding: 8,
    minHeight: 140,
  },
  inactiveStore: {
    opacity: 0.7,
    backgroundColor: '#F9F9F9',
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  inactiveIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 2,
  },
  description: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '400',
  },
  // Category styles removed since stores don't have categories
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 9,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 3,
    flexShrink: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  operatingHours: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 2,
    flexShrink: 1,
  },
});

export default StoreCard;