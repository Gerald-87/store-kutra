import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchFeaturedListings, fetchListings } from '../store/slices/listingsSlice';
import { fetchFeaturedStores } from '../store/slices/storesSlice';
import { fetchHeroContent } from '../store/slices/heroSlice';
import { addToCart } from '../store/slices/cartSlice';
import { ListingCategory, Listing, Store } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../navigation/AppNavigator';
import HeroCarousel from '../components/HeroCarousel';
import StoreCard from '../components/StoreCard';
import LocationService, { LocationData } from '../services/LocationService';
import NotificationService, { NotificationData } from '../services/NotificationService';
import NotificationPopup from '../components/NotificationPopup';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

const { width } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | null>(null);
  const [filteredItems, setFilteredItems] = useState<Listing[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const listings = useSelector((state: RootState) => state.listings) as any;
  const cart = useSelector((state: RootState) => state.cart) as any;
  const stores = useSelector((state: RootState) => state.stores) as any;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth) as any;
  
  const featuredItems = listings?.featuredItems || [];
  const items = listings?.items || [];
  const isLoading = listings?.isLoading || false;
  const totalItems = cart?.totalItems || 0;
  const featuredStores = stores?.featuredStores || [];

  // Debug logging
  useEffect(() => {
    console.log('HomeScreen: Featured stores changed:', featuredStores.length);
    console.log('HomeScreen: Featured store names:', featuredStores.map((s: Store) => s.name));
  }, [featuredStores]);

  useEffect(() => {
    loadData();
    loadLocation();
    
    // Subscribe to notifications for real-time updates
    if (user?.uid) {
      const notificationService = NotificationService.getInstance();
      
      // Subscribe to notifications and maintain unread count
      const unsubscribe = notificationService.subscribeToNotifications(
        user.uid,
        (notifications: NotificationData[]) => {
          // Only count notifications that are explicitly not read (read === false)
          const unread = notifications.filter(n => n.read === false).length;
          console.log('HomeScreen: Notification update - total:', notifications.length, 'unread:', unread);
          setUnreadNotifications(unread);
        }
      );

      return () => {
        console.log('HomeScreen: Unsubscribing from notifications');
        unsubscribe();
      };
    }
  }, [user?.uid]);

  // Filter content based on selected category
  useEffect(() => {
    if (selectedCategory) {
      // Filter featured items by category
      const categoryFilteredItems = featuredItems.filter((item: Listing) => 
        item.category === selectedCategory
      );
      setFilteredItems(categoryFilteredItems);
      
      // Filter stores that have products in this category
      const categoryFilteredStores = featuredStores.filter((store: Store) => 
        store.categories?.includes(selectedCategory)
      );
      setFilteredStores(categoryFilteredStores);
    } else {
      setFilteredItems(featuredItems);
      setFilteredStores(featuredStores);
    }
  }, [selectedCategory, featuredItems, featuredStores]);

  const loadLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('HomeScreen: Loading location...');
      
      // Check cached location first
      const cachedLocation = LocationService.getCachedLocation();
      if (cachedLocation) {
        setCurrentLocation(cachedLocation);
        console.log('HomeScreen: Using cached location:', cachedLocation);
        return;
      }

      // Get fresh location
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setCurrentLocation(location);
        console.log('HomeScreen: Got fresh location:', location);
      } else {
        console.log('HomeScreen: Could not get location');
      }
    } catch (error) {
      console.error('HomeScreen: Error loading location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadData = async () => {
    try {
      console.log('HomeScreen: Loading data...');
      await Promise.all([
        dispatch(fetchFeaturedListings()),
        dispatch(fetchListings({ loadMore: false })),
        dispatch(fetchFeaturedStores()),
        dispatch(fetchHeroContent()),
      ]);
      console.log('HomeScreen: Data loaded successfully');
    } catch (error) {
      console.error('HomeScreen: Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadData(),
      loadLocation()
    ]);
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Search', { query: searchQuery.trim() });
    }
  };

  const handleCategoryPress = (category: ListingCategory) => {
    if (selectedCategory === category) {
      // If same category is pressed, clear filter
      setSelectedCategory(null);
    } else {
      // Set new category filter
      setSelectedCategory(category);
    }
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

  const handleStorePress = (store: Store) => {
    navigation.navigate('StoreDetail', { store });
  };

  const handleSeeAllFeatured = () => {
    navigation.navigate('FeaturedProducts');
  };

  const handleSeeAllStores = () => {
    // Navigate to Stores tab
    navigation.getParent()?.navigate('Stores');
  };

  const handleCartPress = () => {
    // Navigate to Cart screen
    (navigation as any).navigate('Cart');
  };

  const handleLocationPress = async () => {
    try {
      const hasPermission = await LocationService.checkLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission',
          'This app needs location access to show nearby stores and services.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: () => loadLocation() }
          ]
        );
        return;
      }
      
      await loadLocation();
    } catch (error) {
      console.error('Error handling location press:', error);
      Alert.alert('Error', 'Unable to get your location. Please try again.');
    }
  };

  const categories = [
    { key: ListingCategory.ELECTRONICS, icon: 'phone-portrait', color: '#8B4513', label: 'Electronics' },
    { key: ListingCategory.FURNITURE, icon: 'bed', color: '#A0522D', label: 'Furniture' },
    { key: ListingCategory.CLOTHING, icon: 'shirt', color: '#CD853F', label: 'Fashion' },
    { key: ListingCategory.BOOKS, icon: 'library', color: '#8B7355', label: 'Books' },
    { key: ListingCategory.GROCERIES, icon: 'basket', color: '#D2B48C', label: 'Groceries' },
    { key: ListingCategory.VEGETABLES, icon: 'leaf', color: '#BC9A6A', label: 'Fresh' },
    { key: ListingCategory.AGRO, icon: 'flower', color: '#A0522D', label: 'Agriculture' },
    { key: ListingCategory.PHARMACY, icon: 'medical', color: '#8B4513', label: 'Health' },
  ];

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => {
    const isSelected = selectedCategory === item.key;
    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => handleCategoryPress(item.key)}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: isSelected ? item.color : `${item.color}30` }]}>
          <Ionicons name={item.icon as any} size={20} color={isSelected ? "white" : item.color} />
        </View>
        <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{item.label}</Text>
      </TouchableOpacity>
    );
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

  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity
      style={styles.listingItem}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.95}
    >
      <Image
        source={{ 
          uri: item.imageBase64 
            ? `data:image/jpeg;base64,${item.imageBase64}` 
            : item.imageUrl || 'https://placehold.co/200x200.png?text=No+Image'
        }}
        style={styles.listingImage}
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
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingCategory}>{item.category}</Text>
        <Text style={styles.listingPrice}>K{item.price.toFixed(2)}</Text>
        {item.condition && (
          <Text style={styles.listingCondition}>{item.condition}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderStoreCard = ({ item }: { item: Store }) => (
    <StoreCard 
      store={item} 
      onPress={handleStorePress}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <Ionicons 
              name={locationLoading ? "refresh" : "location-outline"} 
              size={20} 
              color="#8B4513" 
              style={locationLoading ? { transform: [{ rotate: '45deg' }] } : {}}
            />
            <Text style={styles.locationText}>
              {locationLoading 
                ? 'Getting location...' 
                : currentLocation 
                  ? LocationService.getDisplayLocation(currentLocation)
                  : 'Tap for location'
              }
            </Text>
          </TouchableOpacity>
          
          <View style={styles.centerContainer}>
            <Text style={styles.welcomeText}>
              Hello{user ? `, ${user.name.split(' ')[0]}` : ''}! 👋
            </Text>
            <Text style={styles.headerSubtitle}>Discover amazing products</Text>
          </View>
          
          <View style={styles.rightContainer}>
            {user && (
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => setShowNotificationPopup(true)}
              >
                <Ionicons name="notifications-outline" size={24} color="#8B4513" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications.toString()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            
            {user ? (
              <TouchableOpacity style={styles.profileButton}>
                <Image
                  source={{
                    uri: user.avatarBase64
                      ? `data:image/jpeg;base64,${user.avatarBase64}`
                      : user.avatarUrl || 'https://placehold.co/40x40.png?text=User'
                  }}
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginButton}>
                <Ionicons name="person-outline" size={24} color="#8B4513" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.cartButton}
              onPress={handleCartPress}
            >
              <View style={styles.cartIconContainer}>
                <Ionicons name="bag-outline" size={24} color="#374151" />
                {totalItems > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{totalItems}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, brands, stores..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholderTextColor="#9CA3AF"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Ionicons name="options" size={22} color="#8B4513" />
          </TouchableOpacity>
        </View>

        {/* Hero Section - Ads, Events, Promotions */}
        <HeroCarousel />

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            {selectedCategory && (
              <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
          {selectedCategory && (
            <View style={styles.filterInfo}>
              <Ionicons name="funnel" size={14} color="#8B4513" />
              <Text style={styles.filterInfoText}>
                Showing {categories.find(c => c.key === selectedCategory)?.label} items
              </Text>
            </View>
          )}
        </View>

        {/* Featured Products */}
        {filteredItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory ? 'Filtered Products' : 'Featured Products'}
              </Text>
              {!selectedCategory && (
                <TouchableOpacity onPress={handleSeeAllFeatured}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              key={`featured-grid-${selectedCategory || 'all'}`}
              data={filteredItems}
              renderItem={renderFeaturedItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContainer}
            />
          </View>
        )}

        {/* Top Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? 'Related Stores' : 'Top Stores'}
            </Text>
            {!selectedCategory && (
              <TouchableOpacity onPress={handleSeeAllStores}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {filteredStores.length > 0 ? (
            <FlatList
              data={filteredStores}
              renderItem={renderStoreCard}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storesList}
            />
          ) : (
            <View style={styles.emptyStores}>
              <Text style={styles.emptyStoresText}>
                {selectedCategory 
                  ? `No stores found for ${categories.find(c => c.key === selectedCategory)?.label}`
                  : isLoading ? 'Loading stores...' : 'No stores available'
                }
              </Text>
            </View>
          )}
        </View>
    </ScrollView>
    
    {/* Notification Popup */}
    <NotificationPopup
      visible={showNotificationPopup}
      onClose={() => {
        console.log('HomeScreen: Closing notification popup');
        setShowNotificationPopup(false);
      }}
      onNotificationsUpdate={(unreadCount) => {
        console.log('HomeScreen: Notification update from popup - unread count:', unreadCount);
        setUnreadNotifications(unreadCount);
      }}
      onNotificationPress={(notification) => {
        console.log('HomeScreen: Notification pressed:', notification.type);
        // Handle navigation based on notification type
        switch (notification.type) {
          case 'order':
            if (notification.data?.orderId) {
              // Navigate to order details or order list
            }
            break;
          case 'product':
            // Navigate to product details or product list
            break;
          case 'message':
            navigation.getParent()?.navigate('Chat');
            break;
          default:
            break;
        }
      }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 0.2,
  },
  locationText: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 0.6,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '400',
    textAlign: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 0.2,
    justifyContent: 'flex-end',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  profileButton: {
    padding: 2,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  loginButton: {
    padding: 4,
  },
  cartButton: {
    padding: 4,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    letterSpacing: -0.3,
  },
  seeAllText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#F5F1ED',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  categoryTextSelected: {
    color: '#8B4513',
    fontWeight: '700',
  },
  clearFilterText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 4,
  },
  filterInfoText: {
    fontSize: 12,
    color: '#8B7355',
    fontStyle: 'italic',
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
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
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

  listingItem: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    flex: 0.48,
  },
  listingImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F3F4F6',
  },
  listingContent: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
    lineHeight: 18,
  },
  listingCategory: {
    fontSize: 12,
    color: '#8B4513',
    marginBottom: 2,
    fontWeight: '600',
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 4,
  },
  listingCondition: {
    fontSize: 12,
    color: '#8B4513',
    fontWeight: '600',
    backgroundColor: '#F5F1ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quickAddButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storesList: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  emptyStores: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyStoresText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
});

export default HomeScreen;