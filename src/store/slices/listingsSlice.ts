import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Listing, ListingCategory, ListingType, Store } from '../../types';

// Client-side filtering utilities
const filterListings = (listings: Listing[], filters: {
  searchQuery?: string;
  category?: ListingCategory;
  type?: ListingType;
}) => {
  let filtered = [...listings];
  
  // Search across title/description
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(listing => 
      listing.title.toLowerCase().includes(query) || 
      listing.description.toLowerCase().includes(query)
    );
  }
  
  // Category filter
  if (filters.category) {
    filtered = filtered.filter(listing => listing.category === filters.category);
  }
  
  // Type filter (sell vs service)
  if (filters.type) {
    filtered = filtered.filter(listing => listing.type === filters.type);
  }
  
  return filtered;
};

interface ListingsState {
  items: Listing[];
  featuredItems: Listing[];
  stores: Store[];
  storeListings: { [storeId: string]: Listing[] };
  filteredStoreListings: { [storeId: string]: Listing[] };
  currentListing: Listing | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  searchQuery: string;
  selectedCategory: ListingCategory | null;
  selectedType: ListingType | null;
}

const initialState: ListingsState = {
  items: [],
  featuredItems: [],
  stores: [],
  storeListings: {},
  filteredStoreListings: {},
  currentListing: null,
  isLoading: false,
  error: null,
  hasMore: true,
  lastDoc: null,
  searchQuery: '',
  selectedCategory: null,
  selectedType: null,
};

export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async ({ 
    category, 
    type, 
    searchQuery, 
    loadMore = false 
  }: { 
    category?: ListingCategory;
    type?: ListingType;
    searchQuery?: string;
    loadMore?: boolean;
  }, { getState }) => {
    const state = getState() as { listings: ListingsState };
    
    let q = query(collection(db, 'listings'), orderBy('postedDate', 'desc'));
    
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    if (searchQuery) {
      // Simple search by title - in production, consider using Algolia or similar
      q = query(q, where('searchKeywords', 'array-contains-any', 
        searchQuery.toLowerCase().split(' ')));
    }
    
    q = query(q, limit(20));
    
    if (loadMore && state.listings.lastDoc) {
      q = query(q, startAfter(state.listings.lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    const listings: Listing[] = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() } as Listing);
    });
    
    return {
      listings,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === 20,
      loadMore,
    };
  }
);

export const fetchFeaturedListings = createAsyncThunk(
  'listings/fetchFeaturedListings',
  async () => {
    const q = query(
      collection(db, 'listings'),
      where('isFeatured', '==', true),
      orderBy('postedDate', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    
    const listings: Listing[] = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() } as Listing);
    });
    
    return listings;
  }
);

export const fetchListingById = createAsyncThunk(
  'listings/fetchListingById',
  async (listingId: string) => {
    const docRef = doc(db, 'listings', listingId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Listing;
    } else {
      throw new Error('Listing not found');
    }
  }
);

export const fetchStores = createAsyncThunk(
  'listings/fetchStores',
  async () => {
    const q = query(
      collection(db, 'stores'),
      where('isActive', '==', true),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    
    const stores: Store[] = [];
    querySnapshot.forEach((doc) => {
      stores.push({ id: doc.id, ...doc.data() } as Store);
    });
    
    return stores;
  }
);

export const fetchStoreListings = createAsyncThunk(
  'listings/fetchStoreListings',
  async ({ storeId, store }: { storeId: string; store?: any }) => {
    try {
      // Query listings by sellerId (store.ownerId)
      const sellerId = store?.ownerId || storeId;
      
      const q = query(
        collection(db, 'listings'),
        where('sellerId', '==', sellerId),
        orderBy('postedDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const listings: Listing[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamps to ISO strings
        const listing = {
          ...data,
          id: doc.id,
          postedDate: data.postedDate?.toDate?.()?.toISOString() || data.postedDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as unknown as Listing;
        
        // Filter out out-of-stock items unless they're services
        const isService = listing.type === 'Service';
        const hasStock = listing.stock === undefined || listing.stock > 0;
        
        if (isService || hasStock) {
          listings.push(listing);
        }
      });
      
      return { storeId, listings };
    } catch (error) {
      console.error('Error fetching store listings:', error);
      throw error;
    }
  }
);

const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSelectedCategory: (state, action: PayloadAction<ListingCategory | null>) => {
      state.selectedCategory = action.payload;
    },
    
    setSelectedType: (state, action: PayloadAction<ListingType | null>) => {
      state.selectedType = action.payload;
    },
    
    clearListings: (state) => {
      state.items = [];
      state.lastDoc = null;
      state.hasMore = true;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearCurrentListing: (state) => {
      state.currentListing = null;
    },
    
    filterStoreListings: (state, action: PayloadAction<{ 
      storeId: string; 
      searchQuery?: string; 
      category?: ListingCategory; 
      type?: ListingType; 
    }>) => {
      const { storeId, searchQuery, category, type } = action.payload;
      const storeListings = state.storeListings[storeId] || [];
      
      const filtered = filterListings(storeListings, {
        searchQuery,
        category,
        type
      });
      
      state.filteredStoreListings[storeId] = filtered;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch listings
      .addCase(fetchListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.isLoading = false;
        const { listings, lastDoc, hasMore, loadMore } = action.payload;
        
        if (loadMore) {
          state.items = [...state.items, ...listings];
        } else {
          state.items = listings;
        }
        
        state.lastDoc = lastDoc;
        state.hasMore = hasMore;
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch listings';
      })
      
      // Fetch featured listings
      .addCase(fetchFeaturedListings.fulfilled, (state, action) => {
        state.featuredItems = action.payload;
      })
      
      // Fetch listing by ID
      .addCase(fetchListingById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchListingById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentListing = action.payload;
      })
      .addCase(fetchListingById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch listing';
      })
      
      // Fetch stores
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.stores = action.payload;
      })
      
      // Fetch store listings
      .addCase(fetchStoreListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStoreListings.fulfilled, (state, action) => {
        state.isLoading = false;
        const { storeId, listings } = action.payload;
        state.storeListings[storeId] = listings;
        // Initialize filtered listings with all listings
        state.filteredStoreListings[storeId] = listings;
      })
      .addCase(fetchStoreListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch store listings';
      });
  },
});

export const {
  setSearchQuery,
  setSelectedCategory,
  setSelectedType,
  clearListings,
  clearError,
  clearCurrentListing,
  filterStoreListings,
} = listingsSlice.actions;

export default listingsSlice.reducer;