import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LocationService, { LocationData } from '../services/LocationService';
import { LocationInfo } from '../types';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationInfo) => void;
  currentLocation?: LocationInfo | null;
  title?: string;
}

interface LocationSuggestion {
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  onClose,
  onLocationSelect,
  currentLocation,
  title = 'Select Location'
}) => {
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
      if (currentLocation) {
        setSearchText(currentLocation.address);
      }
    }
  }, [visible, currentLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await LocationService.getCurrentLocationWithAddress();
      if (location) {
        setUserLocation(location);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!userLocation) {
      Alert.alert('Error', 'Could not get your current location');
      return;
    }

    const locationInfo: LocationInfo = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      address: userLocation.address || '',
      city: userLocation.city || '',
      country: userLocation.country || 'Zambia',
    };

    onLocationSelect(locationInfo);
    onClose();
  };

  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // Mock search results - in a real app, you'd use a geocoding service
      const mockResults: LocationSuggestion[] = [
        {
          address: `${query}, Lusaka, Zambia`,
          latitude: -15.4167 + Math.random() * 0.1,
          longitude: 28.2833 + Math.random() * 0.1,
          city: 'Lusaka',
          country: 'Zambia'
        },
        {
          address: `${query}, Ndola, Zambia`,
          latitude: -12.9667 + Math.random() * 0.1,
          longitude: 28.6333 + Math.random() * 0.1,
          city: 'Ndola',
          country: 'Zambia'
        },
        {
          address: `${query}, Kitwe, Zambia`,
          latitude: -12.8167 + Math.random() * 0.1,
          longitude: 28.2167 + Math.random() * 0.1,
          city: 'Kitwe',
          country: 'Zambia'
        }
      ];

      setSuggestions(mockResults);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    const locationInfo: LocationInfo = {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address,
      city: suggestion.city || '',
      country: suggestion.country || 'Zambia',
    };

    onLocationSelect(locationInfo);
    onClose();
  };

  const renderLocationSuggestion = (suggestion: LocationSuggestion, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.suggestionItem}
      onPress={() => handleLocationSelect(suggestion)}
    >
      <Ionicons name="location-outline" size={20} color="#8B4513" />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
        <Text style={styles.suggestionCity}>
          {suggestion.city}, {suggestion.country}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#2D1810" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#8B7355" />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                searchLocations(text);
              }}
              placeholder="Search for a location..."
              placeholderTextColor="#8B7355"
              autoFocus
            />
            {searchLoading && (
              <ActivityIndicator size="small" color="#8B4513" />
            )}
          </View>
        </View>

        {/* Current Location Option */}
        {userLocation && (
          <View style={styles.currentLocationSection}>
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
              disabled={loading}
            >
              <Ionicons 
                name={loading ? "refresh" : "locate"} 
                size={24} 
                color="#8B4513" 
              />
              <View style={styles.currentLocationText}>
                <Text style={styles.currentLocationTitle}>
                  {loading ? 'Getting location...' : 'Use Current Location'}
                </Text>
                {userLocation && !loading && (
                  <Text style={styles.currentLocationAddress}>
                    {userLocation.address}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {suggestions.length > 0 ? (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {suggestions.map((suggestion, index) => 
                renderLocationSuggestion(suggestion, index)
              )}
            </View>
          ) : searchText.length >= 3 && !searchLoading ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="location-outline" size={48} color="#D2B48C" />
              <Text style={styles.noResultsText}>No locations found</Text>
              <Text style={styles.noResultsSubtext}>
                Try searching with different keywords
              </Text>
            </View>
          ) : null}

          {/* Popular Locations */}
          {!searchText && (
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>Popular Locations in Zambia</Text>
              
              {[
                { name: 'Lusaka Central', address: 'Lusaka Central, Lusaka, Zambia', lat: -15.4167, lng: 28.2833 },
                { name: 'Cairo Road', address: 'Cairo Road, Lusaka, Zambia', lat: -15.4100, lng: 28.2850 },
                { name: 'Ndola Central', address: 'Ndola Central, Ndola, Zambia', lat: -12.9667, lng: 28.6333 },
                { name: 'Kitwe Central', address: 'Kitwe Central, Kitwe, Zambia', lat: -12.8167, lng: 28.2167 },
                { name: 'Livingstone', address: 'Livingstone, Southern Province, Zambia', lat: -17.8419, lng: 25.8561 },
              ].map((location, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularLocationItem}
                  onPress={() => handleLocationSelect({
                    address: location.address,
                    latitude: location.lat,
                    longitude: location.lng,
                    city: location.address.split(',')[1]?.trim(),
                    country: 'Zambia'
                  })}
                >
                  <Ionicons name="location" size={20} color="#8B4513" />
                  <View style={styles.popularLocationText}>
                    <Text style={styles.popularLocationName}>{location.name}</Text>
                    <Text style={styles.popularLocationAddress}>{location.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2D1810',
  },
  currentLocationSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentLocationText: {
    marginLeft: 16,
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
  },
  currentLocationAddress: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  resultsContainer: {
    flex: 1,
  },
  suggestionsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    marginLeft: 16,
    flex: 1,
  },
  suggestionAddress: {
    fontSize: 16,
    color: '#2D1810',
    fontWeight: '500',
  },
  suggestionCity: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1810',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    marginTop: 8,
  },
  popularSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 16,
  },
  popularLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  popularLocationText: {
    marginLeft: 16,
    flex: 1,
  },
  popularLocationName: {
    fontSize: 16,
    color: '#2D1810',
    fontWeight: '600',
  },
  popularLocationAddress: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
});

export default LocationPicker;