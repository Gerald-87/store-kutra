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
import { Advertisement, CampusEvent, Promotion } from '../../types';

interface HeroContent {
  advertisements: Advertisement[];
  events: CampusEvent[];
  promotions: Promotion[];
}

interface HeroState extends HeroContent {
  isLoading: boolean;
  error: string | null;
  currentSlideIndex: number;
}

const initialState: HeroState = {
  advertisements: [],
  events: [],
  promotions: [],
  isLoading: false,
  error: null,
  currentSlideIndex: 0,
};

// Fetch active advertisements
export const fetchAdvertisements = createAsyncThunk(
  'hero/fetchAdvertisements',
  async () => {
    const now = new Date();
    const q = query(
      collection(db, 'advertisements'),
      where('isActive', '==', true),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const advertisements: Advertisement[] = [];
    
    querySnapshot.forEach((doc) => {
      advertisements.push({ id: doc.id, ...doc.data() } as Advertisement);
    });
    
    return advertisements;
  }
);

// Fetch featured events
export const fetchEvents = createAsyncThunk(
  'hero/fetchEvents',
  async () => {
    const now = new Date();
    const q = query(
      collection(db, 'events'),
      where('isFeatured', '==', true),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const events: CampusEvent[] = [];
    
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() } as CampusEvent);
    });
    
    return events;
  }
);

// Fetch active promotions
export const fetchPromotions = createAsyncThunk(
  'hero/fetchPromotions',
  async () => {
    const now = new Date();
    const q = query(
      collection(db, 'promotions'),
      where('isActive', '==', true),
      where('startDate', '<=', now),
      where('endDate', '>=', now),
      orderBy('startDate', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const promotions: Promotion[] = [];
    
    querySnapshot.forEach((doc) => {
      promotions.push({ id: doc.id, ...doc.data() } as Promotion);
    });
    
    return promotions;
  }
);

// Fetch all hero content
export const fetchHeroContent = createAsyncThunk(
  'hero/fetchHeroContent',
  async (_, { dispatch }) => {
    const [ads, events, promos] = await Promise.all([
      dispatch(fetchAdvertisements()).unwrap(),
      dispatch(fetchEvents()).unwrap(),
      dispatch(fetchPromotions()).unwrap(),
    ]);
    
    return { advertisements: ads, events, promotions: promos };
  }
);

const heroSlice = createSlice({
  name: 'hero',
  initialState,
  reducers: {
    setCurrentSlideIndex: (state, action: PayloadAction<number>) => {
      state.currentSlideIndex = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Advertisements
      .addCase(fetchAdvertisements.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdvertisements.fulfilled, (state, action) => {
        state.advertisements = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchAdvertisements.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch advertisements';
        state.isLoading = false;
      })
      
      // Fetch Events
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch events';
      })
      
      // Fetch Promotions
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.promotions = action.payload;
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch promotions';
      })
      
      // Fetch All Hero Content
      .addCase(fetchHeroContent.fulfilled, (state, action) => {
        state.advertisements = action.payload.advertisements;
        state.events = action.payload.events;
        state.promotions = action.payload.promotions;
        state.isLoading = false;
      });
  },
});

export const { setCurrentSlideIndex, clearError } = heroSlice.actions;
export default heroSlice.reducer;