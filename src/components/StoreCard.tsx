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
}

const StoreCard: React.FC<StoreCardProps> = ({ store, onPress }) => {
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
      style={styles.container}
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
        {store.isActive && (
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.storeName} numberOfLines={1}>
            {store.name}
          </Text>
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>
              {renderStars(store.averageRating || 0)}
            </View>
            <Text style={styles.ratingText}>
              {store.averageRating ? store.averageRating.toFixed(1) : 'New'}
            </Text>
          </View>
        </View>

        {/* Store details section removed since stores don't have categories */}

        <View style={styles.footer}>
          <View style={styles.deliveryInfo}>
            <Ionicons name="bicycle" size={14} color="#8B4513" />
            <Text style={styles.deliveryText}>
              {getDeliveryFeeText()}
            </Text>
          </View>
          
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={12} color="#8B7355" />
            <Text style={styles.operatingHours}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 6,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'center',
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
    textAlign: 'center',
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
    fontSize: 10,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 3,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  operatingHours: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 2,
  },
});

export default StoreCard;