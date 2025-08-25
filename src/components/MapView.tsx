import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationInfo, PropertyType } from '../types';

interface MapViewProps {
  visible: boolean;
  onClose: () => void;
  location: LocationInfo;
  title?: string;
  propertyType?: PropertyType;
  showDirections?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  visible,
  onClose,
  location,
  title = 'Location',
  propertyType,
  showDirections = true
}) => {
  const [mapLoading, setMapLoading] = useState(false);

  const getPropertyIcon = () => {
    switch (propertyType) {
      case PropertyType.HOUSE:
        return 'home';
      case PropertyType.APARTMENT:
        return 'business';
      case PropertyType.CAR:
        return 'car';
      case PropertyType.MOTORCYCLE:
        return 'bicycle';
      default:
        return 'location';
    }
  };

  const getPropertyColor = () => {
    switch (propertyType) {
      case PropertyType.HOUSE:
        return '#10B981';
      case PropertyType.APARTMENT:
        return '#3B82F6';
      case PropertyType.CAR:
        return '#EF4444';
      case PropertyType.MOTORCYCLE:
        return '#F59E0B';
      default:
        return '#8B4513';
    }
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open maps application');
        }
      })
      .catch(err => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Failed to open directions');
      });
  };

  const handleOpenInMaps = () => {
    // Try different map apps
    const mapUrls = [
      `geo:${location.latitude},${location.longitude}`, // Android default
      `maps://maps.apple.com/?q=${location.latitude},${location.longitude}`, // Apple Maps
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`, // Google Maps web
    ];

    const tryOpenMap = async (index: number = 0) => {
      if (index >= mapUrls.length) {
        Alert.alert('Error', 'No map application available');
        return;
      }

      try {
        const canOpen = await Linking.canOpenURL(mapUrls[index]);
        if (canOpen) {
          await Linking.openURL(mapUrls[index]);
        } else {
          tryOpenMap(index + 1);
        }
      } catch (error) {
        tryOpenMap(index + 1);
      }
    };

    tryOpenMap();
  };

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
  };

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
          <TouchableOpacity onPress={handleOpenInMaps}>
            <Ionicons name="open-outline" size={24} color="#8B4513" />
          </TouchableOpacity>
        </View>

        {/* Map Container (Placeholder) */}
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapGrid}>
              {/* Create a grid pattern to simulate map */}
              {Array.from({ length: 20 }).map((_, index) => (
                <View key={index} style={styles.gridLine} />
              ))}
            </View>
            
            {/* Location Marker */}
            <View style={[styles.marker, { backgroundColor: getPropertyColor() }]}>
              <Ionicons name={getPropertyIcon() as any} size={20} color="#FFFFFF" />
            </View>
            
            {/* Map Overlay */}
            <View style={styles.mapOverlay}>
              <Text style={styles.mapNote}>
                📍 Interactive map would be displayed here
              </Text>
              <Text style={styles.mapSubnote}>
                (Requires react-native-maps integration)
              </Text>
            </View>
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIcon}>
              <Ionicons name={getPropertyIcon() as any} size={24} color={getPropertyColor()} />
            </View>
            <View style={styles.locationText}>
              <Text style={styles.locationAddress}>{location.address}</Text>
              <Text style={styles.locationCity}>
                {location.city}, {location.country}
              </Text>
            </View>
          </View>

          {/* Coordinates */}
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesLabel}>Coordinates</Text>
            <Text style={styles.coordinatesText}>
              {formatCoordinates(location.latitude, location.longitude)}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {showDirections && (
              <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
                <Ionicons name="navigate" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Get Directions</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]} 
              onPress={handleOpenInMaps}
            >
              <Ionicons name="map" size={20} color="#8B4513" />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Open in Maps
              </Text>
            </TouchableOpacity>
          </View>

          {/* Distance Estimation */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={16} color="#8B7355" />
              <Text style={styles.infoText}>
                Tap "Get Directions" to see route and travel time
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#8B7355" />
              <Text style={styles.infoText}>
                Best to contact owner for exact meeting arrangements
              </Text>
            </View>
          </View>
        </View>
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
  mapContainer: {
    flex: 1,
    backgroundColor: '#E8E2DD',
  },
  mapPlaceholder: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridLine: {
    width: '10%',
    height: '10%',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
    opacity: 0.3,
  },
  marker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  mapNote: {
    fontSize: 14,
    color: '#2D1810',
    fontWeight: '600',
    textAlign: 'center',
  },
  mapSubnote: {
    fontSize: 12,
    color: '#8B7355',
    textAlign: 'center',
    marginTop: 4,
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F7F3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationText: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    lineHeight: 20,
  },
  locationCity: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
  },
  coordinatesContainer: {
    backgroundColor: '#F7F3F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  coordinatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    color: '#2D1810',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#8B4513',
  },
  infoContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#8B7355',
    flex: 1,
    lineHeight: 16,
  },
});

export default MapView;