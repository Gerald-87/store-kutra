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

interface StoresState {
  items: Store[];
  featuredStores: Store[];
  isLoading: boolean;
  error: string | null;
}

const initialState: StoresState = {
  items: [],
  featuredStores: [],
  isLoading: false,
  error: null,
};

// Fetch all active stores
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
      });
  },
});

export const { clearError } = storesSlice.actions;
export default storesSlice.reducer;