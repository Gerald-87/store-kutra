import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchStores } from '../store/slices/storesSlice';
import { Store } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { StoreStackParamList } from '../navigation/AppNavigator';

type StoreListScreenNavigationProp = StackNavigationProp<StoreStackParamList, 'StoreList'>;

const StoreListScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<StoreListScreenNavigationProp>();
  const { items: stores, isLoading } = useSelector((state: RootState) => state.stores);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    console.log('Stores changed:', stores.length, 'stores available');
    console.log('Store names:', stores.map(s => s.name));
    filterStores();
  }, [stores, searchQuery]);

  const loadStores = async () => {
    try {
      console.log('Loading stores...');
      await dispatch(fetchStores());
      console.log('Stores loaded successfully');
    } catch (error) {
      console.error('Error loading stores:', error);
      Alert.alert('Error', 'Failed to load stores. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStores();
    setRefreshing(false);
  };

  const filterStores = () => {
    console.log('Filtering stores. Search query:', searchQuery);
    console.log('Available stores before filtering:', stores.length);
    
    if (!searchQuery.trim()) {
      setFilteredStores(stores);
      console.log('No search query, showing all stores:', stores.length);
      return;
    }

    const filtered = stores.filter(store =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.categories?.some(category =>
        category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    
    console.log('Filtered stores:', filtered.length);
    setFilteredStores(filtered);
  };

  const handleStorePress = async (store: Store) => {
    try {
      navigation.navigate('StoreDetail', { store });
    } catch (error) {
      console.error('Error handling store press:', error);
    }
  };

  const renderStoreItem = ({ item }: { item: Store }) => (
    <TouchableOpacity
      style={styles.storeItem}
      onPress={() => handleStorePress(item)}
    >
      <View style={styles.storeImageContainer}>
        <Image
          source={{
            uri: item.logoBase64
              ? `data:image/jpeg;base64,${item.logoBase64}`
              : item.logoUrl || 'https://placehold.co/80x80.png?text=Store'
          }}
          style={styles.storeImage}
          resizeMode="cover"
        />
        {!item.isActive && (
          <View style={styles.inactiveOverlay}>
            <Text style={styles.inactiveText}>Closed</Text>
          </View>
        )}
      </View>

      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>
          {item.name}
        </Text>
        
        <View style={styles.storeMetrics}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#D2B48C" />
            <Text style={styles.ratingText}>
              {item.averageRating ? item.averageRating.toFixed(1) : 'New'}
            </Text>
            {item.numberOfRatings && (
              <Text style={styles.ratingCount}>({item.numberOfRatings})</Text>
            )}
          </View>

          {item.deliveryFee !== undefined && (
            <View style={styles.deliveryContainer}>
              <Ionicons name="bicycle-outline" size={14} color="#8B7355" />
              <Text style={styles.deliveryText}>
                K{item.deliveryFee === 0 ? 'Free' : item.deliveryFee.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {item.operatingHours && (
          <View style={styles.hoursContainer}>
            <Ionicons name="time-outline" size={12} color="#8B7355" />
            <Text style={styles.hoursText}>{item.operatingHours}</Text>
          </View>
        )}
      </View>

      <View style={styles.storeActions}>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={20} color="#8B7355" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.chatButton}>
          <Ionicons name="chatbubble-outline" size={18} color="#8B4513" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="storefront-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyStateTitle}>
        {searchQuery ? 'No stores found' : 'No stores available'}
      </Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? 'Try adjusting your search terms'
          : 'Stores will appear here when available'}
      </Text>
      {searchQuery && (
        <TouchableOpacity
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#8B7355" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stores..."
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
      </View>

      {/* Store List */}
      <FlatList
        data={filteredStores}
        renderItem={renderStoreItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.storeRow}
        contentContainerStyle={[
          styles.listContainer,
          filteredStores.length === 0 && styles.emptyListContainer,
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
      />

      {/* Stats */}
      {filteredStores.length > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {filteredStores.length} store{filteredStores.length !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#2D1810',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  storeItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 0.48,
  },
  storeRow: {
    justifyContent: 'space-between',
  },
  storeImageContainer: {
    position: 'relative',
    marginBottom: 12,
    alignItems: 'center',
  },
  storeImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  inactiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storeContent: {
    flex: 1,
    alignItems: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1810',
    marginBottom: 4,
    textAlign: 'center',
  },
  storeMetrics: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#2D1810',
    marginLeft: 4,
    fontWeight: '500',
  },
  ratingCount: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 2,
  },
  deliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryTag: {
    backgroundColor: '#F5F1ED',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#8B4513',
    fontWeight: '500',
  },
  moreCategoriesText: {
    fontSize: 10,
    color: '#8B7355',
    fontStyle: 'italic',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
  },
  storeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  favoriteButton: {
    padding: 8,
    marginRight: 8,
  },
  chatButton: {
    backgroundColor: '#F5F1ED',
    borderRadius: 20,
    padding: 8,
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
  clearSearchButton: {
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E2DD',
  },
  statsText: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
  },
});

export default StoreListScreen;