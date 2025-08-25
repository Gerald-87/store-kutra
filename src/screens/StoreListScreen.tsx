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
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { 
  fetchStores, 
  fetchStoresWithLocation, 
  fetchNearbyStores,
  setCurrentLocation,
  setDistanceFilter,
  filterStoresByDistance
} from '../store/slices/storesSlice';
import { Store } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { StoreStackParamList } from '../navigation/AppNavigator';
import StoreCard from '../components/StoreCard';
import LocationService from '../services/LocationService';

type StoreListScreenNavigationProp = StackNavigationProp<StoreStackParamList, 'StoreList'>;

const StoreListScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [distanceFilter, setDistanceFilterLocal] = useState(10); // km
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<StoreListScreenNavigationProp>();
  const storesState = useSelector((state: RootState) => state.stores);
  const { 
    items: stores, 
    nearbyStores,
    filteredStores: reduxFilteredStores,
    currentLocation,
    isLoading 
  } = storesState;
  
  // Use nearby stores if available and location is enabled, otherwise use all stores
  const storesToDisplay = locationEnabled && nearbyStores.length > 0 ? nearbyStores : stores;

  useEffect(() => {
    loadStores();
    checkAndLoadLocation();
  }, []);

  useEffect(() => {
    console.log('Stores changed:', storesToDisplay.length, 'stores available');
    console.log('Store names:', storesToDisplay.map(s => s.name));
    filterStores();
  }, [storesToDisplay, searchQuery]);
  
  useEffect(() => {
    // Update distance filter in Redux when local state changes
    dispatch(setDistanceFilter(distanceFilter));
    if (currentLocation) {
      dispatch(filterStoresByDistance());
    }
  }, [distanceFilter, currentLocation, dispatch]);

  const checkAndLoadLocation = async () => {
    try {
      const hasPermission = await LocationService.checkLocationPermission();
      if (hasPermission) {
        const location = await LocationService.getCurrentLocation();
        if (location) {
          setLocationEnabled(true);
          dispatch(setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude
          }));
          
          // Fetch nearby stores
          await dispatch(fetchNearbyStores({
            latitude: location.latitude,
            longitude: location.longitude,
            radiusKm: distanceFilter
          }));
        }
      }
    } catch (error) {
      console.log('Could not get location for store filtering:', error);
      setLocationEnabled(false);
    }
  };

  const loadStores = async () => {
    try {
      console.log('Loading stores...');
      await dispatch(fetchStoresWithLocation());
      console.log('Stores loaded successfully');
    } catch (error) {
      console.error('Error loading stores:', error);
      Alert.alert('Error', 'Failed to load stores. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStores(),
      checkAndLoadLocation()
    ]);
    setRefreshing(false);
  };

  const filterStores = () => {
    console.log('Filtering stores. Search query:', searchQuery);
    console.log('Available stores before filtering:', storesToDisplay.length);
    
    if (!searchQuery.trim()) {
      setFilteredStores(storesToDisplay);
      console.log('No search query, showing all stores:', storesToDisplay.length);
      return;
    }

    const filtered = storesToDisplay.filter(store =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.categories?.some(category =>
        category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    
    console.log('Filtered stores:', filtered.length);
    setFilteredStores(filtered);
  };
  
  const handleLocationToggle = async () => {
    if (!locationEnabled) {
      const hasPermission = await LocationService.requestLocationPermission();
      if (hasPermission) {
        await checkAndLoadLocation();
      } else {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to see nearby stores.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: () => {} }
          ]
        );
      }
    } else {
      setLocationEnabled(false);
      setFilteredStores(stores); // Show all stores instead of nearby
    }
  };
  
  const handleDistanceFilterChange = async (newDistance: number) => {
    setDistanceFilterLocal(newDistance);
    if (currentLocation && locationEnabled) {
      await dispatch(fetchNearbyStores({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radiusKm: newDistance
      }));
    }
  };

  const handleStorePress = async (store: Store) => {
    try {
      navigation.navigate('StoreDetail', { store });
    } catch (error) {
      console.error('Error handling store press:', error);
    }
  };

  const renderStoreItem = ({ item }: { item: Store }) => (
    <StoreCard 
      store={item} 
      onPress={handleStorePress}
      width={160}
      compact={true}
    />
  );

  const renderEmptyState = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#8B4513" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      );
    }

    return (
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
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Stores</Text>
        <Text style={styles.headerSubtitle}>
          {isLoading && !refreshing
            ? 'Loading stores...'
            : filteredStores.length > 0 
              ? `${filteredStores.length} store${filteredStores.length !== 1 ? 's' : ''} available`
              : 'No stores available'
          }
        </Text>
      </View>
      
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
      
      {/* Location Controls */}
      <View style={styles.locationControls}>
        <View style={styles.locationToggle}>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={handleLocationToggle}
          >
            <Ionicons 
              name={locationEnabled ? "location" : "location-outline"} 
              size={16} 
              color={locationEnabled ? "#8B4513" : "#8B7355"} 
            />
            <Text style={[
              styles.locationButtonText,
              locationEnabled && styles.locationButtonTextActive
            ]}>
              {locationEnabled ? 'Nearby Stores' : 'Show Nearby'}
            </Text>
          </TouchableOpacity>
          
          {locationEnabled && (
            <TouchableOpacity
              style={styles.distanceButton}
              onPress={() => setShowDistanceFilter(!showDistanceFilter)}
            >
              <Text style={styles.distanceButtonText}>{distanceFilter}km</Text>
              <Ionicons name="chevron-down" size={16} color="#8B7355" />
            </TouchableOpacity>
          )}
        </View>
        
        {locationEnabled && currentLocation && (
          <Text style={styles.locationInfo}>
            Showing stores within {distanceFilter}km of your location
          </Text>
        )}
        
        {/* Distance Filter Dropdown */}
        {showDistanceFilter && locationEnabled && (
          <View style={styles.distanceDropdown}>
            {[5, 10, 15, 20, 30].map(distance => (
              <TouchableOpacity
                key={distance}
                style={[
                  styles.distanceOption,
                  distanceFilter === distance && styles.distanceOptionActive
                ]}
                onPress={() => {
                  handleDistanceFilterChange(distance);
                  setShowDistanceFilter(false);
                }}
              >
                <Text style={[
                  styles.distanceOptionText,
                  distanceFilter === distance && styles.distanceOptionTextActive
                ]}>
                  {distance}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Store List */}
      <FlatList
        key="store-list-grid"
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
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  locationControls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    gap: 6,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  locationButtonTextActive: {
    color: '#8B4513',
    fontWeight: '600',
  },
  distanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    gap: 4,
  },
  distanceButtonText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  locationInfo: {
    fontSize: 12,
    color: '#8B7355',
    fontStyle: 'italic',
    marginTop: 8,
  },
  distanceDropdown: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2DD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  distanceOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  distanceOptionActive: {
    backgroundColor: '#F5F1ED',
  },
  distanceOptionText: {
    fontSize: 14,
    color: '#2D1810',
    fontWeight: '500',
  },
  distanceOptionTextActive: {
    color: '#8B4513',
    fontWeight: '600',
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
  storeRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
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
});

export default StoreListScreen;