import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchStoreListings } from '../store/slices/listingsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Store, Listing, ListingCategory } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { StoreStackParamList } from '../navigation/AppNavigator';
import { RatingDisplay } from '../components/Rating';
import RatingModal from '../components/RatingModal';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

type StoreDetailScreenNavigationProp = StackNavigationProp<StoreStackParamList, 'StoreDetail'>;
type StoreDetailScreenRouteProp = RouteProp<StoreStackParamList, 'StoreDetail'>;

const { width } = Dimensions.get('window');

const StoreDetailScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Listing[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'All'>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<StoreDetailScreenNavigationProp>();
  const route = useRoute<StoreDetailScreenRouteProp>();
  const { store } = route.params;

  const listings = useSelector((state: RootState) => state.listings) as any;
  const cart = useSelector((state: RootState) => state.cart) as any;
  const auth = useSelector((state: RootState) => state.auth) as any;
  
  const storeListings = listings?.storeListings || {};
  const filteredStoreListings = listings?.filteredStoreListings || {};
  const isLoading = listings?.isLoading || false;
  const user = auth?.user;
  const isAuthenticated = auth?.isAuthenticated || false;

  useEffect(() => {
    loadStoreProducts();
  }, []);

  useEffect(() => {
    console.log('Store listings changed for store:', store.id);
    console.log('Available store listings:', Object.keys(storeListings));
    console.log('Available filtered listings:', Object.keys(filteredStoreListings));
    
    // Use filtered listings if available, otherwise fall back to regular listings
    const availableListings = filteredStoreListings[store.id] || storeListings[store.id];
    
    if (availableListings) {
      console.log('Found products for store:', store.id, 'Count:', availableListings.length);
      setProducts(availableListings);
    } else {
      console.log('No products found for store:', store.id);
      setProducts([]);
    }
  }, [storeListings, filteredStoreListings, store.id]);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const initializeChat = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('Login Required', 'Please login to start a chat');
      return;
    }

    if (!store.ownerId || store.ownerId === user.uid) {
      Alert.alert('Error', 'Cannot chat with yourself');
      return;
    }

    try {
      // Create conversation ID based on user IDs
      const conversationId = [user.uid, store.ownerId].sort().join('_');
      
      // Navigate to conversation screen
      navigation.navigate('Conversation' as any, {
        conversationId,
        otherUserId: store.ownerId,
        otherUserName: store.name || 'Store Owner',
        listingId: undefined, // This is a store chat, not product-specific
      });
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  const loadStoreProducts = async () => {
    try {
      console.log('Loading products for store:', store.id, 'ownerId:', store.ownerId);
      await dispatch(fetchStoreListings({ storeId: store.id, store }));
      console.log('Finished loading products for store:', store.id);
    } catch (error) {
      console.error('Error loading store products:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStoreProducts();
    setRefreshing(false);
  };

  const handleAddToCart = (product: Listing) => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to add items to cart.');
      return;
    }
    dispatch(addToCart({ listing: product, quantity: 1 }));
    Alert.alert('Added to Cart', `${product.title} has been added to your cart.`);
  };

  const handleProductPress = (product: Listing) => {
    navigation.navigate('ProductDetail', { 
      productId: product.id, 
      listingId: product.id 
    });
  };

  const handleCartPress = () => {
    // Navigate directly to cart when cart icon is clicked
    (navigation as any).navigate('Cart');
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to checkout.');
      return;
    }
    
    if (!cart?.items || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout.');
      return;
    }

    Alert.alert(
      'Delivery Options',
      'How would you like to receive your order?',
      [
        {
          text: 'Store Pickup',
          onPress: () => navigateToCheckout('pickup')
        },
        {
          text: 'Store Delivery',
          onPress: () => navigateToCheckout('store_delivery')
        },
        {
          text: 'Third Party Delivery',
          onPress: () => navigateToCheckout('third_party')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const navigateToCheckout = (deliveryMethod: string) => {
    // Navigate to checkout with delivery method
    console.log('Navigate to checkout with:', deliveryMethod);
  };

  const handleRateStore = async (rating: number, review?: string) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Login Required', 'Please login to rate this store.');
      return;
    }

    try {
      // Add rating to Firestore
      await addDoc(collection(db, 'storeRatings'), {
        storeId: store.id,
        userId: user.uid,
        userName: user.name,
        rating,
        review: review || null,
        createdAt: new Date().toISOString(),
      });

      // Update store's rating statistics
      const storeRef = doc(db, 'stores', store.id);
      await updateDoc(storeRef, {
        totalRatingSum: increment(rating),
        numberOfRatings: increment(1),
        averageRating: (store.totalRatingSum + rating) / (store.numberOfRatings + 1),
      });

      console.log('Store rating submitted successfully');
    } catch (error) {
      console.error('Error submitting store rating:', error);
      throw error;
    }
  };

  // Get available categories from products
  const getAvailableCategories = () => {
    const categories = Array.from(new Set(products.map(product => product.category)));
    return ['All', ...categories.sort()];
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const renderCategoryFilter = (category: string) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.selectedCategoryButton
      ]}
      onPress={() => setSelectedCategory(category as ListingCategory | 'All')}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCategory === category && styles.selectedCategoryButtonText
      ]}>
        {category}
      </Text>
    </TouchableOpacity>
  );

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#D2B48C" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#D2B48C" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#D2B48C" />
      );
    }

    return stars;
  };

  const renderProductItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.95}
    >
      <Image
        source={{
          uri: item.imageBase64 
            ? `data:image/jpeg;base64,${item.imageBase64}` 
            : item.imageUrl || 'https://placehold.co/200x200.png?text=No+Image'
        }}
        style={styles.productImage}
        resizeMode="cover"
      />
      {isAuthenticated && (
        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={() => handleAddToCart(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color="#8B4513" />
        </TouchableOpacity>
      )}
      <View style={styles.productContent}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productPrice}>K{item.price.toFixed(2)}</Text>
        {item.condition && (
          <Text style={styles.productCondition}>{item.condition}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{store.name}</Text>
          <View style={styles.headerSubtitle}>
            <View style={styles.ratingContainer}>
              {renderStars(store.averageRating || 0)}
              <Text style={styles.ratingText}>
                {store.averageRating ? store.averageRating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.cartButton}
          onPress={handleCartPress}
        >
          <View style={styles.cartIconContainer}>
            <Ionicons name="bag-outline" size={24} color="#2D1810" />
            {cart?.totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Store Info */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.storeInfoSection}>
          <View style={styles.storeLogoContainer}>
            <Image
              source={{
                uri: store.logoBase64 
                  ? `data:image/jpeg;base64,${store.logoBase64}`
                  : store.logoUrl || 'https://placehold.co/100x100.png?text=Store'
              }}
              style={styles.storeLogo}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.storeInfo}>
            <Text style={styles.storeDescription} numberOfLines={3}>
              {store.description}
            </Text>
            
            {/* Store Rating Display and Button */}
            <View style={styles.ratingSection}>
              <RatingDisplay 
                rating={store.averageRating || 0} 
                size={18} 
                showNumber={true} 
              />
              {store.numberOfRatings && store.numberOfRatings > 0 && (
                <Text style={styles.ratingsCount}>
                  ({store.numberOfRatings} review{store.numberOfRatings !== 1 ? 's' : ''})
                </Text>
              )}
              <View style={styles.storeActionButtons}>
                <TouchableOpacity 
                  style={styles.chatStoreButton}
                  onPress={initializeChat}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#8B4513" />
                  <Text style={styles.chatStoreButtonText}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rateButton}
                  onPress={() => setShowRatingModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star-outline" size={16} color="#8B4513" />
                  <Text style={styles.rateButtonText}>Rate Store</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.storeDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={16} color="#8B7355" />
                <Text style={styles.detailText}>{store.operatingHours || 'Open Now'}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="bicycle-outline" size={16} color="#8B7355" />
                <Text style={styles.detailText}>
                  {store.deliveryFee === 0 ? 'Free Delivery' : `K${store.deliveryFee} Delivery`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search and Filters Section */}
        <View style={styles.searchSection}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#8B7355" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#8B7355"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#8B7355" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={20} color="#8B4513" />
            </TouchableOpacity>
          </View>

          {/* Category Filters */}
          {showFilters && (
            <View style={styles.filtersContainer}>
              <View style={styles.filtersHeader}>
                <Text style={styles.filtersTitle}>Filter by Category</Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.clearFiltersText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesContainer}>
                  {getAvailableCategories().map(renderCategoryFilter)}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Results Summary */}
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {filteredProducts.length} of {products.length} products
              {searchQuery.trim() && ` for "${searchQuery}"`}
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </Text>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products ({filteredProducts.length})</Text>
          </View>
          
          {filteredProducts.length > 0 ? (
            <FlatList
              key="store-products-grid" // Add key to force re-render when numColumns changes
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              contentContainerStyle={styles.productsGrid}
              scrollEnabled={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  colors={['#8B4513']}
                  tintColor="#8B4513"
                />
              }
            />
          ) : products.length > 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="search-outline" size={48} color="#D2B48C" />
              <Text style={styles.emptyProductsTitle}>No Results Found</Text>
              <Text style={styles.emptyProductsText}>
                {searchQuery.trim() 
                  ? `No products found for "${searchQuery}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`
                  : `No products found in ${selectedCategory}`
                }
              </Text>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={48} color="#D2B48C" />
              <Text style={styles.emptyProductsTitle}>No Products</Text>
              <Text style={styles.emptyProductsText}>
                This store hasn't added any products yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRateStore}
        type="store"
        itemName={store.name}
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 2,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
    fontWeight: '500',
  },
  cartButton: {
    padding: 8,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#2D1810',
  },
  filterButton: {
    backgroundColor: '#F5F1ED',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  filtersContainer: {
    marginTop: 8,
    paddingVertical: 8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  categoryButton: {
    backgroundColor: '#F7F3F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  selectedCategoryButton: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#2D1810',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  storeInfoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  storeLogoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  storeLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F5F1ED',
  },
  storeInfo: {
    alignItems: 'center',
  },
  storeDescription: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F6F3',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  ratingsCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  storeActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  chatStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  chatStoreButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  rateButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginLeft: 4,
  },
  storeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
    fontWeight: '500',
  },
  productsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  productsGrid: {
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#F5F1ED',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F7F3F0',
  },
  quickAddButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  productContent: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
    color: '#8B4513',
    marginBottom: 2,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 4,
  },
  productCondition: {
    fontSize: 11,
    color: '#8B4513',
    fontWeight: '600',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
  },
  clearFiltersButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 16,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default StoreDetailScreen;