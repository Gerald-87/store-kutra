import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchFeaturedListings } from '../store/slices/listingsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Listing } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/AppNavigator';

type FeaturedProductsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'FeaturedProducts'>;

const FeaturedProductsScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<FeaturedProductsScreenNavigationProp>();
  const { featuredItems, isLoading } = useSelector((state: RootState) => state.listings);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      await dispatch(fetchFeaturedListings());
    } catch (error) {
      console.error('Error loading featured products:', error);
      Alert.alert('Error', 'Failed to load featured products. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeaturedProducts();
    setRefreshing(false);
  };

  const handleProductPress = (listing: Listing) => {
    navigation.navigate('ProductDetail', { 
      productId: listing.id, 
      listingId: listing.id 
    });
  };

  const handleAddToCart = (listing: Listing) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart.');
      return;
    }
    dispatch(addToCart({ listing, quantity: 1 }));
  };

  const renderFeaturedItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.featuredItem}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.95}
    >
      <Image
        source={{ 
          uri: item.imageBase64 
            ? `data:image/jpeg;base64,${item.imageBase64}` 
            : item.imageUrl || 'https://placehold.co/200x200.png?text=No+Image'
        }}
        style={styles.featuredImage}
        resizeMode="cover"
      />
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.featuredAddButton}
          onPress={() => handleAddToCart(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="white" />
        </TouchableOpacity>
      )}
      <View style={styles.featuredContent}>
        <Text style={styles.featuredTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.featuredPrice}>K{item.price.toFixed(2)}</Text>
        <Text style={styles.featuredSeller} numberOfLines={1}>
          by {item.sellerName}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading featured products...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="star-outline" size={64} color="#D2B48C" />
        <Text style={styles.emptyStateTitle}>No Featured Products</Text>
        <Text style={styles.emptyStateText}>
          Featured products will appear here when available
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Featured Products</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        key="featured-products-grid"
        data={featuredItems}
        renderItem={renderFeaturedItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.listContainer,
          featuredItems.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  featuredItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    flex: 0.48,
  },
  featuredImage: {
    width: '100%',
    height: 160,
  },
  featuredContent: {
    padding: 16,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 6,
    lineHeight: 20,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 8,
  },
  featuredSeller: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  featuredAddButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#8B4513',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#8B7355',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default FeaturedProductsScreen;