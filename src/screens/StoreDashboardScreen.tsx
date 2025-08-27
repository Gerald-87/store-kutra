import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { fetchStoreDashboardData } from '../store/slices/dashboardSlice';
import { StackNavigationProp } from '@react-navigation/stack';
import NotificationService, { NotificationData } from '../services/NotificationService';
import NotificationPopup from '../components/NotificationPopup';

type StoreDashboardNavigationProp = StackNavigationProp<any, 'StoreDashboard'>;

const StoreDashboardScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<StoreDashboardNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  // Get real data from Redux store
  const dashboardState = useSelector((state: RootState) => state.dashboard) as any;
  
  const {
    currentStore,
    storeOwner,
    storeProducts,
    storeOrders,
    isLoading,
    error,
    stats,
    analytics
  } = dashboardState;

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to notifications for real-time updates
    if (user?.uid) {
      const notificationService = NotificationService.getInstance();
      const unsubscribe = notificationService.subscribeToNotifications(
        user.uid,
        (notifications: NotificationData[]) => {
          const unread = notifications.filter(n => !n.read).length;
          setUnreadNotifications(unread);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [user?.uid]);
  
  // Show error if there's one
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadDashboardData = async () => {
    try {
      // Enhanced user validation
      console.log('Current user object:', user);
      console.log('User UID:', user?.uid);
      console.log('User role:', user?.role);
      
      if (!user) {
        console.error('No user object available');
        Alert.alert('Authentication Error', 'No user logged in. Please log in again.');
        return;
      }
      
      if (!user.uid) {
        console.error('User object exists but no UID:', user);
        Alert.alert('Authentication Error', 'Invalid user ID. Please log in again.');
        return;
      }
      
      console.log('Loading comprehensive dashboard data for user ID:', user.uid);
      await dispatch(fetchStoreDashboardData(user.uid));
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
      Alert.alert('Error', errorMessage);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Welcome back, {storeOwner?.name || user?.name}!</Text>
          <Text style={styles.storeNameText}>
            {currentStore?.name || user?.storeName || 'Your Store'}
          </Text>
          {storeOwner?.email && (
            <Text style={styles.ownerEmail}>{storeOwner.email}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setShowNotificationPopup(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#8B4513" />
            {unreadNotifications > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications.toString()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={40} color="#8B4513" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Comprehensive Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={20} color="#8B4513" />
              <Text style={styles.statNumber}>{String(stats.totalProducts)}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              <Text style={styles.statNumber}>{String(stats.inStockProducts)}</Text>
              <Text style={styles.statLabel}>In Stock</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={20} color="#F59E0B" />
              <Text style={styles.statNumber}>K{String(stats.totalRevenue.toFixed(0))}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="bag-check-outline" size={20} color="#8B5CF6" />
              <Text style={styles.statNumber}>{String(stats.totalSold)}</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={styles.statNumber}>{String(stats.pendingOrders)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-done-outline" size={20} color="#10B981" />
              <Text style={styles.statNumber}>{String(stats.deliveredOrders)}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.statNumber}>{String(stats.cancelledOrders)}</Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={20} color="#06B6D4" />
              <Text style={styles.statNumber}>K{String(stats.todaysSales.toFixed(0))}</Text>
              <Text style={styles.statLabel}>Today's Sales</Text>
            </View>
          </View>
        </View>

        {/* Analytics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          
          {/* Sales Chart (Last 7 Days) */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Sales Last 7 Days</Text>
            <View style={styles.chartWrapper}>
              {analytics.salesByDay.map((day: any, index: number) => {
                const maxAmount = Math.max(...analytics.salesByDay.map((d: any) => d.amount), 1);
                const height = (day.amount / maxAmount) * 100;
                return (
                  <View key={index} style={styles.chartBar}>
                    <View style={[styles.bar, { height: `${height}%` }]} />
                    <Text style={styles.chartLabel}>
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </Text>
                    <Text style={styles.chartValue}>K{day.amount.toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Payment Types Analysis - Pie Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Payment Methods</Text>
            {analytics.paymentTypes.length > 0 ? (
              <View style={styles.pieChartContainer}>
                {analytics.paymentTypes.map((payment: any, index: number) => {
                  const totalAmount = analytics.paymentTypes.reduce((sum: number, p: any) => sum + p.amount, 0);
                  const percentage = totalAmount > 0 ? (payment.amount / totalAmount * 100) : 0;
                  const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2B48C', '#BC9A6A'];
                  return (
                    <View key={index} style={styles.pieSegmentItem}>
                      <View style={styles.pieSegmentHeader}>
                        <View style={[styles.pieColorIndicator, { backgroundColor: colors[index % colors.length] }]} />
                        <Text style={styles.pieSegmentName}>
                          {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
                        </Text>
                        <Text style={styles.pieSegmentAmount}>K{payment.amount.toFixed(0)}</Text>
                      </View>
                      <View style={styles.pieSegmentBar}>
                        <View style={[styles.pieSegmentProgress, { width: `${Math.max(percentage, 5)}%`, backgroundColor: colors[index % colors.length] }]} />
                      </View>
                      <Text style={styles.pieSegmentDetails}>
                        {payment.count} orders • {percentage.toFixed(1)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="pie-chart-outline" size={48} color="#D2B48C" />
                <Text style={styles.noDataText}>No payment data available</Text>
              </View>
            )}
          </View>
          
          {/* Top Products - Bar Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Top Selling Products</Text>
            {analytics.topProducts.length > 0 ? (
              <View style={styles.barChartContainer}>
                {analytics.topProducts.slice(0, 5).map((product: any, index: number) => {
                  const maxRevenue = Math.max(...analytics.topProducts.map((p: any) => p.revenue), 1);
                  const barWidth = Math.max((product.revenue / maxRevenue) * 100, 8);
                  return (
                    <View key={index} style={styles.barChartItem}>
                      <View style={styles.barChartHeader}>
                        <Text style={styles.barProductRank}>#{String(index + 1)}</Text>
                        <Text style={styles.barProductName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.barProductRevenue}>K{product.revenue.toFixed(0)}</Text>
                      </View>
                      <View style={styles.barChartBar}>
                        <View style={[styles.barChartProgress, { width: `${barWidth}%` }]} />
                      </View>
                      <Text style={styles.barProductStats}>
                        {product.sold} sold
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="bar-chart-outline" size={48} color="#D2B48C" />
                <Text style={styles.noDataText}>No product sales data available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Chats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate('Chat')}
              style={styles.sectionViewAll}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#8B4513" />
            </TouchableOpacity>
          </View>
          
          {/* Chat Preview - will show first 3 recent conversations */}
          <View style={styles.chatPreviewContainer}>
            <TouchableOpacity
              style={styles.chatPreviewItem}
              onPress={() => navigation.getParent()?.navigate('Chat')}
            >
              <View style={styles.chatAvatar}>
                <Ionicons name="person" size={20} color="#8B4513" />
              </View>
              <View style={styles.chatContent}>
                <Text style={styles.chatUserName} numberOfLines={1}>Customer Support</Text>
                <Text style={styles.chatLastMessage} numberOfLines={1}>Thank you for your help with...</Text>
              </View>
              <View style={styles.chatMeta}>
                <Text style={styles.chatTime}>2h ago</Text>
                <View style={styles.chatUnreadBadge}>
                  <Text style={styles.chatUnreadText}>2</Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.chatPreviewItem}
              onPress={() => navigation.getParent()?.navigate('Chat')}
            >
              <View style={styles.chatAvatar}>
                <Ionicons name="person" size={20} color="#8B4513" />
              </View>
              <View style={styles.chatContent}>
                <Text style={styles.chatUserName} numberOfLines={1}>John Customer</Text>
                <Text style={styles.chatLastMessage} numberOfLines={1}>Is this product still available?</Text>
              </View>
              <View style={styles.chatMeta}>
                <Text style={styles.chatTime}>5h ago</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.emptyChatState}
              onPress={() => navigation.getParent()?.navigate('Chat')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color="#D2B48C" />
              <Text style={styles.emptyChatText}>View all conversations</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AddProduct')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8B4513' }]}>
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Add Product</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.getParent()?.navigate('Orders')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#D2691E' }]}>
                <Ionicons name="receipt" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>View Orders</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.getParent()?.navigate('Analytics')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#A0522D' }]}>
                <Ionicons name="analytics" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.getParent()?.navigate('Products')}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#CD853F' }]}>
                <Ionicons name="cube" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Manage Products</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Notification Popup */}
      <NotificationPopup
        visible={showNotificationPopup}
        onClose={() => setShowNotificationPopup(false)}
        onNotificationsUpdate={(unreadCount) => {
          setUnreadNotifications(unreadCount);
        }}
        onNotificationPress={(notification) => {
          // Handle navigation based on notification type
          switch (notification.type) {
            case 'order':
              if (notification.data?.orderId) {
                // Navigate to specific order detail
                navigation.getParent()?.navigate('Orders', {
                  screen: 'OrderDetail',
                  params: { order: { id: notification.data.orderId } }
                });
              } else {
                // Navigate to orders list
                navigation.getParent()?.navigate('Orders');
              }
              break;
            case 'product':
              navigation.getParent()?.navigate('Products');
              break;
            case 'message':
              navigation.getParent()?.navigate('Chat');
              break;
            case 'store':
              navigation.navigate('StoreManagement');
              break;
            default:
              break;
          }
          setShowNotificationPopup(false);
        }}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 16,
    color: '#8B7355',
    fontWeight: '500',
  },
  storeNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 2,
  },
  ownerEmail: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '600',
    marginRight: 4,
  },
  chatPreviewContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chatPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1ED',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 2,
  },
  chatLastMessage: {
    fontSize: 12,
    color: '#8B7355',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: 11,
    color: '#8B7355',
    marginBottom: 4,
  },
  chatUnreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyChatState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#8B7355',
    marginLeft: 8,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 0.23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D1810',
    marginTop: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#8B7355',
    fontWeight: '500',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 200,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 12,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    backgroundColor: '#8B4513',
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: '#8B7355',
    marginTop: 4,
    textAlign: 'center',
  },
  chartValue: {
    fontSize: 9,
    color: '#2D1810',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Pie Chart Styles
  pieChartContainer: {
    gap: 12,
  },
  pieSegmentItem: {
    paddingVertical: 8,
  },
  pieSegmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pieColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pieSegmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    flex: 1,
  },
  pieSegmentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4513',
  },
  pieSegmentBar: {
    height: 6,
    backgroundColor: '#E8E2DD',
    borderRadius: 3,
    marginBottom: 4,
    marginLeft: 20,
  },
  pieSegmentProgress: {
    height: '100%',
    borderRadius: 3,
  },
  pieSegmentDetails: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 20,
  },
  // Bar Chart Styles
  barChartContainer: {
    gap: 16,
  },
  barChartItem: {
    paddingVertical: 8,
  },
  barChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  barProductRank: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B4513',
    width: 32,
  },
  barProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    flex: 1,
    marginLeft: 8,
  },
  barProductRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4513',
  },
  barChartBar: {
    height: 8,
    backgroundColor: '#E8E2DD',
    borderRadius: 4,
    marginBottom: 4,
  },
  barChartProgress: {
    height: '100%',
    backgroundColor: '#8B4513',
    borderRadius: 4,
  },
  barProductStats: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 0.22,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#2D1810',
    fontWeight: '600',
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default StoreDashboardScreen;