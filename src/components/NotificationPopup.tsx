import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import NotificationService, { NotificationData } from '../services/NotificationService';

const { width, height } = Dimensions.get('window');

interface NotificationPopupProps {
  visible: boolean;
  onClose: () => void;
  onNotificationPress?: (notification: NotificationData) => void;
  onNotificationsUpdate?: (unreadCount: number) => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  visible,
  onClose,
  onNotificationPress,
  onNotificationsUpdate,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth) as any;

  useEffect(() => {
    if (visible && user?.uid) {
      loadNotifications();
      subscribeToNotifications();
    }

    return () => {
      if (user?.uid) {
        NotificationService.getInstance().unsubscribeFromNotifications(user.uid);
      }
    };
  }, [visible, user?.uid]);

  const loadNotifications = async () => {
    setLoading(true);
    // Initial load handled by subscription
  };

  const subscribeToNotifications = () => {
    if (!user?.uid) return;

    const notificationService = NotificationService.getInstance();
    notificationService.subscribeToNotifications(user.uid, (newNotifications) => {
      console.log('NotificationPopup: Received notification update:', {
        count: newNotifications.length,
        unreadCount: newNotifications.filter(n => n.read === false).length
      });
      
      const latestNotifications = newNotifications.slice(0, 10);
      setNotifications(latestNotifications);
      setLoading(false);
      
      // Update parent component with unread count
      const unreadCount = newNotifications.filter(n => n.read === false).length;
      console.log('NotificationPopup: Updating parent with unread count:', unreadCount);
      
      if (onNotificationsUpdate) {
        onNotificationsUpdate(unreadCount);
      }
    });
  };

  const handleNotificationPress = (notification: NotificationData) => {
    if (!notification || typeof notification !== 'object') {
      console.warn('NotificationPopup: Notification object is invalid:', notification);
      return;
    }
    
    try {
      // Mark as read with error handling
      if (notification.id) {
        NotificationService.getInstance().markAsRead(notification.id).catch((error) => {
          console.error('NotificationPopup: Error marking notification as read:', error);
        });
      }

      // Call parent handler safely
      if (onNotificationPress && typeof onNotificationPress === 'function') {
        onNotificationPress(notification);
      } else {
        console.warn('NotificationPopup: onNotificationPress callback not available');
      }
      
      onClose();
    } catch (error) {
      console.error('NotificationPopup: Error handling notification press:', error, notification);
      onClose();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid || markingAllAsRead) return;
    
    setMarkingAllAsRead(true);
    try {
      console.log('NotificationPopup: Starting markAllAsRead for user:', user.uid);
      await NotificationService.getInstance().markAllAsRead(user.uid);
      console.log('NotificationPopup: markAllAsRead completed successfully');
      
      // Force update the parent component with 0 unread notifications
      if (onNotificationsUpdate) {
        console.log('NotificationPopup: Updating parent component with 0 unread count');
        onNotificationsUpdate(0);
      }
      
      // Update local notifications state to reflect all as read
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }));
      setNotifications(updatedNotifications);
      console.log('NotificationPopup: Local notifications state updated');
      
    } catch (error) {
      console.error('NotificationPopup: Error marking all notifications as read:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const unreadCount = notifications.filter(n => n.read === false).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return 'receipt-outline';
      case 'product':
        return 'cube-outline';
      case 'message':
        return 'chatbubble-outline';
      case 'store':
        return 'storefront-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return '#F59E0B';
      case 'product':
        return '#8B5CF6';
      case 'message':
        return '#06B6D4';
      case 'store':
        return '#8B4513';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) {
      return 'Unknown';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    // Enhanced null checking to prevent undefined property access
    if (!item || typeof item !== 'object') {
      console.warn('NotificationPopup: Invalid notification item received:', item);
      return null;
    }
    
    // Ensure required properties exist with fallbacks
    const safeItem = {
      id: item.id || 'unknown',
      title: item.title || 'Notification',
      body: item.body || 'No details available',
      type: item.type || 'default',
      read: Boolean(item.read),
      createdAt: item.createdAt || new Date().toISOString(),
      data: item.data || {}
    };
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !safeItem.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(safeItem.type) }]}>
            <Ionicons 
              name={getNotificationIcon(safeItem.type) as any} 
              size={18} 
              color="#FFFFFF" 
            />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.notificationTitle} numberOfLines={1}>{safeItem.title}</Text>
            <Text style={styles.notificationBody} numberOfLines={2}>
              {safeItem.body}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTime(safeItem.createdAt)}
            </Text>
          </View>
          
          {!safeItem.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={48} color="#D2B48C" />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        You're all caught up!
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.popupContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                  {unreadCount > 0 && (
                    <TouchableOpacity 
                      style={styles.readAllButton} 
                      onPress={handleMarkAllAsRead}
                      disabled={markingAllAsRead}
                    >
                      <Text style={styles.readAllText}>
                        {markingAllAsRead ? 'Reading...' : 'Read All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={24} color="#2D1810" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notifications List */}
              <View style={{ maxHeight: height * 0.6 }}>
                <FlatList
                  key="notification-popup-list"
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item.id || Math.random().toString()}
                  contentContainerStyle={[
                    styles.listContainer,
                    notifications.length === 0 && styles.emptyListContainer,
                  ]}
                  ListEmptyComponent={renderEmptyState}
                  showsVerticalScrollIndicator={false}
                />
              </View>

              {/* View All Button */}
              {notifications.length > 0 && (
                <TouchableOpacity style={styles.viewAllButton} onPress={onClose}>
                  <Text style={styles.viewAllText}>View All Notifications</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readAllButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  readAllText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    paddingVertical: 40,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadNotification: {
    backgroundColor: '#F7F3F0',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationPopup;