import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Store } from '../../types';
import LocationService from '../../services/LocationService';

interface LocationFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

interface StoresState {
  items: Store[];
  featuredStores: Store[];
  nearbyStores: Store[];
  filteredStores: Store[];
  isLoading: boolean;
  error: string | null;
  currentLocation: { latitude: number; longitude: number } | null;
  locationFilter: LocationFilter | null;
  distanceFilter: number; // in kilometers
}

const initialState: StoresState = {
  items: [],
  featuredStores: [],
  nearbyStores: [],
  filteredStores: [],
  isLoading: false,
  error: null,
  currentLocation: null,
  locationFilter: null,
  distanceFilter: 10, // Default 10km radius
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Fetch stores near a specific location
export const fetchNearbyStores = createAsyncThunk(
  'stores/fetchNearbyStores',
  async ({ latitude, longitude, radiusKm = 10 }: LocationFilter) => {
    try {
      console.log(`Fetching stores within ${radiusKm}km of`, { latitude, longitude });
      
      // Fetch all stores first (since Firestore doesn't support geospatial queries without GeoPoint)
      const q = query(
        collection(db, 'stores'),
        where('isActive', '==', true),
        limit(100) // Increase limit for better location filtering
      );
      
      const querySnapshot = await getDocs(q);
      const allStores: Store[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const store = {
          ...data,
          id: doc.id,
          // Convert Firestore timestamps to ISO strings
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as unknown as Store;
        allStores.push(store);
      });
      
      // Filter stores by distance and add distance property
      const nearbyStores = allStores
        .map(store => {
          if (store.lat && store.lng) {
            const distance = calculateDistance(
              latitude, 
              longitude, 
              store.lat, 
              store.lng
            );
            return { ...store, distance };
          }
          return null;
        })
        .filter((store): store is Store & { distance: number } => 
          store !== null && store.distance <= radiusKm
        )
        .sort((a, b) => a.distance - b.distance); // Sort by distance
      
      console.log(`Found ${nearbyStores.length} stores within ${radiusKm}km`);
      return nearbyStores;
    } catch (error) {
      console.error('Error fetching nearby stores:', error);
      throw error;
    }
  }
);

// Fetch stores and get current location
export const fetchStoresWithLocation = createAsyncThunk(
  'stores/fetchStoresWithLocation',
  async (_, { dispatch }) => {
    try {
      // First fetch all stores
      const storesResult = await dispatch(fetchStores());
      
      // Try to get current location for nearby filtering
      try {
        const location = await LocationService.getCurrentLocation();
        if (location) {
          console.log('Got current location:', location);
          // Fetch nearby stores with the current location
          await dispatch(fetchNearbyStores({
            latitude: location.latitude,
            longitude: location.longitude,
            radiusKm: 10
          }));
          return { stores: storesResult.payload, location };
        }
      } catch (locationError) {
        console.log('Could not get location, showing all stores:', locationError);
      }
      
      return { stores: storesResult.payload, location: null };
    } catch (error) {
      console.error('Error fetching stores with location:', error);
      throw error;
    }
  }
);
export const fetchStores = createAsyncThunk(
  'stores/fetchStores',
  async () => {
    try {
      console.log('Fetching stores from Firestore...');
      const q = query(
        collection(db, 'stores'),
        where('isActive', '==', true),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      const stores: Store[] = [];
      
      console.log('Found', querySnapshot.size, 'stores');
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const store = {
          ...data,
          id: doc.id,
          // Convert Firestore timestamps to ISO strings
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as unknown as Store;
        
        stores.push(store);
        console.log('Added store:', store.name, 'ID:', store.id);
      });
      
      console.log('Returning', stores.length, 'stores');
      return stores;
    } catch (error) {
      console.error('Error fetching stores:', error);
      throw error;
    }
  }
);

// Fetch featured stores (all active stores for top stores section)
export const fetchFeaturedStores = createAsyncThunk(
  'stores/fetchFeaturedStores',
  async () => {
    try {
      console.log('Fetching featured stores...');
      const q = query(
        collection(db, 'stores'),
        where('isActive', '==', true),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      const stores: Store[] = [];
      
      console.log('Found', querySnapshot.size, 'featured stores');
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const store = {
          ...data,
          id: doc.id,
          // Convert Firestore timestamps to ISO strings
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as unknown as Store;
        
        stores.push(store);
        console.log('Added featured store:', store.name, 'Rating:', store.averageRating);
      });
      
      console.log('Returning', stores.length, 'featured stores');
      return stores;
    } catch (error) {
      console.error('Error fetching featured stores:', error);
      throw error;
    }
  }
);

const storesSlice = createSlice({
  name: 'stores',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentLocation: (state, action: PayloadAction<{ latitude: number; longitude: number }>) => {
      state.currentLocation = action.payload;
    },
    setDistanceFilter: (state, action: PayloadAction<number>) => {
      state.distanceFilter = action.payload;
    },
    setLocationFilter: (state, action: PayloadAction<LocationFilter>) => {
      state.locationFilter = action.payload;
    },
    filterStoresByDistance: (state) => {
      if (!state.currentLocation || !state.items.length) {
        state.filteredStores = state.items;
        return;
      }
      
      const { latitude, longitude } = state.currentLocation;
      const radiusKm = state.distanceFilter;
      
      state.filteredStores = state.items
        .map(store => {
          if (store.lat && store.lng) {
            const distance = calculateDistance(
              latitude, 
              longitude, 
              store.lat, 
              store.lng
            );
            return { ...store, distance };
          }
          return store;
        })
        .filter((store: any) => 
          !store.distance || store.distance <= radiusKm
        )
        .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Stores
      .addCase(fetchStores.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.items = action.payload;
        state.filteredStores = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch stores';
        state.isLoading = false;
      })
      
      // Fetch Featured Stores
      .addCase(fetchFeaturedStores.fulfilled, (state, action) => {
        state.featuredStores = action.payload;
      })
      .addCase(fetchFeaturedStores.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch featured stores';
      })
      
      // Fetch Nearby Stores
      .addCase(fetchNearbyStores.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNearbyStores.fulfilled, (state, action) => {
        state.nearbyStores = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchNearbyStores.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch nearby stores';
        state.isLoading = false;
      })
      
      // Fetch Stores with Location
      .addCase(fetchStoresWithLocation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStoresWithLocation.fulfilled, (state, action) => {
        if (action.payload.location) {
          state.currentLocation = action.payload.location;
        }
        state.isLoading = false;
      })
      .addCase(fetchStoresWithLocation.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch stores with location';
        state.isLoading = false;
      });
  },
});

export const { 
  clearError, 
  setCurrentLocation, 
  setDistanceFilter, 
  setLocationFilter, 
  filterStoresByDistance 
} = storesSlice.actions;
export default storesSlice.reducer;