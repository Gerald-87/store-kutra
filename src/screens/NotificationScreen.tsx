import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import NotificationService, { NotificationData } from '../services/NotificationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NotificationScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
      subscribeToNotifications();
    }

    return () => {
      // Cleanup subscription when component unmounts
      if (user?.uid) {
        NotificationService.getInstance().unsubscribeFromNotifications(user.uid);
      }
    };
  }, [user?.uid]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Initial load handled by subscription
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user?.uid) return;

    const notificationService = NotificationService.getInstance();
    notificationService.subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    
    try {
      await NotificationService.getInstance().markAllAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark notifications as read');
    }
  };

  const handleClearAll = async () => {
    if (!user?.uid) return;
    
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to permanently delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.getInstance().clearAllNotifications(user.uid);
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification: NotificationData) => {
    if (!notification || !notification.id) {
      console.warn('Notification object is invalid:', notification);
      return;
    }
    
    try {
      // Mark as read with error handling
      if (notification.id) {
        NotificationService.getInstance().markAsRead(notification.id).catch((error) => {
          console.error('Error marking notification as read:', error);
        });
      }

      // Navigate based on notification type with enhanced safety
      const notificationType = notification.type || 'default';
      const notificationData = notification.data || {};
      
      switch (notificationType) {
        case 'order':
          if (notificationData.orderId) {
            (navigation as any).navigate('OrderDetail', { orderId: notificationData.orderId });
          } else {
            console.warn('Order notification missing orderId:', notification);
          }
          break;
        case 'product':
          if (notificationData.productId) {
            (navigation as any).navigate('ProductDetail', { productId: notificationData.productId });
          } else {
            console.warn('Product notification missing productId:', notification);
          }
          break;
        case 'message':
          if (notificationData.conversationId) {
            (navigation as any).navigate('Conversation', { 
              conversationId: notificationData.conversationId,
              otherUserId: notificationData.senderId,
              otherUserName: notificationData.senderName,
            });
          } else {
            (navigation as any).navigate('Chat');
          }
          break;
        case 'store':
          (navigation as any).navigate('StoreDashboard');
          break;
        default:
          console.log('Unknown or unsupported notification type:', notificationType);
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error, notification);
      Alert.alert('Error', 'Failed to open notification. Please try again.');
    }
  };

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
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    if (!item) {
      return null;
    }
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
            <Ionicons 
              name={getNotificationIcon(item.type) as any} 
              size={20} 
              color="#FFFFFF" 
            />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.notificationTitle}>{item.title || 'Notification'}</Text>
            <Text style={styles.notificationBody} numberOfLines={2}>
              {item.body || 'No details available'}
            </Text>
            <Text style={styles.notificationTime}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyStateTitle}>No Notifications</Text>
      <Text style={styles.emptyStateText}>
        You're all caught up! Notifications will appear here when you receive them.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.filter(n => !n.read).length > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity 
              style={styles.clearAllButton}
              onPress={handleClearAll}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={[
          styles.listContainer,
          notifications.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  clearAllButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearAllText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unreadNotification: {
    backgroundColor: '#F7F3F0',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationScreen;