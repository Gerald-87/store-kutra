import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import cartSlice from './slices/cartSlice';
import favoritesSlice from './slices/favoritesSlice';
import chatSlice from './slices/chatSlice';
import listingsSlice from './slices/listingsSlice';
import heroSlice from './slices/heroSlice';
import storesSlice from './slices/storesSlice';
import ordersSlice from './slices/ordersSlice';
import dashboardSlice from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    cart: cartSlice,
    favorites: favoritesSlice,
    chat: chatSlice,
    listings: listingsSlice,
    hero: heroSlice,
    stores: storesSlice,
    orders: ordersSlice,
    dashboard: dashboardSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'listings/fetchListings/fulfilled',
          'listings/fetchStoreListings/fulfilled',
          'listings/fetchFeaturedListings/fulfilled',
          'dashboard/fetchStoreDashboardData/fulfilled',
          'orders/fetchStoreOrders/fulfilled',
          'stores/fetchStores/fulfilled',
          'auth/login/fulfilled',
          'auth/register/fulfilled'
        ],
        ignoredPaths: [
          'auth.user.joinedDate', 
          'auth.user.createdAt',
          'cart.items',
          'listings.items',
          'listings.featuredItems',
          'listings.storeListings',
          'listings.currentListing',
          'listings.lastDoc',
          'listings.stores',
          'listings.filteredStoreListings',
          'dashboard.storeOrders',
          'dashboard.storeOwner',
          'dashboard.currentStore',
          'orders.items',
          'stores.items',
          'stores.nearbyStores',
          'stores.filteredStores'
        ],
        ignoredActionsPaths: [
          'payload.postedDate',
          'payload.createdAt',
          'payload.updatedAt',
          'payload.joinedDate',
          'payload.lastDoc',
          'payload.listings',
          'payload.stores',
          'payload.orders',
          'payload.items',
          'meta.arg.lastDoc',
          'meta.arg.startAfter',
          'meta.baseQueryMeta',
          'register',
          'rehydrate'
        ],
        // Ignore all timestamp-like objects from Firestore
        isSerializable: (value: any) => {
          if (value && typeof value === 'object' && value.constructor === Object) {
            // Check if it's a Firestore timestamp
            if (value.seconds !== undefined && value.nanoseconds !== undefined) {
              return false;
            }
          }
          return true;
        },
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;