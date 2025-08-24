import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import favoritesSlice from './slices/favoritesSlice';
import chatSlice from './slices/chatSlice';
import listingsSlice from './slices/listingsSlice';
import heroSlice from './slices/heroSlice';
import storesSlice from './slices/storesSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    cart: cartSlice,
    favorites: favoritesSlice,
    chat: chatSlice,
    listings: listingsSlice,
    hero: heroSlice,
    stores: storesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: [
          'auth.user.joinedDate', 
          'auth.user.createdAt',
          'cart.items',
          'listings.items',
          'listings.featuredItems',
          'listings.storeListings',
          'listings.currentListing',
          'listings.lastDoc'
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;