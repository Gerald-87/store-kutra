import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  id?: string;
  userId: string;
  type: 'order' | 'listing' | 'product' | 'message' | 'store';
  title: string;
  body: string;
  data?: any;
  read?: boolean;
  createdAt?: any;
}

class NotificationService {
  private static instance: NotificationService;
  private listeners: Map<string, () => void> = new Map();

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notifications
  async initialize() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B4513',
        });
      }

      // Request permissions with enhanced error handling
      const permissionResult = await Notifications.getPermissionsAsync();
      if (!permissionResult || typeof permissionResult.status === 'undefined') {
        console.warn('Failed to get notification permissions - permission result is invalid');
        return;
      }
      
      const { status: existingStatus } = permissionResult;
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const requestResult = await Notifications.requestPermissionsAsync();
        if (!requestResult || typeof requestResult.status === 'undefined') {
          console.warn('Failed to request notification permissions - request result is invalid');
          return;
        }
        finalStatus = requestResult.status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return;
      }

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(notification: NotificationData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Store notification in Firestore
  async storeNotification(notification: NotificationData) {
    try {
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });
      
      return notificationRef.id;
    } catch (error) {
      console.error('Error storing notification:', error);
      throw error;
    }
  }

  // Send and store notification
  async sendNotification(notification: NotificationData) {
    try {
      // Store in Firestore first
      const notificationId = await this.storeNotification(notification);
      
      // Send local notification
      await this.sendLocalNotification(notification);
      
      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Order-related notifications
  async notifyOrderStatusChange(orderId: string, customerId: string, storeOwnerId: string, oldStatus: string, newStatus: string, orderAmount: number) {
    const customerNotification: NotificationData = {
      userId: customerId,
      type: 'order',
      title: 'Order Status Updated',
      body: `Your order #${orderId.slice(-6).toUpperCase()} is now ${newStatus.toLowerCase()}`,
      data: { orderId, oldStatus, newStatus, type: 'order_status_change' }
    };

    const storeNotification: NotificationData = {
      userId: storeOwnerId,
      type: 'order',
      title: 'Order Status Updated',
      body: `Order #${orderId.slice(-6).toUpperCase()} marked as ${newStatus.toLowerCase()} - K${orderAmount.toFixed(2)}`,
      data: { orderId, oldStatus, newStatus, type: 'order_status_change' }
    };

    await Promise.all([
      this.sendNotification(customerNotification),
      this.sendNotification(storeNotification)
    ]);
  }

  async notifyNewOrder(orderId: string, storeOwnerId: string, customerId: string, orderAmount: number, itemCount: number) {
    const notification: NotificationData = {
      userId: storeOwnerId,
      type: 'order',
      title: 'New Order Received!',
      body: `Order #${orderId.slice(-6).toUpperCase()} - ${itemCount} items, K${orderAmount.toFixed(2)}`,
      data: { orderId, customerId, orderAmount, type: 'new_order' }
    };

    await this.sendNotification(notification);
  }

  // Product/Listing notifications
  async notifyNewProduct(productId: string, storeId: string, productName: string, price: number, storeName?: string) {
    try {
      // Get all users who might be interested in this product
      // For now, we'll notify all users except the store owner
      // In the future, implement following/subscription system
      const allUsersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(allUsersQuery);
      
      const notifications: Promise<string>[] = [];
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        // Don't notify the store owner who added the product
        if (userDoc.id !== userData.storeOwnerId && userData.role !== 'store_owner') {
          const notification: NotificationData = {
            userId: userDoc.id,
            type: 'product',
            title: 'New Product Available!',
            body: `${productName} - K${price.toFixed(2)} ${storeName ? `at ${storeName}` : ''}`,
            data: { productId, storeId, productName, price, storeName, type: 'new_product' }
          };
          
          notifications.push(this.sendNotification(notification));
        }
      });
      
      // Send notifications in batches to avoid overwhelming Firestore
      if (notifications.length > 0) {
        await Promise.all(notifications.slice(0, 50)); // Limit to 50 notifications at once
        console.log(`Sent ${Math.min(notifications.length, 50)} new product notifications`);
      }
    } catch (error) {
      console.error('Error sending new product notifications:', error);
      // Don't throw to avoid breaking product creation
    }
  }

  // Notify customers about new stores
  async notifyNewStore(storeId: string, storeName: string, storeDescription: string, storeOwnerId: string) {
    try {
      // Get all customers (non-store owners)
      const customersQuery = query(
        collection(db, 'users'),
        where('role', '!=', 'store_owner')
      );
      const customersSnapshot = await getDocs(customersQuery);
      
      const notifications: Promise<string>[] = [];
      
      customersSnapshot.forEach((userDoc) => {
        // Don't notify the store owner themselves
        if (userDoc.id !== storeOwnerId) {
          const notification: NotificationData = {
            userId: userDoc.id,
            type: 'store',
            title: 'New Store Available!',
            body: `${storeName} just joined KUTRA marketplace`,
            data: { storeId, storeName, storeDescription, type: 'new_store' }
          };
          
          notifications.push(this.sendNotification(notification));
        }
      });
      
      // Send notifications in batches
      if (notifications.length > 0) {
        await Promise.all(notifications.slice(0, 50)); // Limit to 50 notifications at once
        console.log(`Sent ${Math.min(notifications.length, 50)} new store notifications`);
      }
    } catch (error) {
      console.error('Error sending new store notifications:', error);
      // Don't throw to avoid breaking store creation
    }
  }

  async notifyProductLowStock(productId: string, storeOwnerId: string, productName: string, currentStock: number) {
    const notification: NotificationData = {
      userId: storeOwnerId,
      type: 'product',
      title: 'Low Stock Alert',
      body: `${productName} has only ${currentStock} items left`,
      data: { productId, productName, currentStock, type: 'low_stock' }
    };

    await this.sendNotification(notification);
  }

  // Message notifications
  async notifyNewMessage(senderId: string, receiverId: string, senderName: string, messagePreview: string, conversationId?: string) {
    const notification: NotificationData = {
      userId: receiverId,
      type: 'message',
      title: `Message from ${senderName}`,
      body: messagePreview,
      data: { senderId, senderName, conversationId, type: 'new_message' }
    };

    await this.sendNotification(notification);
  }

  // Store notifications
  async notifyStoreUpdate(storeId: string, storeOwnerId: string, updateType: string, message: string) {
    const notification: NotificationData = {
      userId: storeOwnerId,
      type: 'store',
      title: 'Store Update',
      body: message,
      data: { storeId, updateType, type: 'store_update' }
    };

    await this.sendNotification(notification);
  }

  // Listen to real-time notifications for a user
  subscribeToNotifications(userId: string, callback: (notifications: NotificationData[]) => void) {
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId provided to subscribeToNotifications:', userId);
      return () => {};
    }
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const notifications: NotificationData[] = [];
        snapshot.forEach((doc) => {
          try {
            const data = doc.data();
            
            // Validate notification data structure
            if (!data || typeof data !== 'object') {
              console.warn('Invalid notification data from Firestore:', doc.id, data);
              return;
            }
            
            // Create safe notification object with required fields
            const notification: NotificationData = {
              id: doc.id,
              userId: data.userId || userId,
              type: data.type || 'default',
              title: data.title || 'Notification',
              body: data.body || 'No details available',
              data: data.data || {},
              read: Boolean(data.read),
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            };
            
            notifications.push(notification);
          } catch (docError) {
            console.error('Error processing notification document:', doc.id, docError);
          }
        });
        
        callback(notifications);
      } catch (error) {
        console.error('Error in notification subscription callback:', error);
        callback([]);
      }
    }, (error) => {
      console.error('Error in notification subscription:', error);
      callback([]);
    });

    this.listeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Stop listening to notifications
  unsubscribeFromNotifications(userId: string) {
    const unsubscribe = this.listeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(userId);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      console.log(`Starting markAllAsRead for user: ${userId}`);
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} unread notifications to mark as read`);
      
      if (snapshot.empty) {
        console.log('No unread notifications found');
        return;
      }
      
      const batch: Promise<void>[] = [];
      
      snapshot.forEach((doc) => {
        console.log(`Marking notification ${doc.id} as read`);
        batch.push(
          updateDoc(doc.ref, {
            read: true,
            readAt: serverTimestamp(),
          })
        );
      });
      
      await Promise.all(batch);
      console.log(`Successfully marked ${batch.length} notifications as read for user ${userId}`);
      
      // Give a small delay to ensure Firestore updates are propagated
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Clear all listeners
  clearAllListeners() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }
}

export default NotificationService;