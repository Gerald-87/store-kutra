import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Store, Listing, Order, OrderStatus } from '../../types';

interface DashboardState {
  currentStore: Store | null;
  storeOwner: any | null;
  storeProducts: Listing[];
  storeOrders: Order[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    inStockProducts: number;
    totalRevenue: number;
    totalSold: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    todaysSales: number;
    todaysOrders: number;
  };
  analytics: {
    salesByDay: { date: string; amount: number }[];
    paymentTypes: { type: string; amount: number; count: number }[];
    topProducts: { name: string; sold: number; revenue: number }[];
  };
}

const initialState: DashboardState = {
  currentStore: null,
  storeOwner: null,
  storeProducts: [],
  storeOrders: [],
  isLoading: false,
  error: null,
  stats: {
    totalProducts: 0,
    activeProducts: 0,
    outOfStockProducts: 0,
    inStockProducts: 0,
    totalRevenue: 0,
    totalSold: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    todaysSales: 0,
    todaysOrders: 0,
  },
  analytics: {
    salesByDay: [],
    paymentTypes: [],
    topProducts: [],
  },
};

// Comprehensive fetch for all store dashboard data
export const fetchStoreDashboardData = createAsyncThunk(
  'dashboard/fetchStoreDashboardData',
  async (ownerId: string) => {
    try {
      // Validate owner ID
      if (!ownerId || ownerId.trim() === '') {
        throw new Error('No valid owner ID provided');
      }
      
      console.log('Fetching complete store dashboard data for owner:', ownerId);
      
      // Fetch store information
      const storeQuery = query(
        collection(db, 'stores'),
        where('ownerId', '==', ownerId)
      );
      const storeSnapshot = await getDocs(storeQuery);
      
      if (storeSnapshot.empty) {
        console.log('No store found for owner ID:', ownerId);
        throw new Error(`No store found for user ID: ${ownerId}. Please create a store first.`);
      }
      
      const storeDoc = storeSnapshot.docs[0];
      const storeData = storeDoc.data();
      const store = {
        ...storeData,
        id: storeDoc.id,
        createdAt: storeData.createdAt?.toDate?.()?.toISOString() || storeData.createdAt,
        updatedAt: storeData.updatedAt?.toDate?.()?.toISOString() || storeData.updatedAt,
      } as Store;
      
      console.log('Found store:', store.name, 'with ID:', store.id);
      
      // Fetch store owner details
      const ownerDoc = await getDoc(doc(db, 'users', ownerId));
      if (!ownerDoc.exists()) {
        console.log('No user found for owner ID:', ownerId);
        throw new Error(`User data not found for ID: ${ownerId}`);
      }
      
      const ownerData = ownerDoc.data();
      const storeOwner = { 
        uid: ownerId, 
        ...ownerData,
        createdAt: ownerData.createdAt?.toDate?.()?.toISOString() || ownerData.createdAt,
        joinedDate: ownerData.joinedDate?.toDate?.()?.toISOString() || ownerData.joinedDate,
        updatedAt: ownerData.updatedAt?.toDate?.()?.toISOString() || ownerData.updatedAt,
        // Remove any other Firestore timestamp fields
        ...(ownerData.lastLoginAt && { lastLoginAt: ownerData.lastLoginAt?.toDate?.()?.toISOString() || ownerData.lastLoginAt }),
        ...(ownerData.emailVerifiedAt && { emailVerifiedAt: ownerData.emailVerifiedAt?.toDate?.()?.toISOString() || ownerData.emailVerifiedAt }),
      } as any;
      console.log('Found store owner:', storeOwner.name);
      
      // Fetch store products
      const productsQuery = query(
        collection(db, 'listings'),
        where('sellerId', '==', ownerId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const products: Listing[] = [];
      
      productsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const listing = {
          ...data,
          id: docSnap.id,
          postedDate: data.postedDate?.toDate?.()?.toISOString() || data.postedDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Listing;
        products.push(listing);
      });
      
      console.log('Found', products.length, 'products for store');
      
      // Fetch store orders
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const allOrders: Order[] = [];
      
      ordersSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        
        // Convert all timestamp fields to ISO strings
        const order = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          pickedUpAt: data.pickedUpAt?.toDate?.()?.toISOString() || data.pickedUpAt,
          deliveredAt: data.deliveredAt?.toDate?.()?.toISOString() || data.deliveredAt,
          cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || data.cancelledAt,
          rejectedAt: data.rejectedAt?.toDate?.()?.toISOString() || data.rejectedAt,
          confirmedAt: data.confirmedAt?.toDate?.()?.toISOString() || data.confirmedAt,
          preparingAt: data.preparingAt?.toDate?.()?.toISOString() || data.preparingAt,
          readyAt: data.readyAt?.toDate?.()?.toISOString() || data.readyAt,
          inTransitAt: data.inTransitAt?.toDate?.()?.toISOString() || data.inTransitAt,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
          assignedAt: data.assignedAt?.toDate?.()?.toISOString() || data.assignedAt,
          // Handle nested items array timestamp fields
          items: data.items?.map((item: any) => ({
            ...item,
            pickedUpAt: item.pickedUpAt?.toDate?.()?.toISOString() || item.pickedUpAt,
            deliveredAt: item.deliveredAt?.toDate?.()?.toISOString() || item.deliveredAt,
            createdAt: item.createdAt?.toDate?.()?.toISOString() || item.createdAt,
            updatedAt: item.updatedAt?.toDate?.()?.toISOString() || item.updatedAt,
          })) || data.items,
        };
        allOrders.push(order as unknown as Order);
      });
      
      // Filter orders that contain items from this store
      const storeOrders = allOrders.filter(order => 
        order.items?.some(item => item.sellerId === ownerId)
      );
      
      console.log('Found', storeOrders.length, 'orders for store');
      
      console.log('Dashboard data loaded successfully:', {
        storeId: store.id,
        storeName: store.name,
        ownerName: (storeOwner as any).name,
        productsCount: products.length,
        ordersCount: storeOrders.length
      });
      
      return {
        store,
        storeOwner,
        products,
        orders: storeOrders,
      };
    } catch (error) {
      console.error('Error fetching store dashboard data:', error);
      throw error;
    }
  }
);

