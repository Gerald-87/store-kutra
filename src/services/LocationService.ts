// Note: Run 'npx expo install expo-location' to add location dependencies

// Fallback types for when expo-location is not installed
interface LocationObjectCoords {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

interface LocationObject {
  coords: LocationObjectCoords;
  timestamp: number;
}

interface LocationGeocodedAddress {
  city?: string;
  country?: string;
  district?: string;
  isoCountryCode?: string;
  name?: string;
  postalCode?: string;
  region?: string;
  street?: string;
  streetNumber?: string;
  subregion?: string;
  timezone?: string;
}

let Location: any = null;

// Try to import expo-location, fallback to mock if not available
try {
  Location = require('expo-location');
} catch (error) {
  console.warn('expo-location not installed. Location features will use fallback. Run: npx expo install expo-location');
  
  // Mock Location object for development
  Location = {
    requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
    getForegroundPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
    getCurrentPositionAsync: () => Promise.reject(new Error('expo-location not installed')),
    reverseGeocodeAsync: () => Promise.reject(new Error('expo-location not installed')),
    hasServicesEnabledAsync: () => Promise.resolve(false),
    Accuracy: { Balanced: 4 }
  };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

export class LocationService {
  private static currentLocation: LocationData | null = null;
  private static locationPermissionGranted: boolean = false;

  /**
   * Request location permissions from the user
   */
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.locationPermissionGranted = status === 'granted';
      return this.locationPermissionGranted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get current location with coordinates
   */
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // Check permission first
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const permissionGranted = await this.requestLocationPermission();
        if (!permissionGranted) {
          console.log('Location permission denied');
          return null;
        }
      }

      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      console.log('Current location:', locationData);
      this.currentLocation = locationData;
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get current location with reverse geocoding (address)
   */
  static async getCurrentLocationWithAddress(): Promise<LocationData | null> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) {
        return null;
      }

      console.log('Reverse geocoding location...');
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (reverseGeocode.length > 0) {
        const addressInfo = reverseGeocode[0];
        const locationWithAddress: LocationData = {
          ...location,
          address: this.formatAddress(addressInfo),
          city: addressInfo.city || addressInfo.subregion || 'Unknown City',
          country: addressInfo.country || 'Unknown Country',
        };

        console.log('Location with address:', locationWithAddress);
        this.currentLocation = locationWithAddress;
        return locationWithAddress;
      }

      return location;
    } catch (error) {
      console.error('Error getting location with address:', error);
      return await this.getCurrentLocation();
    }
  }

  /**
   * Check if location permission is granted
   */
  static async checkLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.locationPermissionGranted = status === 'granted';
      return this.locationPermissionGranted;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get cached location if available
   */
  static getCachedLocation(): LocationData | null {
    return this.currentLocation;
  }

  /**
   * Calculate distance between two points in kilometers
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Format address from reverse geocoding result
   */
  private static formatAddress(addressInfo: LocationGeocodedAddress): string {
    const parts = [];
    
    if (addressInfo.streetNumber) parts.push(addressInfo.streetNumber);
    if (addressInfo.street) parts.push(addressInfo.street);
    if (addressInfo.district) parts.push(addressInfo.district);
    if (addressInfo.city) parts.push(addressInfo.city);
    
    return parts.join(', ') || 'Unknown Location';
  }

  /**
   * Convert degrees to radians
   */
  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get location name for display (city or formatted address)
   */
  static getDisplayLocation(location: LocationData): string {
    if (location.city) {
      return location.city;
    }
    if (location.address) {
      // Return just the city part of the address if available
      const parts = location.address.split(', ');
      return parts[parts.length - 1] || location.address;
    }
    return 'Current Location';
  }

  /**
   * Check if location services are enabled
   */
  static async isLocationEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }
}

export default LocationService;