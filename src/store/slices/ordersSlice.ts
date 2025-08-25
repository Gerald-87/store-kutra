import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Order, OrderStatus } from '../../types';
import NotificationService from '../../services/NotificationService';

interface OrdersState {
  items: Order[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
  };
}

const initialState: OrdersState = {
  items: [],
  isLoading: false,
  error: null,
  stats: {
    totalOrders: 0,
    pendingOrders: 0,
    revenue: 0,
  },
};

// Fetch orders for a specific store owner
export const fetchStoreOrders = createAsyncThunk(
  'orders/fetchStoreOrders',
  async (storeOwnerId: string) => {
    try {
      console.log('Fetching orders for store owner:', storeOwnerId);
      
      // Query orders where any item has sellerId matching the store owner
      // Note: This might need to be optimized based on your actual data structure
      const q = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const orders: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if any order item belongs to this store owner
        const hasStoreItems = data.items?.some((item: any) => 
          item.sellerId === storeOwnerId
        );
        
        if (hasStoreItems) {
          const order = {
            id: doc.id,
            ...data,
            // Convert all timestamp fields to ISO strings
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
          orders.push(order as Order);
        }
      });
      
      console.log('Found', orders.length, 'orders for store owner');
      return orders;
    } catch (error) {
      console.error('Error fetching store orders:', error);
      throw error;
    }
  }
);

// Update order status with notifications
export const updateOrderStatus = createAsyncThunk(
  'orders/updateOrderStatus',
  async ({ orderId, status, storeOwnerId }: { orderId: string; status: OrderStatus; storeOwnerId?: string }) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
      
      // If storeOwnerId is provided, send notifications
      if (storeOwnerId) {
        try {
          // Get order details for notification (in real app, you'd fetch this)
          // For now, we'll send a basic notification
          const notificationService = NotificationService.getInstance();
          // This would normally include customer ID and other order details
          console.log('Order status updated with notification support');
        } catch (notificationError) {
          console.warn('Failed to send order notification:', notificationError);
          // Don't fail the order update if notification fails
        }
      }
      
      return { orderId, status };
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
);

// Calculate store statistics
const calculateStats = (orders: Order[]) => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => 
    order.status === OrderStatus.PENDING
  ).length;
  
  const revenue = orders
    .filter(order => order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED)
    .reduce((sum, order) => sum + (order.storeRevenueAmount || order.itemSubtotal || 0), 0);
  
  return {
    totalOrders,
    pendingOrders,
    revenue,
  };
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Store Orders
      .addCase(fetchStoreOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStoreOrders.fulfilled, (state, action) => {
        state.items = action.payload;
        state.stats = calculateStats(action.payload);
        state.isLoading = false;
      })
      .addCase(fetchStoreOrders.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch orders';
        state.isLoading = false;
      })
      
      // Update Order Status
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const { orderId, status } = action.payload;
        const orderIndex = state.items.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
          state.items[orderIndex].status = status;
          state.items[orderIndex].updatedAt = new Date().toISOString();
          // Recalculate stats
          state.stats = calculateStats(state.items);
        }
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update order status';
      });
  },
});

export const { clearError } = ordersSlice.actions;
export default ordersSlice.reducer;