// Calculate comprehensive statistics and analytics
const calculateDashboardStats = (products: Listing[], orders: Order[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Product statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(product => product.isActive !== false).length;
  const outOfStockProducts = products.filter(product => 
    product.stock !== undefined && product.stock <= 0
  ).length;
  const inStockProducts = products.filter(product => 
    product.stock === undefined || product.stock > 0
  ).length;
  
  // Order statistics
  const completedOrders = orders.filter(order => 
    order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED
  );
  const pendingOrders = orders.filter(order => order.status === OrderStatus.PENDING).length;
  const deliveredOrders = orders.filter(order => order.status === OrderStatus.DELIVERED).length;
  const cancelledOrders = orders.filter(order => order.status === OrderStatus.CANCELLED).length;
  
  // Revenue calculations
  const totalRevenue = completedOrders.reduce((sum, order) => 
    sum + (order.storeRevenueAmount || order.itemSubtotal || 0), 0
  );
  
  const totalSold = completedOrders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );
  
  // Today's statistics
  const todaysOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= today;
  });
  
  const todaysSales = todaysOrders
    .filter(order => order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED)
    .reduce((sum, order) => sum + (order.storeRevenueAmount || order.itemSubtotal || 0), 0);
  
  // Sales by day (last 7 days)
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= date && orderDate < nextDate &&
        (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED);
    });
    
    const dayAmount = dayOrders.reduce((sum, order) => 
      sum + (order.storeRevenueAmount || order.itemSubtotal || 0), 0
    );
    
    salesByDay.push({
      date: date.toISOString().split('T')[0],
      amount: dayAmount
    });
  }
  
  // Payment types analysis
  const paymentTypesMap = new Map();
  completedOrders.forEach(order => {
    const type = order.paymentMethod || 'cash';
    const existing = paymentTypesMap.get(type) || { amount: 0, count: 0 };
    paymentTypesMap.set(type, {
      amount: existing.amount + (order.storeRevenueAmount || order.itemSubtotal || 0),
      count: existing.count + 1
    });
  });
  
  const paymentTypes = Array.from(paymentTypesMap.entries()).map(([type, data]) => ({
    type,
    amount: data.amount,
    count: data.count
  }));
  
  // Top products analysis
  const productSalesMap = new Map();
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const existing = productSalesMap.get(item.title) || { sold: 0, revenue: 0 };
      productSalesMap.set(item.title, {
        sold: existing.sold + item.quantity,
        revenue: existing.revenue + (item.priceAtPurchase * item.quantity)
      });
    });
  });
  
  const topProducts = Array.from(productSalesMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  return {
    stats: {
      totalProducts,
      activeProducts,
      outOfStockProducts,
      inStockProducts,
      totalRevenue,
      totalSold,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      todaysSales,
      todaysOrders: todaysOrders.length,
    },
    analytics: {
      salesByDay,
      paymentTypes,
      topProducts,
    }
  };
};

