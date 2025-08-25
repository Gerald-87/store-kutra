import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Order, OrderStatus } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

type TabType = 'all' | 'pending' | 'in_transit' | 'delivered';

const OrdersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, activeTab]);

  const loadOrders = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const orderList: Order[] = [];
      
      querySnapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() } as Order;
        orderList.push(orderData);
      });
      
      setOrders(orderList);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;
    
    switch (activeTab) {
      case 'pending':
        filtered = orders.filter(order => 
          order.status === OrderStatus.PENDING || 
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PREPARING ||
          order.status === OrderStatus.READY
        );
        break;
      case 'in_transit':
        filtered = orders.filter(order => order.status === OrderStatus.IN_TRANSIT);
        break;
      case 'delivered':
        filtered = orders.filter(order => 
          order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.COMPLETED
        );
        break;
      case 'all':
      default:
        filtered = orders;
        break;
    }
    
    setFilteredOrders(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
      case OrderStatus.CONFIRMED:
      case OrderStatus.PREPARING:
      case OrderStatus.READY:
        return '#F59E0B';
      case OrderStatus.IN_TRANSIT:
        return '#06B6D4';
      case OrderStatus.DELIVERED:
      case OrderStatus.COMPLETED:
        return '#10B981';
      case OrderStatus.CANCELLED:
      case OrderStatus.REJECTED:
        return '#EF4444';
      default:
        return '#8B7355';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case OrderStatus.PENDING:
      case OrderStatus.CONFIRMED:
      case OrderStatus.PREPARING:
      case OrderStatus.READY:
        return 'time';
      case OrderStatus.IN_TRANSIT:
        return 'car';
      case OrderStatus.DELIVERED:
      case OrderStatus.COMPLETED:
        return 'checkmark-circle';
      case OrderStatus.CANCELLED:
      case OrderStatus.REJECTED:
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.7}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>
            Order #{item.id.slice(-6).toUpperCase()}
          </Text>
          <Text style={styles.orderDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={12} 
            color="#FFFFFF" 
          />
          <Text style={styles.statusText}>
            {typeof item.status === 'string' ? item.status : ''}
          </Text>
        </View>
      </View>

      <View style={styles.orderContent}>
        <Text style={styles.itemsCount}>
          {item.items.length} item{item.items.length !== 1 ? 's' : ''}
        </Text>
        
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#8B7355" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.shippingAddress || 'No address provided'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={14} color="#8B7355" />
            <Text style={styles.detailText}>
              {item.paymentMethod || 'Not specified'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.orderFooter}>
        <Text style={styles.totalAmount}>
          K{item.totalAmount.toFixed(2)}
        </Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {(item.status === OrderStatus.DELIVERED || item.status === OrderStatus.COMPLETED) && (
            <TouchableOpacity style={styles.reorderButton}>
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = (tabType: TabType) => {
    const getEmptyMessage = () => {
      switch (tabType) {
        case 'pending':
          return 'No pending orders';
        case 'in_transit':
          return 'No orders in transit';
        case 'delivered':
          return 'No delivered orders';
        default:
          return 'No orders yet';
      }
    };

    const getEmptyDescription = () => {
      switch (tabType) {
        case 'pending':
          return 'Orders waiting for confirmation will appear here';
        case 'in_transit':
          return 'Orders being delivered will appear here';
        case 'delivered':
          return 'Your completed orders will appear here';
        default:
          return 'Your order history will appear here';
      }
    };

    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>{getEmptyMessage()}</Text>
        <Text style={styles.emptyText}>{getEmptyDescription()}</Text>
      </View>
    );
  };

  const getTabCount = (tabType: TabType) => {
    switch (tabType) {
      case 'pending':
        return orders.filter(order => 
          order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.CONFIRMED ||
          order.status === OrderStatus.PREPARING ||
          order.status === OrderStatus.READY
        ).length;
      case 'in_transit':
        return orders.filter(order => order.status === OrderStatus.IN_TRANSIT).length;
      case 'delivered':
        return orders.filter(order => 
          order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.COMPLETED
        ).length;
      case 'all':
      default:
        return orders.length;
    }
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'all' as TabType, label: 'All' },
          { key: 'pending' as TabType, label: 'Pending' },
          { key: 'in_transit' as TabType, label: 'In Transit' },
          { key: 'delivered' as TabType, label: 'Delivered' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label} ({getTabCount(tab.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        key={`orders-${activeTab}`}
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B4513']}
            tintColor="#8B4513"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B4513" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : (
            renderEmptyState(activeTab)
          )
        }
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
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#8B4513',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#8B7355',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderContent: {
    marginBottom: 12,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 8,
  },
  orderDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#8B7355',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8B4513',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
  },
  reorderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#8B4513',
  },
  reorderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 12,
  },
});

export default OrdersScreen;