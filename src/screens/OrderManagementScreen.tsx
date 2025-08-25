import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchStoreOrders, updateOrderStatus as updateOrderStatusAction } from '../store/slices/ordersSlice';
import { Order, OrderStatus } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import NotificationService from '../services/NotificationService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OrderManagementNavigationProp = StackNavigationProp<RootStackParamList>;

const OrderManagementScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const insets = useSafeAreaInsets();

  const navigation = useNavigation<OrderManagementNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  // Get real orders from Redux store
  const ordersState = useSelector((state: RootState) => state.orders);
  const {
    items: orders,
    isLoading,
    error,
    stats
  } = ordersState;

  const statusOptions = [
    { key: 'all', label: 'All Orders', color: '#6B7280' },
    { key: OrderStatus.PENDING, label: 'Pending', color: '#F59E0B' },
    { key: OrderStatus.IN_TRANSIT, label: 'In Transit', color: '#06B6D4' },
    { key: OrderStatus.DELIVERED, label: 'Delivered', color: '#059669' },
    { key: OrderStatus.CANCELLED, label: 'Cancelled', color: '#EF4444' },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus]);
  
  // Show error if there's one
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadOrders = async () => {
    try {
      if (!user?.uid) {
        console.error('No user ID available');
        return;
      }
      
      console.log('Loading orders for store owner:', user.uid);
      await dispatch(fetchStoreOrders(user.uid));
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    }
  };

  const filterOrders = () => {
    if (selectedStatus === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.status === selectedStatus));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.key === status);
    return statusOption?.color || '#6B7280';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = statusOptions.find(option => option.key === status);
    return statusOption?.label || status;
  };

  const handleUpdateOrderStatus = (order: Order, newStatus: OrderStatus) => {
    Alert.alert(
      'Update Order Status',
      `Are you sure you want to mark this order as ${getStatusLabel(newStatus)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateOrderStatus(order.id, newStatus),
        },
      ]
    );
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        Alert.alert('Error', 'Order not found');
        return;
      }

      const oldStatus = order.status;
      
      // Update order status in Redux and Firestore
      await dispatch(updateOrderStatusAction({ 
        orderId, 
        status: newStatus, 
        storeOwnerId: user.uid 
      }));
      
      // Send notification about status change
      const notificationService = NotificationService.getInstance();
      await notificationService.notifyOrderStatusChange(
        orderId,
        order.customerId,
        user.uid,
        oldStatus,
        newStatus,
        order.totalAmount
      );
      
      Alert.alert('Success', `Order status updated to ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const showOrderActions = (order: Order) => {
    const nextStatuses = getNextStatusOptions(order.status);
    const actions = nextStatuses.map(status => ({
      text: `Mark as ${getStatusLabel(status)}`,
      onPress: () => handleUpdateOrderStatus(order, status as OrderStatus),
    }));

    actions.push({ text: 'Cancel', style: 'cancel' } as any);

    Alert.alert('Order Actions', 'Choose an action:', actions as any);
  };

  const getNextStatusOptions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case OrderStatus.PENDING:
        return [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, OrderStatus.CANCELLED];
      case OrderStatus.IN_TRANSIT:
        return [OrderStatus.DELIVERED, OrderStatus.CANCELLED];
      case OrderStatus.DELIVERED:
        return []; // Final status - no further transitions
      case OrderStatus.CANCELLED:
        return []; // Final status - no further transitions
      default:
        return [];
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { order: item })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{item.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.customerName}>Customer ID: {item.customerId.slice(-6)}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => showOrderActions(item)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#8B7355" />
        </TouchableOpacity>
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#8B7355" />
          <Text style={styles.infoText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons 
            name={item.deliveryMethod === 'pickup' ? 'storefront-outline' : 'car-outline'} 
            size={16} 
            color="#8B7355" 
          />
          <Text style={styles.infoText}>
            {item.deliveryMethod === 'pickup' ? 'Store Pickup' : 'Delivery'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={16} color="#8B7355" />
          <Text style={styles.infoText}>K{item.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsTitle}>Items ({item.items.length}):</Text>
        {item.items.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.title}
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItemsText}>
            +{item.items.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
        
        <View style={[
          styles.paymentBadge,
          { backgroundColor: (item.status === OrderStatus.DELIVERED || item.status === OrderStatus.COMPLETED) ? '#E8F5E8' : '#FEF2F2' }
        ]}>
          <Text style={[
            styles.paymentText,
            { color: (item.status === OrderStatus.DELIVERED || item.status === OrderStatus.COMPLETED) ? '#059669' : '#DC2626' }
          ]}>
            {(item.status === OrderStatus.DELIVERED || item.status === OrderStatus.COMPLETED) ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        data={statusOptions}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedStatus === item.key && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedStatus(item.key)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === item.key && styles.activeFilterText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#D2B48C" />
      <Text style={styles.emptyStateTitle}>No Orders Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedStatus === 'all'
          ? 'Orders will appear here when customers place them'
          : `No ${getStatusLabel(selectedStatus).toLowerCase()} orders`}
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
        <Text style={styles.headerTitle}>Order Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Order Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            K{stats.revenue.toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredOrders.length === 0 && styles.emptyListContainer,
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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B4513',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F7F3F0',
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  activeFilterButton: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B7355',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  actionButton: {
    padding: 4,
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  orderItems: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: '#8B7355',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 13,
    color: '#8B4513',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OrderManagementScreen;