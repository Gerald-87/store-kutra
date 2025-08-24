import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  }
  
  static async getExpoPushToken(): Promise<string | null> {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }
  
  static async updateUserPushToken(userId: string, token: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: [token],
      });
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  }
  
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    scheduledTime?: Date
  ): Promise<string> {
    const notificationRequest: any = {
      content: {
        title,
        body,
        data,
      },
    };
    
    if (scheduledTime) {
      notificationRequest.trigger = { date: scheduledTime };
    } else {
      notificationRequest.trigger = null;
    }
      
    return await Notifications.scheduleNotificationAsync(notificationRequest);
  }
  
  static async sendOrderNotification(
    orderId: string,
    status: string,
    customerName: string
  ): Promise<void> {
    const title = 'Order Update';
    const body = `Hi ${customerName}, your order #${orderId.slice(-6)} is now ${status.toLowerCase()}`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'order',
      orderId,
      status,
    });
  }
  
  static async sendSwapNotification(
    fromUserName: string,
    itemTitle: string
  ): Promise<void> {
    const title = 'New Swap Request';
    const body = `${fromUserName} wants to swap for your ${itemTitle}`;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'swap',
    });
  }
  
  static async sendRentalNotification(
    renterName: string,
    itemTitle: string,
    type: 'request' | 'reminder' | 'due'
  ): Promise<void> {
    let title = '';
    let body = '';
    
    switch (type) {
      case 'request':
        title = 'New Rental Request';
        body = `${renterName} wants to rent your ${itemTitle}`;
        break;
      case 'reminder':
        title = 'Rental Reminder';
        body = `Your rental of ${itemTitle} starts tomorrow`;
        break;
      case 'due':
        title = 'Rental Due';
        body = `Your rental of ${itemTitle} is due today`;
        break;
    }
    
    await this.scheduleLocalNotification(title, body, {
      type: 'rental',
      subType: type,
    });
  }
  
  static async sendChatNotification(
    senderName: string,
    message: string
  ): Promise<void> {
    const title = `Message from ${senderName}`;
    const body = message.length > 50 ? `${message.substring(0, 50)}...` : message;
    
    await this.scheduleLocalNotification(title, body, {
      type: 'chat',
    });
  }
  
  static addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
  
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default NotificationService;