// Fetch store information by owner ID
export const fetchStoreByOwnerId = createAsyncThunk(
  'dashboard/fetchStoreByOwnerId',
  async (ownerId: string) => {
    try {
      console.log('Fetching store for owner:', ownerId);
      
      const q = query(
        collection(db, 'stores'),
        where('ownerId', '==', ownerId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const store = {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as Store;
        
        console.log('Found store:', store.name);
        return store;
      } else {
        throw new Error('Store not found for this user');
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      throw error;
    }
  }
);

// Fetch products for the store owner
export const fetchStoreProducts = createAsyncThunk(
  'dashboard/fetchStoreProducts',
  async (sellerId: string) => {
    try {
      console.log('Fetching products for seller:', sellerId);
      
      const q = query(
        collection(db, 'listings'),
        where('sellerId', '==', sellerId)
      );
      
      const querySnapshot = await getDocs(q);
      const products: Listing[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const listing = {
          ...data,
          id: docSnap.id,
          postedDate: data.postedDate?.toDate?.()?.toISOString() || data.postedDate,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          // Handle any other potential timestamp fields
          ...(data.publishedAt && { publishedAt: data.publishedAt?.toDate?.()?.toISOString() || data.publishedAt }),
          ...(data.soldAt && { soldAt: data.soldAt?.toDate?.()?.toISOString() || data.soldAt }),
          ...(data.renewedAt && { renewedAt: data.renewedAt?.toDate?.()?.toISOString() || data.renewedAt }),
        } as Listing;
        products.push(listing);
      });
      
      console.log('Found', products.length, 'products for seller');
      return products;
    } catch (error) {
      console.error('Error fetching store products:', error);
      throw error;
    }
  }
);

// Add new product/listing
export const addStoreProduct = createAsyncThunk(
  'dashboard/addStoreProduct',
  async (productData: Omit<Listing, 'id'>) => {
    try {
      const listingData = {
        ...productData,
        postedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 0,
      };
      
      const docRef = await addDoc(collection(db, 'listings'), listingData);
      
      return {
        ...listingData,
        id: docRef.id,
      } as Listing;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
);

// Update existing product
export const updateStoreProduct = createAsyncThunk(
  'dashboard/updateStoreProduct',
  async ({ productId, updateData }: { productId: string; updateData: Partial<Listing> }) => {
    try {
      const productRef = doc(db, 'listings', productId);
      const dataToUpdate = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(productRef, dataToUpdate);
      
      return { productId, updateData: dataToUpdate };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }
);

// Delete product
export const deleteStoreProduct = createAsyncThunk(
  'dashboard/deleteStoreProduct',
  async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'listings', productId));
      return productId;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearDashboard: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Store Dashboard Data
      .addCase(fetchStoreDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStoreDashboardData.fulfilled, (state, action) => {
        const { store, storeOwner, products, orders } = action.payload;
        state.currentStore = store;
        state.storeOwner = storeOwner;
        state.storeProducts = products;
        state.storeOrders = orders;
        
        const { stats, analytics } = calculateDashboardStats(products, orders);
        state.stats = stats;
        state.analytics = analytics;
        
        state.isLoading = false;
      })
      .addCase(fetchStoreDashboardData.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch dashboard data';
        state.isLoading = false;
      })
      
      // Add Store Product
      .addCase(addStoreProduct.fulfilled, (state, action) => {
        state.storeProducts.push(action.payload);
        const { stats } = calculateDashboardStats(state.storeProducts, state.storeOrders);
        state.stats = stats;
      })
      .addCase(addStoreProduct.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to add product';
      })
      
      // Update Store Product
      .addCase(updateStoreProduct.fulfilled, (state, action) => {
        const { productId, updateData } = action.payload;
        const productIndex = state.storeProducts.findIndex(product => product.id === productId);
        if (productIndex !== -1) {
          state.storeProducts[productIndex] = {
            ...state.storeProducts[productIndex],
            ...updateData,
          };
          const { stats } = calculateDashboardStats(state.storeProducts, state.storeOrders);
          state.stats = stats;
        }
      })
      .addCase(updateStoreProduct.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update product';
      })
      
      // Delete Store Product
      .addCase(deleteStoreProduct.fulfilled, (state, action) => {
        state.storeProducts = state.storeProducts.filter(product => product.id !== action.payload);
        const { stats } = calculateDashboardStats(state.storeProducts, state.storeOrders);
        state.stats = stats;
      })
      .addCase(deleteStoreProduct.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete product';
      });
  },
});

export const { clearError, clearDashboard } = dashboardSlice.actions;
export default dashboardSlice.reducer;